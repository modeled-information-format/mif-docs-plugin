---
name: kiro-requirements
description: Write the requirements.md of an AWS Kiro three-document spec set — numbered requirements, each a user story plus EARS acceptance criteria. Use as the first artifact of a Kiro spec, feeding design.md and tasks.md. Anti-trigger; for the technical design use kiro-design, for the task list use kiro-tasks.
argument-hint: "<the feature to capture requirements for>"
---

# kiro-requirements

Produces the **requirements.md** of an AWS Kiro spec set — the first of three
documents (requirements -> design -> tasks). It captures *what* the feature must
do as numbered, individually testable requirements.

## Pattern

1. **Introduction** — a short framing of the feature and its intent.
2. **Requirements** — a numbered list. Each requirement is:
   - a **User Story**: "As a `<role>`, I want `<feature>`, so that `<benefit>`."
   - an **Acceptance Criteria** list in **EARS** (see `ears-acceptance-criteria`):
     "WHEN `<event>` THEN the `<system>` SHALL `<response>`", "IF `<condition>`
     THEN …", "WHILE `<state>` …".

## Rules

- Every requirement is numbered (1, 2, 3 …) so design.md and tasks.md can trace
  to it.
- Acceptance criteria are EARS — testable, one behavior each.
- Cover the unhappy paths (errors, edge cases) with IF/THEN criteria, not just
  the happy path.

## MIF frontmatter

`type: semantic`. Climb to L2 with `namespace`, `tags`, `title`. Gate with
`mif-validate --level 1`. See `templates/good.md` and `templates/bad.md`.
