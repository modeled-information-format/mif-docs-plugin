---
name: diataxis-explanation
description: Write a Diataxis explanation — an understanding-oriented discussion that illuminates the why behind a topic, its background, design rationale, trade-offs, history, and connections to other ideas. Use when the reader needs to grasp a concept or decision, not perform a task or look up a fact. Anti-trigger; for accomplishing a known task use diataxis-how-to, for a beginner learning by doing use diataxis-tutorial, for fact lookup use diataxis-reference.
argument-hint: "<the topic to explain>"
---

# diataxis-explanation

Produces an **explanation** in the Diataxis sense: *understanding-oriented*. The
reader wants to comprehend — to see why something is the way it is, how it
connects to other ideas, and what the alternatives and trade-offs were. Success
is the reader *understands*, not that they did something or found a value. An
explanation is not a tutorial (it does not walk you through doing), not a how-to
(it does not accomplish a task), and not reference (it does not catalog facts) —
keep those modes out.

## Pattern (industry: Diataxis, diataxis.fr)

1. **Topic title** — names the subject under discussion, framed as understanding:
   "Understanding X", "Why we use Y", "The thinking behind Z". Not "How to…".
2. **Framing** — open by naming the question or tension the reader is here to
   resolve, and why it matters. Set the boundaries of the discussion.
3. **Discursive body** — flowing prose that supplies background, context, and the
   design rationale. Trace history, surface trade-offs, and weigh the
   alternatives that were *not* chosen and why.
4. **Connections** — relate the topic to adjacent ideas, decisions, and parts of
   the system so the reader sees where it fits.
5. **Closing perspective** — a short synthesis of what the reader now understands;
   point to how-to/reference/tutorial for doing or looking up.

## Rules that keep it an explanation

- Discuss, don't instruct. No numbered procedure of imperative steps — that is a
  tutorial or how-to. If you catch yourself writing "Step 1 — Run…", stop.
- Illuminate, don't catalog. No exhaustive flag-by-flag or field-by-field tables —
  that is reference. Mention specifics only to make a point about *why*.
- Admit alternatives and trade-offs. An explanation that presents one option as
  inevitable has skipped its job; name what was rejected and the cost.
- It is fine — expected — to be discursive and to digress into history or context.
  Bound the topic, but let the prose breathe.
- Be honest about open questions and limits; understanding includes knowing the
  edges.

## MIF frontmatter

`type: semantic` (declarative knowledge — an explanation conveys understanding,
not a procedure or a dated event). Climb to L2 with `namespace`, `tags`, `title`
when known; reach L3 (`temporal`, `provenance`, `citations[]`, typed
`relationships[]`) when the rationale draws on attributable sources. Gate every
output with `mif-validate --level 1`.

### Why machine-readable

Prose explains *why* to a human; the frontmatter explains the same document to a
machine. An agent should not have to parse this sentence to learn whether the
rationale is still current, who stands behind it, what source backs it, or what it
relates to. The MIF layer answers those questions structurally: `temporal` says
when the rationale is valid and due for review, `provenance` says who authored it
and how far to trust it, `citations[]` names the authoritative source, and typed
`relationships[]` link to the tutorial and reference docs an agent can traverse.

The exemplars show the climb:

- `templates/good-l1.md` — the **L1 floor** (`id`, `type`, `created` + body). A
  complete, valid explanation that is nonetheless opaque to a machine: none of the
  questions above can be answered without reading the prose.
- `templates/good.md` — the **same subject at L3**, carrying real `temporal`,
  `provenance`, a citation to the MIF spec, and typed `relationships[]`. The
  trailing comment names exactly what that metadata lets a machine do.

See also `templates/bad.md` (an "explanation" that has collapsed into a how-to
procedure and a reference dump — the most common failure).
