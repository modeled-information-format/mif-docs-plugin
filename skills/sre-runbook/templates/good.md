---
id: runbook-checkout-api-p99-latency-slo-burn
type: procedural
created: 2026-06-29T10:00:00Z
modified: 2026-06-29T10:00:00Z
namespace: runbook/checkout-api
title: "Checkout API: p99 Latency SLO Burn"
tags:
  - runbook
  - sre
  - latency
  - checkout-api
ontology:
  "@type": OntologyReference
  id: runbook
  version: 1.0.0
  uri: https://mif-spec.dev/ontologies/runbook
temporal:
  "@type": TemporalMetadata
  validFrom: 2026-06-29T00:00:00Z
  recordedAt: 2026-06-29T10:00:00Z
  ttl: P6M
provenance:
  "@type": Provenance
  sourceType: user_explicit
  trustLevel: verified
relationships:
  - type: relates-to
    target: /procedural/playbooks/checkout-incident-response.md
  - type: relates-to
    target: /semantic/slos/checkout-api-latency-slo.md
---

# Checkout API: p99 Latency SLO Burn

## 1. Overview

This runbook handles the `CheckoutAPILatencySLOBurn` alert for the
**checkout-api** service. The alert fires when the 1-hour p99 request latency
exceeds the SLO and the error budget is burning fast enough to exhaust in under
6 hours. It covers latency regressions only; for elevated 5xx rates use the
`checkout-api-error-rate` runbook, and for a full customer-facing outage follow
the incident **playbook** (strategic, multi-team) — this runbook is the tactical
fix for latency alone.

## 2. Prerequisites & Access

Confirm you have these before you start; resolving access mid-incident wastes
budget.

- `kubectl` context for the `prod-us-east` cluster (`kubectl config current-context`).
- Read access to the **Checkout API / Latency** Grafana dashboard.
- PagerDuty responder on the `checkout-oncall` schedule.
- `gh` CLI authenticated, for checking recent deploys.

## 3. Detection

The alert fired from this PromQL rule (SLO: p99 < 500 ms over 1h):

```promql
histogram_quantile(0.99,
  sum(rate(http_request_duration_seconds_bucket{service="checkout-api"}[5m]))
  by (le)) > 0.5
```

Confirm the symptom is real and not a single bad scrape:

```bash
kubectl -n checkout top pods | sort -k3 -h | tail
```

Open the **Checkout API / Latency** dashboard and check the p99 panel. A genuine
burn shows p99 sustained above 500 ms for 10+ minutes. If p99 is back under
500 ms and holding, the alert is resolving — skip to section 7.

## 4. Diagnosis

Work these in order; stop at the first that explains the regression.

1. **Recent deploy?** A latency jump right after a rollout is the most common
   cause.

   ```bash
   kubectl -n checkout rollout history deployment/checkout-api
   gh release list --repo acme/checkout-api --limit 5
   ```

   If a deploy landed within ~15 min of the burn start, treat it as the suspect
   and go to Remediation step 1.

2. **Downstream dependency slow?** Check the latency the service sees from the
   pricing and inventory dependencies.

   ```promql
   histogram_quantile(0.99,
     sum(rate(http_client_duration_seconds_bucket{service="checkout-api"}[5m]))
     by (le, upstream))
   ```

   If one `upstream` dominates, that dependency is the root cause — page its
   owner (section 6) and go to Remediation step 3.

3. **Resource saturation?** Check CPU throttling and pod restarts.

   ```bash
   kubectl -n checkout get pods -l app=checkout-api
   kubectl -n checkout describe hpa checkout-api | grep -A3 "Metrics"
   ```

   CPU pinned at the limit with the HPA at max replicas points to
   under-provisioning — go to Remediation step 2.

## 5. Remediation

Apply the step that matches the diagnosis. Confirm the expected result before
continuing.

