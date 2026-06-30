---
name: diataxis-tutorial
description: Write a Diataxis tutorial — a learning-oriented, hands-on lesson that takes a beginner through a single concrete success by doing, not explaining. Use when the user needs onboarding/getting-started content where the goal is the learner's confidence, not task completion or reference lookup. Anti-trigger; for accomplishing a known task use diataxis-how-to, for facts use diataxis-reference.
argument-hint: "<what the learner will build>"
---

# diataxis-tutorial

Produces a **tutorial** in the Diataxis sense: *learning-oriented*. The reader is
a beginner; success is that they finish having *done* something real and feel
capable. A tutorial is not a how-to (task-oriented) and not an explanation
(understanding-oriented) — keep those modes out.

## Pattern (industry: Diataxis, diataxis.fr)

1. **Promise** — one sentence: what the learner will have built/done by the end.
2. **Prerequisites** — the minimum concrete setup, already working.
3. **Numbered steps** — each step is an action with a *visible* result the
   learner can check. Small, ordered, no branching.
4. **Checkpoints** — after key steps, "you should now see…" so they self-verify.
5. **Conclusion** — name what they accomplished; point to how-to/reference next.

## Rules that keep it a tutorial

- Teach by doing; defer the "why" (link to an explanation instead).
- One happy path. No options, no alternatives, no troubleshooting trees.
- Everything must work if followed verbatim — no `TODO`, no "configure as needed".
- Use the imperative ("Run…", "Open…"), present the result every time.

## MIF frontmatter

`type: procedural` (learning by doing). Climb to L2 with `namespace`, `tags`,
`title` when known. Gate every output with `mif-validate --level 1`.

See `templates/good.md` (a conformant tutorial) and `templates/bad.md` (a
tutorial that has drifted into how-to/reference mixing — the most common error).
