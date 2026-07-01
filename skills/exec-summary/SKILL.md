---
name: exec-summary
description: Write a 1-2 page decision-oriented executive summary — BLUF, Key Findings, Recommendation, Risks & Caveats — composable as the leadership-summary section of a fuller market-research or pentest report. Use when the deliverable is a short brief for decision-makers who will act without reading a full report. Anti-trigger; for the full study those decision-makers are summarizing use market-research-report or security-pentest (or prd for product requirements), not this genre.
argument-hint: "<the decision this summary supports>"
---

# exec-summary

Produces an **executive summary**: a short, standalone brief for decision-makers
— executives, sponsors, board members — who need the conclusion and the single
recommended action, and will not read past page two. Its center of gravity is
the **BLUF (Bottom Line Up Front)** — the answer and the recommended action
stated before any context. An exec summary states conclusions and their
business consequence; it does not narrate method, explore alternatives, or
expose intermediate analysis.

This genre follows the widely-used BLUF convention, with an additive optional
overlay for composing into a fuller ESOMAR-style market-research report or
PTES-style pentest report as their leadership-summary section.

## Pattern (industry: BLUF executive summary)

1. **BLUF (Bottom Line Up Front)** — one paragraph: the answer and the
   recommended action, stated before any context. Never open with method or
   background. The heading must literally contain "BLUF" (e.g.
   `## BLUF (Bottom Line Up Front)`) so automated checks can locate it.
2. **Key Findings** — 3 to 5 bullets, each a single load-bearing fact with its
   "so what". Cite the source behind each quantified claim.
3. **Recommendation** — one bold, specific, actionable directive. Include
   What / Why / How / Risk.
4. **Risks & Caveats** — the 1 to 3 conditions under which the recommendation
   fails, plus the confidence basis for any uncertain finding.

## Rules that keep it an executive summary

- Length is a hard ceiling: 1-2 pages (standalone mode). If it grows, cut —
  do not continue.
- The summary must stand alone: a reader who reads only this document can act
  correctly.
- Quantify at least one finding. Never fabricate a number; present a range
  when sources disagree and hedge ("estimated", "data suggests") for
  uncertain claims.
- Use active voice throughout — no "is drawn from", "was found to", "were
  identified". Write "Three controlled pilots show 40% efficiency gains," not
  "the 40% reduction is drawn from three controlled pilots."
- Never expose intermediate analysis, methodology narration, or an
  alternatives-considered discussion — that belongs in the fuller report this
  summary may introduce.
- Inline numeric citation markers (`[1]`, `[2]`) resolving to a compact
  footnote list. No bibliography, no appendices — footnotes only.

## Composable mode (additive — off by default; render when requested)

Standalone is the default. When requested, render this genre as the
**leadership-summary section** of a larger standard report — still emit the
summary section shaped for embedding, not the whole multi-section report:

- **Market-research report** (`market-research-report` genre) — render as the
  report's management summary that introduces the fuller study. Emit only that
  section, sized for embedding; do not generate the study's body sections.
  ESOMAR is an **ethics code**, not a report *format* — carry that caveat; do
  not claim ESOMAR-format conformance.
- **Pentest report** (`security-pentest` genre) — render as the PTES
  **Executive / Leadership Summary**, expanded with its sub-elements:
  **Posture** (overall security posture), **Risk Profile** (business risk from
  the findings), and **Roadmap** (prioritized remediation direction). Emit
  only that section, not the full technical report.

Standalone behavior is unchanged when composable mode is not requested.

## Anti-triggers — do not use this genre for

- **The fuller study or report this summary would introduce** — that is
  `market-research-report` or `security-pentest` (or `prd` for product
  requirements); this genre only produces the leadership-summary section.
- **A team-facing technical evaluation with a comparison table** — that is
  `engineering`.
- **A narrative alignment doc read by engineers before building** — that is
  `google-design-doc`.

## MIF frontmatter

`type: semantic` — an executive summary is declarative decision-and-rationale
knowledge, not a time-bound event or a step sequence. Use
`namespace: exec-summary/<area>` and `entity.entity_type: executive-summary`.
Climb to L2 with `namespace`, `modified`, `title`, and `tags` when the
drafting context supplies them. Gate every output with `mif-validate` at its
target level; the floor is `--level 1`.

## Why machine-readable — the point of MIF here

| Question an agent asks | Answered by (frontmatter) |
| --- | --- |
| Is this summary still current for the decision it supports? | `temporal.validFrom` / `ttl` |
| Where did the evidence come from; can I trust it? | `provenance` (W3C-PROV) + `citations[]` |
| What fuller report does this summarize? | typed `relationships[]` (`relates-to`) |
| Which claims are quantified vs. hedged? | `citations[]` tied to each Key Findings bullet |

The same document still reads as a human executive summary and projects
losslessly to JSON-LD and back — one artifact, two readers.

## The L1 -> L3 climb (two exemplars)

- `templates/good-l1.md` — **L1 floor**: `id`, `type`, `created` + body. A
  complete, valid summary, but opaque to a machine consumer.
- `templates/good.md` — **L3 (highest this genre supports)**: adds
  `namespace`, `modified`, `temporal` validity, W3C-PROV `provenance`,
  `citations[]` tied to the Key Findings claims, and a typed `relationships[]`
  graph (`relates-to` the fuller report this summary introduces). Validate
  with `mif-validate --level 3`.

Author at the **highest level the drafting context supports** (grade down
rather than fabricate). `templates/bad.md` shows the antipattern: a summary
that buries the recommendation behind background and method instead of
leading with BLUF.
