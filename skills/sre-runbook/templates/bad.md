---
id: 67ae6b14-f080-598a-a97e-34cc31c47291
type: procedural
created: 2026-06-29T10:00:00Z
namespace: runbook/antipattern
title: "Antipattern: A Runbook You Cannot Act On"
tags:
  - antipattern
  - runbook
  - sre
---

# Checkout Stuff

<!-- ANTIPATTERN: titled vaguely. A runbook names the service AND the one alert
     it handles ("Checkout API: p99 Latency SLO Burn"), so the right responder
     opens the right doc at 3 a.m. -->

This runbook is for when checkout is having problems.

<!-- ANTIPATTERN: "having problems" is not a condition. Scope to ONE named
     alert/symptom with a measurable trigger, not an open-ended mood. -->

## Detection

If something seems wrong, take a look at the dashboards and see if anything
looks off.

<!-- ANTIPATTERN: no firing alert, no metric, no threshold, no SLO. Detection
     must state the alert and a measurable trigger (e.g. p99 > 500 ms for 10
     min) so the responder can confirm the condition objectively. -->

## Diagnosis

Investigate the issue and figure out what is going on. Check the logs and the
metrics and use your judgment about what is causing it.

<!-- ANTIPATTERN: "investigate the issue", "use your judgment" — zero actionable
     triage steps. Diagnosis must be ordered, concrete commands with how to read
     each output. This is the Actionable A of the 5 A's, failed. -->

## Fix

Restart things until it gets better. If that does not work, try scaling up or
changing some config.

<!-- ANTIPATTERN: not numbered, no commands, no expected result per step. "Try
     things until it gets better" is not a remediation. Each step needs a real
     command and a confirmable outcome before moving on. -->

<!-- ANTIPATTERN: NO Verification section. The runbook never says how to confirm
     the alert cleared or the SLO recovered, so the responder can't tell when
     they are done. -->

<!-- ANTIPATTERN: NO Rollback. "Restart and change config" with no undo path
     means a remediation that worsens things cannot be reversed. -->

## Escalation

If it is really bad, get someone who knows more to help.

<!-- ANTIPATTERN: no role, no rotation, no trigger condition. Escalation must
     name WHO (a rotation/owner) and WHEN (an explicit condition, e.g. "no
     recovery 15 min after remediation"). -->

<!-- ANTIPATTERN: no Prerequisites & Access section at all — the responder
     discovers missing credentials mid-incident, burning error budget. -->
