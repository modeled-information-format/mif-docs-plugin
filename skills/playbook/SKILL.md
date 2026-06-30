---
name: playbook
description: Write a strategic operational playbook that coordinates a CLASS of situations (e.g. a Sev1 outage) across roles, decision points, and phases. Use for higher-altitude incident/operations coordination. Anti-trigger; for fixing one specific alert step-by-step use sre-runbook (tactical), not a playbook.
argument-hint: "<the incident class to coordinate>"
---

# playbook

Produces a **playbook**: strategic coordination for a class of situations. Where a
runbook is tactical (fix one specific alert), a playbook answers *who does what,
when, and how we decide* across a whole scenario class.

## Pattern

1. **Scenario & Scope** — the trigger class this playbook governs and what's out
   of scope.
2. **Roles & Responsibilities** — Incident Commander, Communications Lead,
   Operations/Subject experts; who holds each and their authority.
3. **Decision Framework** — severity levels, declare/escalate criteria, when to
   page leadership, when to involve external comms.
4. **Phases** — Detect -> Triage -> Respond -> Recover -> Review, with the goal
   and exit criteria of each.
5. **Communications Plan** — internal channels + external/status-page cadence.
6. **Post-Incident Review** — how the retro is run and what it produces.

## Playbook vs runbook

A playbook is strategic and role/decision-centric; it *references* the tactical
runbooks that handle specific alerts. If your document is a single ordered list
of commands to fix one symptom, it's a runbook, not a playbook.

## MIF frontmatter

`type: procedural`. Climb to L2 with `namespace`, `tags`, `title`. Gate with
`mif-validate --level 1`. See `templates/good.md` and `templates/bad.md`.
