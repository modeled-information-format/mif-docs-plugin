---
id: 0d03fc19-0b7d-5af3-909b-007588284b4a
type: semantic
created: 2026-06-29T10:00:00Z
namespace: spec/kiro/requirements/antipattern
title: "Antipattern: Requirements Without Stories or EARS"
tags:
  - antipattern
  - kiro
---

# Requirements: Avatar Upload

<!-- ANTIPATTERN: no Introduction, and requirements are neither numbered nor
     written as user stories — so design.md and tasks.md have nothing to trace
     to. -->

## What it should do

- Let users upload a picture.
- Make sure it works well.
- Handle errors appropriately.

<!-- ANTIPATTERN: "works well" and "appropriately" are not testable. None of
     these are EARS criteria; there is no role, trigger, system, or observable
     response. -->

## Notes

It should also be fast and secure.

<!-- ANTIPATTERN: vague non-functional hand-waving with no acceptance criteria,
     no unhappy-path coverage (size limits, formats), and no numbering. A Kiro
     requirements.md must give each requirement a number and EARS criteria so the
     downstream design and tasks can reference it. -->
