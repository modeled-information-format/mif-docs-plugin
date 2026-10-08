---
id: 6a4d1485-3eb5-541c-90ca-32904d6bfdeb
type: procedural
created: 2026-06-29T10:00:00Z
namespace: spec/kiro/tasks/antipattern
title: "Antipattern: A Task List With No Order or Traceability"
tags:
  - antipattern
  - kiro
---

# Tasks: Avatar Upload

<!-- ANTIPATTERN: not a checkbox list, so progress cannot be tracked. -->

- Build the whole feature.
- Make it work end to end.
- Test everything.

<!-- ANTIPATTERN: tasks are giant and vague ("build the whole feature"), not
     small and independently testable. -->

<!-- ANTIPATTERN: no traceability — not one task cites a requirement or design
     item, so you cannot tell which requirements are covered or orphaned. -->

<!-- ANTIPATTERN: no incremental ordering — there is no sequence in which each
     task builds on a completed prior one, so an agent cannot execute it top to
     bottom. A Kiro tasks.md must be an ordered checkbox plan with per-task
     `_Requirements: ..._` references. -->
