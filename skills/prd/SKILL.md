---
name: prd
description: Write a Product Requirements Document that leads with the problem, defines success metrics and non-goals, and expresses functional requirements as testable EARS criteria. Use when scoping what to build and why before design. Anti-trigger; for the technical how use feature-spec or a design doc, not a PRD.
argument-hint: "<the product or feature to scope>"
---

# prd

Produces a **Product Requirements Document**: problem-first, outcome-focused. A
PRD says *what* problem we solve, for *whom*, and *how we'll know it worked* —
not the implementation.

## Pattern

1. **Problem Statement** — lead with the user/business problem and its evidence.
   Never open with the solution.
2. **Goals & Success Metrics** — measurable outcomes (e.g. "reduce checkout
   abandonment from 30% to 20%").
3. **Users / Personas** — who is affected and their context.
4. **Requirements** — the functional needs. Express testable ones as **EARS**
   criteria (see the `ears-acceptance-criteria` skill).
5. **Scope & Non-Goals** — explicitly what's out, to prevent scope creep.
6. **Milestones** — rough sequencing.
7. **Open Questions** — known unknowns.

## Agentic PRD note

Modern PRDs increasingly carry machine-readable, EARS-encoded requirements an
implementation agent can consume directly. Prefer EARS over prose for anything an
agent or QA must verify.

## MIF frontmatter

`type: semantic`. Climb to L2 with `namespace`, `tags`, `title`. Gate with
`mif-validate --level 1`. See `templates/good.md` and `templates/bad.md`.
