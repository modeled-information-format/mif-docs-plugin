---
name: engineering
description: Write an engineering decision / evaluation report — Problem/Context, Options Considered, a mandatory options-vs-criteria Trade-offs comparison table, Decision, Implementation Notes, and Consequences — with optional ANSI/NISO Z39.18 technical-report front/back matter. Use when a team must document a technical decision or evaluation for the engineers who will build or operate the result. Anti-trigger; for a single immutable decision with no mandatory comparison table use adr, for a pre-build alignment narrative built around prose trade-offs rather than a required table use google-design-doc, for product requirements use prd or feature-spec.
argument-hint: "<the technical decision or evaluation to document>"
---

# engineering

Produces an **engineering decision / evaluation report**: a practitioner-facing
document that evaluates concrete options against stated decision drivers, states
which one was chosen, and gives the engineers who build or operate the result
enough to act. Its center of gravity is the **comparison table** — the report is
not conformant without one mapping every candidate option to the decision
drivers. This genre follows the general practitioner evaluation-report
convention used across engineering organizations, with an additive optional
overlay for formal ANSI/NISO Z39.18 technical-report conformance.

## Pattern (industry: practitioner evaluation report, optional Z39.18 overlay)

1. **Problem / Context** — what is being decided or evaluated, and the decision
   drivers (requirements, constraints, non-functionals) that will judge the
   options.
2. **Options Considered** — every candidate, described neutrally.
3. **Trade-offs** — a **required** Markdown comparison table mapping options
   against the stated decision drivers. A report without this table is not a
   conformant engineering report.
4. **Decision** — the chosen option, stated plainly, with rationale that ties
   back to the comparison table.
5. **Implementation Notes** — what it takes to build or operate the choice:
   dependencies, migration steps, risks, rollout, operational concerns.
6. **Consequences** — what becomes easier, what becomes harder, what to revisit.

Add an architecture or flow figure — a Mermaid `flowchart` or `sequenceDiagram`
— when the findings support a system or component structure worth visualizing.
This is optional and additive; a report with no such structure to show is
still conformant without one.

## Rules that keep it an engineering report

- The Trade-offs comparison table is mandatory, not optional matter — it is the
  section that grounds the Decision. Render it as a Markdown table, never
  ASCII art or an image.
- Any architecture or flow figure is a fenced `mermaid` code block — never
  ASCII art, an image link, or Graphviz/DOT.
- Every option gets a fair, neutral description before the table judges it; a
  strawman option is a review smell.
- The Decision must reference the comparison table's evidence, not assert a
  preference the table does not support.
- Implementation Notes must be actionable — a named dependency, migration step,
  or rollout action, not "evaluate further."
- Cite measured or benchmarked claims to their source; do not present an
  uncertain or contested claim as settled fact — flag it inline instead.

## Anti-triggers — do not use this genre for

- **A single already-made decision with no evaluation to show** — that is an
  `adr` (Structured MADR): immutable, driver-and-outcome, no mandatory
  comparison table.
- **A pre-build alignment narrative that reasons in prose rather than a
  required table** — that is `google-design-doc`: informal, trade-off-focused,
  but its Alternatives Considered is discursive, not a mandatory matrix.
- **What to build and why, before design** — that is `prd` or `feature-spec`.

## Optional ANSI/NISO Z39.18 conformance (additive — off by default)

When a formal technical-report format is requested, add — without dropping the
default structure above:

- **Report Documentation Page** — a structured front-matter page (report
  number, title, authors, performing organization, date, abstract, subject
  terms).
- **Distribution / STINFO markings** — the distribution statement and any
  scientific-and-technical-information handling markings.
- **Z39.18 back-matter ordering** — References before Appendices (then any
  glossary/index). **Verify live:** check the current ISO/IEC Directives Part 2
  and Z39.18 revision at authoring time rather than asserting one as settled.

## MIF frontmatter

`type: semantic` — an engineering report is declarative decision-and-rationale
knowledge, not a time-bound event or a step sequence. Climb to L2 with
`namespace` (`engineering/<area>`), `modified`, `title`, and `tags` when the
review context supplies them. Gate every output with `mif-validate` at its
target level; the floor is `--level 1`.

## Why machine-readable — the point of MIF here

| Question an agent asks | Answered by (frontmatter) |
| --- | --- |
| Is this decision still current? | `temporal.validFrom` / `ttl` |
| Where did the evidence come from; can I trust it? | `provenance` (W3C-PROV) + `citations[]` |
| What formalizes it or relates to it? | typed `relationships[]` (`realized-by`, `relates-to`) |
| Which claims were measured vs. asserted? | `citations[]` tied to each trade-off row |

The same document still reads as a human evaluation report and projects
losslessly to JSON-LD and back — one artifact, two readers.

## The L1 -> L3 climb (two exemplars)

- `templates/good-l1.md` — **L1 floor**: `id`, `type`, `created` + body. A
  complete, valid report, but opaque to a machine consumer.
- `templates/good.md` — **L3 (highest this genre supports)**: adds
  `namespace`, `modified`, `temporal` validity, W3C-PROV `provenance`,
  `citations[]` tied to the trade-off claims, and a typed `relationships[]`
  graph (e.g. `relates-to` the ADR that later formalizes the decision).
  Validate with `mif-validate --level 3`.

Author at the **highest level the drafting context supports** (grade down
rather than fabricate). `templates/bad.md` shows the antipattern: a report that
states a Decision with no Trade-offs table to support it.