1. **Roll back the bad deploy.**

   ```bash
   kubectl -n checkout rollout undo deployment/checkout-api
   kubectl -n checkout rollout status deployment/checkout-api --timeout=120s
   ```

   Expected result: rollout reports `successfully rolled out`; p99 on the
   dashboard begins dropping within ~5 minutes.

2. **Scale out to relieve saturation.**

   ```bash
   kubectl -n checkout scale deployment/checkout-api --replicas=12
   kubectl -n checkout rollout status deployment/checkout-api --timeout=120s
   ```

   Expected result: new pods become `Ready`; CPU throttling falls and p99
   recovers. Record that replicas were raised so it can be tuned later.

3. **Shed load from the slow dependency.** Enable the degraded-mode flag so
   checkout skips the slow optional call.

   ```bash
   kubectl -n checkout set env deployment/checkout-api PRICING_DEGRADED_MODE=true
   kubectl -n checkout rollout status deployment/checkout-api --timeout=120s
   ```

   Expected result: p99 drops as the slow upstream is bypassed; checkout still
   completes with list pricing. This is a stopgap — the dependency owner must
   fix the root cause.

## 6. Escalation

Escalate without waiting if any of these hold:

- p99 has not started recovering **15 minutes** after applying a remediation
  step → page the **checkout-api service owner** via PagerDuty
  (`checkout-oncall` → escalate to secondary).
- Diagnosis points to a downstream dependency → page that dependency's
  rotation directly (e.g. `pricing-oncall`) and post the upstream latency graph
  in `#incident-checkout`.
- Customer-facing checkout is failing, not just slow → declare an incident and
  switch to the incident **playbook**; this runbook no longer covers the scope.

## 7. Verification & Rollback

**Verify recovery.** The alert is clear when all hold for 10 continuous minutes:

```promql
histogram_quantile(0.99,
  sum(rate(http_request_duration_seconds_bucket{service="checkout-api"}[5m]))
  by (le)) < 0.5
```

- p99 panel is back under 500 ms and flat.
- `CheckoutAPILatencySLOBurn` shows resolved in PagerDuty.
- No new pod restarts in `kubectl -n checkout get pods -l app=checkout-api`.

**Rollback the remediation** if it did not help or made things worse:

- Step 1 (rollback): re-apply the previous good release with
  `kubectl -n checkout rollout undo deployment/checkout-api --to-revision=<N>`
  using the revision from `rollout history`.
- Step 2 (scale-out): return to baseline with
  `kubectl -n checkout scale deployment/checkout-api --replicas=6` once p99 is
  stable, to avoid leaving the service over-provisioned.
- Step 3 (degraded mode): re-enable full pricing with
  `kubectl -n checkout set env deployment/checkout-api PRICING_DEGRADED_MODE=false`
  only after the dependency owner confirms the upstream is healthy.

Close the alert and file a short follow-up note linking the dashboard snapshot.

<!--
MIF Level 3 (highest this genre supports). The frontmatter lets a machine
consumer act on this runbook without parsing the prose:

- `temporal.validFrom` + `ttl: P6M` — answer "is this runbook still fresh?" A CI
  freshness gate flags it for review six months after `validFrom`, so on-call
  never follows a stale procedure.
- `ontology` (`runbook` v1.0.0) — type the document so a tool knows it is an
  operational runbook, not a playbook or a postmortem, and can apply the right
  schema/expectations.
- `provenance` (`sourceType: user_explicit`, `trustLevel: verified`) — answer
  "where did this come from, can I trust it?" An agent ranks a verified,
  human-authored runbook above an inferred draft.
- `relationships[]` — answer "what does this connect to?" without reading the
  body: `relates-to` the incident-response **playbook** (the strategic doc that
  references this tactical fix) and `relates-to` the **SLO/alert** definition it
  remediates, so a dependency walker can trace alert → runbook → playbook.

The same document still reads as a human runbook and projects losslessly to
JSON-LD and back. See good-l1.md for the L1 floor — valid, but opaque to all of
the above.
-->
