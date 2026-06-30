---
name: kiro-tasks
description: Write the tasks.md of an AWS Kiro three-document spec set — a numbered, checkbox implementation plan where each task is small, test-driven, and traces to the design/requirements it implements. Use as the third Kiro artifact that drives implementation. Anti-trigger; for requirements use kiro-requirements, for the design use kiro-design.
argument-hint: "<the feature> [path to design.md]"
---

# kiro-tasks

Produces the **tasks.md** of an AWS Kiro spec set — the third document
(requirements -> design -> tasks). It turns the design into an ordered,
checkable implementation plan an engineer or coding agent executes top to bottom.

## Pattern

A numbered checkbox list:

```markdown
- [ ] 1. Build the image validator
  - [ ] 1.1 Accept PNG/JPEG, reject others
  - [ ] 1.2 Enforce the 5 MB limit
  - _Requirements: 1.2, 1.3_
```

- Each task is **small** and independently testable.
- Sub-tasks (`1.1`, `1.2`) break a task into checkable steps.
- Each task cites the requirement/design item it implements
  (`_Requirements: 1.2, 1.3_`).
- Ordering is **incremental**: each task builds on completed prior tasks
  (test-driven where possible).

## Traceability

Every task references the requirements/design it implements. A task with no
reference is a smell; a requirement with no task is unimplemented.

## MIF frontmatter

`type: procedural` (a task list is execution/how-to). Climb to L2 with
`namespace`, `tags`, `title`. Gate with `mif-validate --level 1`. See
`templates/good.md` and `templates/bad.md`.
