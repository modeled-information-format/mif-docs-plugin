---
name: diataxis-how-to
description: Write a Diataxis how-to guide — a task-oriented recipe that walks a competent user through accomplishing one real, already-understood goal, start to finish. Use when the user knows what they want to do and needs the steps, not learning or background. Anti-trigger; for a beginner learning by doing use diataxis-tutorial, for looking up facts use diataxis-reference.
argument-hint: "<the task to accomplish>"
---

# diataxis-how-to

Produces a **how-to guide** in the Diataxis sense: *task-oriented*. The reader is
already competent and has a specific goal in mind; success is that the goal is
accomplished. A how-to is not a tutorial (it does not teach) and not reference
(it does not catalog) and not explanation (it does not theorize) — keep those
modes out.

## Pattern (industry: Diataxis, diataxis.fr)

1. **Title** — states the goal directly: "How to `accomplish X`".
2. **Context line** — one or two sentences naming when/why you'd do this.
3. **Prerequisites** — the concrete starting state and access the task assumes.
4. **Numbered action steps** — an ordered sequence of real commands/actions that
   move from the starting state to the goal. Each step does one thing.
5. **Completion** — a short line confirming the goal is now met. Stop there.

## Rules that keep it a how-to

- Assume competence. Do not teach concepts or define terms — link out instead.
- No theory, background, or "why it works" prose — that is an explanation doc.
- Serve the user's one goal; do not document every flag or option — that is
  reference. Pick the path that accomplishes the task.
- Real, runnable commands — no `TODO`, no `<your-value-here>` left unexplained.
- End at task completion. No "next you could also…" tours.

## MIF frontmatter

`type: procedural` (a how-to is a procedure). The genre's MIF ceiling is **L2** —
a procedure carries no decision-grade ontology, provenance, or citations the way
an ADR (L3) does, so author to L2 and stop there rather than fabricating L3
fields.

## Why machine-readable — the point of MIF here

A how-to's commands rot when the underlying tooling changes; an agent that wants
to reuse or surface one must know whether it is still current and what it pairs
with. As prose (L1) that requires reading and inferring from the steps. The MIF
layer makes those questions answerable by *reading frontmatter*:

| Question an agent asks | Answered by (frontmatter) |
| --- | --- |
| Is this procedure still current? | `temporal.ttl` / `temporal.validFrom` |
| When was it last revised? | `modified` |
| Which reference catalogs its commands? | typed `relationships[]` (`relates-to`) |
| Where does it file in the doc set? | `namespace` + `tags` |

The same document still reads as a human how-to and projects losslessly to
JSON-LD and back — one artifact, two readers.

## The L1 -> L2 climb (two exemplars)

This skill ships the **same procedure at both MIF levels** so the climb is
explicit:

- `templates/good-l1.md` — **L1 floor**: `id`, `type`, `created` + body. A valid
  how-to, but opaque to a machine consumer. Gate with `mif-validate --level 1`.
- `templates/good.md` — **L2 (highest this genre supports)**: adds `namespace`,
  `modified`, `temporal` validity, and a typed `relates-to` relationship to the
  reference doc it pairs with. Gate with `mif-validate --level 2`.

Author at the **highest level the drafting context supports** (grade down rather
than fabricate). `templates/bad.md` shows the antipattern: a how-to that has
drifted into tutorial hand-holding, theory dumps, and exhaustive option catalogs
— the most common error.
