---
name: sre-runbook
description: Write an SRE operational runbook — a tactical, step-by-step procedure an on-call responder follows to detect, diagnose, and remediate ONE specific alert or failure condition under pressure. Use when the user needs incident-response content for a named alert/symptom (latency SLO burn, queue backlog, replica lag). Anti-trigger; for strategic, multi-incident response design write a playbook, and for a learning lesson use diataxis-tutorial.
argument-hint: "<the alert or symptom to remediate>"
---

# sre-runbook

Produces an **operational runbook**: a *tactical* procedure scoped to one
alert/condition, written for an on-call engineer acting under time pressure. It
answers "this page just fired — what exactly do I do?" with copy-pasteable
commands and explicit decision points.

A runbook is **tactical**, not strategic. Contrast: a *playbook* is strategic —
it coordinates the broader response (comms, roles, multi-team escalation) across
a class of incidents. A runbook is the narrow, executable fix for one named
condition. Keep strategy out; link to the playbook instead.

## The "5 A's" quality frame

Every section is judged against five properties:

- **Actionable** — concrete commands and decisions, never "investigate the issue".
- **Accurate** — commands are correct and current; thresholds match the real SLO.
- **Authoritative** — it is the single source of truth for this alert; owner named.
- **Accessible** — findable, readable at 3 a.m., no tribal knowledge assumed.
- **Adaptable** — versioned and dated so it tracks the system as it changes.

## Pattern (seven canonical sections, in order)

1. **Overview** — the service this covers and the one alert/condition it handles.
2. **Prerequisites & Access** — tools, credentials, roles, and dashboards needed
   *before* you start. Get access blockers out of the way first.
3. **Detection** — the firing alert, observable symptoms, and the dashboards/
   queries that confirm it. State the SLO/threshold being breached.
4. **Diagnosis** — ordered triage steps that narrow root cause. Each step is a
   command plus how to read its output.
5. **Remediation** — the numbered, step-by-step fix. Each step has an expected
   result so the responder can confirm it worked before moving on.
6. **Escalation** — who to page, when (explicit trigger conditions), and how.
7. **Verification & Rollback** — confirm the alert is clear and the SLO is
   recovering; and the exact steps to undo the remediation if it made things
   worse.

## Rules that keep it a runbook

- Tactical scope: one alert, one happy path to recovery. No incident-management
  theory, no postmortem.
- Every action is runnable as written — real commands, real dashboard names.
  No `TODO`, no "investigate as appropriate".
- Detection states a measurable trigger; Remediation states an expected result;
  Verification has an explicit pass condition AND a rollback. Never ship a
  remediation you cannot undo.
- Escalation names a role/rotation and a concrete trigger, not "if it's bad".

## Why machine-readable — the point of MIF here

A runbook is consumed under pressure, often by tooling before a human: an agent
checking whether the procedure is still current, a CI freshness gate flagging a
stale one, a dependency walker tracing which alert it remediates and which
playbook coordinates it. As prose (L1) every one of those needs reading and
inference. The MIF frontmatter makes them answerable by *reading frontmatter*:

| Question a tool asks | Answered by (frontmatter) |
| --- | --- |
| Is this procedure still fresh? | `temporal.validFrom` + `ttl` (review cadence) |
| What playbook / SLO does it connect to? | typed `relationships[]` (`relates-to`) |
| Who authored it; can I trust it? | `provenance` (`sourceType`, `trustLevel`) |
| What kind of doc is this? | `ontology` (`runbook`) |

## MIF frontmatter — the L1 -> L3 climb (two exemplars)

`type: procedural` (a how-to executed under pressure). This skill ships the
**same runbook at two MIF levels** so the climb is explicit:

- `templates/good-l1.md` — **L1 floor**: `id`, `type`, `created` + body. A
  complete, valid runbook, but opaque to a machine consumer. Gate with
  `mif-validate --level 1`.
- `templates/good.md` — **L3 (highest this genre supports)**: adds `namespace`,
  `modified`, `ontology` typing, `temporal` validity (`ttl: P6M` review cadence),
  `provenance`, and typed `relationships[]` to the incident playbook and the
  SLO/alert. Gate with `mif-validate --level 3`.

Author at the **highest level the drafting context supports** (grade down rather
than fabricate). `templates/bad.md` shows the antipattern: vague triage, no
detection criteria, and no rollback — the failure modes that get people paged
twice.
