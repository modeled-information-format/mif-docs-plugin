---
id: a1dd36cd-8239-5d9a-be22-a90a2297ecce
type: procedural
created: '2026-06-29T10:00:00Z'
modified: '2026-06-29T10:00:00Z'
namespace: playbook/incident
title: Sev1 Production Outage Playbook
tags:
  - playbook
  - incident
  - sev1
temporal:
  '@type': TemporalMetadata
  validFrom: '2026-06-29T00:00:00Z'
  ttl: P6M
  recordedAt: '2026-06-29T10:00:00Z'
provenance:
  '@type': Provenance
  sourceType: user_explicit
  trustLevel: verified
  wasAttributedTo:
    '@id': urn:mif:team:sre
    '@type': prov:Agent
relationships:
  - type: relates-to
    target: /runbook/checkout-api-latency-slo-burn.md
  - type: relates-to
    target: /runbook/database-failover.md
ontology:
  '@type': OntologyReference
  id: mif-docs
  version: 1.0.0
  uri: https://mif-spec.dev/ontologies/mif-docs
entity:
  name: Sev1 Production Outage
  entity_type: playbook
---

# Sev1 Production Outage Playbook

## Scenario & Scope

This playbook governs **Sev1 incidents**: a complete or near-complete loss of a
customer-facing service, or confirmed data loss. It coordinates the response;
the specific recovery steps live in the per-service runbooks it references. Out
of scope: Sev2/Sev3 degradations (see the standard on-call playbook).

## Roles & Responsibilities

| Role | Holder | Authority |
| --- | --- | --- |
| Incident Commander (IC) | First responder until handed off | Owns the response, makes the call to escalate/roll back |
| Communications Lead | Assigned by IC | Owns internal updates and the status page |
| Operations | Service on-call engineers | Execute diagnosis and remediation |
| Executive Sponsor | Paged at 30 min | Approves customer comms and external escalation |

## Decision Framework

- **Declare Sev1** when customer impact is total or data integrity is at risk.
- **Escalate to the Executive Sponsor** if not mitigated within 30 minutes.
- **Roll back** rather than fix-forward when the change window is known and the
  blast radius is uncertain.
- **Engage external comms** once impact is customer-visible for 15 minutes.

## Phases

1. **Detect** — alert or report confirmed; IC self-assigns. Exit: Sev1 declared.
2. **Triage** — establish scope and suspected cause; open the incident channel.
   Exit: a working hypothesis and an owner per workstream.
3. **Respond** — execute the relevant service runbook(s); IC tracks actions.
   Exit: customer impact mitigated.
4. **Recover** — confirm full service restoration and backlog drain. Exit:
   metrics green for 30 minutes.
5. **Review** — schedule the blameless retro within 48 hours.

## Communications Plan

- **Internal:** updates in the incident channel every 15 minutes from the Comms
  Lead, even if "no change".
- **External:** status-page post within 15 minutes of customer-visible impact,
  updated every 30 minutes until resolved.

## Post-Incident Review

A blameless retrospective is run within 48 hours and produces a timeline,
contributing factors, and tracked action items with owners and due dates.
