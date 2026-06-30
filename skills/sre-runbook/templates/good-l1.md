---
id: runbook-checkout-api-p99-latency-slo-burn
type: procedural
created: 2026-06-29T10:00:00Z
---

# Checkout API: p99 Latency SLO Burn

## 1. Overview

Handles the `CheckoutAPILatencySLOBurn` alert for **checkout-api**: 1-hour p99
request latency exceeds the SLO and the error budget will exhaust in under 6
hours. Latency regressions only — for 5xx use the `checkout-api-error-rate`
runbook; for a customer-facing outage follow the incident playbook.

## 2. Prerequisites & Access

- `kubectl` context for `prod-us-east` (`kubectl config current-context`).
- Read access to the **Checkout API / Latency** Grafana dashboard.
- PagerDuty responder on `checkout-oncall`.
- `gh` CLI authenticated, for recent deploys.

## 3. Detection

The alert fires on this rule (SLO: p99 < 500 ms over 1h):

```promql
histogram_quantile(0.99,
  sum(rate(http_request_duration_seconds_bucket{service="checkout-api"}[5m]))
  by (le)) > 0.5
```

A genuine burn shows p99 sustained above 500 ms for 10+ minutes on the panel. If
it is back under 500 ms and holding, skip to section 7.

## 4. Diagnosis

Work in order; stop at the first that explains the regression.

1. **Recent deploy?** `kubectl -n checkout rollout history deployment/checkout-api`
   and `gh release list --repo acme/checkout-api --limit 5`. A deploy within
   ~15 min of the burn → Remediation step 1.
2. **Downstream slow?** Check per-upstream client latency; if one `upstream`
   dominates, page its owner → Remediation step 3.
3. **Saturation?** `kubectl -n checkout get pods -l app=checkout-api` and the HPA;
   CPU pinned at the limit with HPA at max → Remediation step 2.

## 5. Remediation

Apply the step matching the diagnosis; confirm the expected result first.

1. **Roll back the bad deploy.** `kubectl -n checkout rollout undo
   deployment/checkout-api`. Expected: `successfully rolled out`; p99 drops within
   ~5 min.
2. **Scale out.** `kubectl -n checkout scale deployment/checkout-api --replicas=12`.
   Expected: new pods `Ready`; CPU throttling falls and p99 recovers.
3. **Shed load from the slow dependency.** `kubectl -n checkout set env
   deployment/checkout-api PRICING_DEGRADED_MODE=true`. Expected: p99 drops as the
   slow upstream is bypassed; checkout completes with list pricing (stopgap).

## 6. Escalation

- No recovery **15 min** after a remediation step → page the **checkout-api
  service owner** (`checkout-oncall` → secondary).
- A downstream dependency is the cause → page that rotation (e.g.
  `pricing-oncall`) and post the latency graph in `#incident-checkout`.
- Checkout is failing, not just slow → declare an incident and switch to the
  incident playbook.

## 7. Verification & Rollback

**Verify:** alert clears when p99 < 500 ms for 10 continuous minutes, PagerDuty
shows resolved, and no new pod restarts.

**Rollback** if the fix did not help: re-apply the prior release with
`rollout undo --to-revision=<N>`; return scale to `--replicas=6` once stable;
re-enable full pricing with `PRICING_DEGRADED_MODE=false` after the dependency
owner confirms the upstream is healthy.

<!--
MIF Level 1 (floor): id, type, created + body only. This is a complete, valid
runbook — but to a machine consumer it is opaque prose. It cannot be queried for
"is this procedure still fresh?" (no temporal/ttl), "what playbook or SLO does it
relate to?" (no relationships), or "who wrote it, can I trust it?" (no
provenance). Compare good.md (full L3: ontology, temporal validity, provenance,
typed relationships) — gate it with mif-validate --level 3.
-->
