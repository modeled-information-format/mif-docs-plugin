---
name: kiro-design
description: Write the design.md of an AWS Kiro three-document spec set — the technical design that traces back to numbered requirements. Use as the second Kiro artifact, between requirements.md and tasks.md. Anti-trigger; for the requirements use kiro-requirements, for the implementation task list use kiro-tasks.
argument-hint: "<the feature> [path to requirements.md]"
---

# kiro-design

Produces the **design.md** of an AWS Kiro spec set — the second document
(requirements -> design -> tasks). It describes *how* the feature will be built
and traces every part back to the numbered requirements it satisfies.

## Pattern

1. **Overview** — the design approach in brief.
2. **Architecture** — components and how they fit together.
3. **Components and Interfaces** — each component's responsibility and API.
4. **Data Models** — the entities, fields, and storage.
5. **Error Handling** — how each failure mode is handled.
6. **Testing Strategy** — unit/integration/edge coverage plan.

## Traceability

Every design element references the requirement number it satisfies (e.g.
"satisfies Requirement 1.2"). A design section with no requirement to trace to
is a signal of scope creep; a requirement with no design coverage is a gap.

## MIF frontmatter

`type: semantic`. Climb to L2 with `namespace`, `tags`, `title`. Gate with
`mif-validate --level 1`. See `templates/good.md` and `templates/bad.md`.
