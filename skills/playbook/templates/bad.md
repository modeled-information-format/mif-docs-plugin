---
id: 6df77a8a-1bdf-59ac-9827-b51238d88684
type: procedural
created: 2026-06-29T10:00:00Z
namespace: playbook/antipattern
title: "Antipattern: A Playbook That Is Really a Runbook"
tags:
  - antipattern
  - playbook
---

# Outage Playbook

<!-- ANTIPATTERN: titled a playbook but contains only a single tactical command
     list — no scenario scope, no roles, no decision framework, no phases. -->

## Steps

1. SSH into the web host.
2. Restart nginx: `sudo systemctl restart nginx`.
3. Tail the log and check it's back.

<!-- ANTIPATTERN: this is tactical remediation for one symptom — it belongs in
     an sre-runbook, not a playbook. -->

## Who to call

Call whoever is around.

<!-- ANTIPATTERN: no defined roles (Incident Commander, Comms Lead), no
     authority model, no escalation criteria. A playbook exists to make the
     human coordination explicit; "whoever is around" is the absence of it. -->

## Comms

Tell people if it's bad.

<!-- ANTIPATTERN: no communications cadence, no internal vs external channels,
     no status-page policy. No phases (detect/triage/respond/recover/review) and
     no post-incident review are defined at all. -->
