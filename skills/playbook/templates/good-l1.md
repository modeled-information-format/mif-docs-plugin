---
id: a1dd36cd-8239-5d9a-be22-a90a2297ecce
type: procedural
created: 2026-06-29T10:00:00Z
---

# Sev1 Production Outage Playbook

## Scenario & Scope

Governs **Sev1 incidents**: total or near-total loss of a customer-facing
service, or confirmed data loss. Coordinates the response; recovery steps live in
the per-service runbooks. Out of scope: Sev2/Sev3 degradations.

## Roles & Responsibilities

- **Incident Commander** — owns the response and the escalate/roll-back call.
- **Communications Lead** — owns internal updates and the status page.
- **Operations** — execute diagnosis and remediation.

## Decision Framework

- Declare Sev1 when impact is total or data integrity is at risk.
- Escalate to the executive sponsor if not mitigated within 30 minutes.
- Roll back rather than fix-forward when the blast radius is uncertain.

## Phases

Detect -> Triage -> Respond -> Recover -> Review, each with an exit criterion.

## Communications Plan

Internal updates every 15 minutes; status-page post within 15 minutes of
customer-visible impact.

## Post-Incident Review

A blameless retrospective within 48 hours with tracked action items.

<!--
MIF Level 1 (floor): id, type, created + body. A machine consumer cannot tell
whether this playbook is current or which runbooks it coordinates. good.md climbs
to L3 — adding temporal validity, provenance, and typed relates-to relationships
to the specific runbooks — so an agent can navigate from the strategy to the
tactical procedures.
-->
