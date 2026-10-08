---
id: 792e2200-62ca-526f-b89f-1edbc33409d4
type: semantic
created: '2026-06-30T12:00:00Z'
modified: '2026-06-30T12:00:00Z'
namespace: reference/skills
title: 'Skill reference: diataxis-explanation'
tags:
  - reference
  - mif-docs
  - skill
  - diataxis
  - explanation
temporal:
  '@type': TemporalMetadata
  validFrom: '2026-06-30T00:00:00Z'
  recordedAt: '2026-06-30T12:00:00Z'
  ttl: P1Y
provenance:
  '@type': Provenance
  sourceType: agent_inferred
  trustLevel: high_confidence
  agent: anthropic/claude-code
  wasAttributedTo:
    '@id': https://github.com/modeled-information-format
    '@type': prov:Agent
  wasGeneratedBy:
    '@id': urn:mif:activity:mif-docs-self-documentation
    '@type': prov:Activity
  wasDerivedFrom:
    - '@id': https://github.com/modeled-information-format/mif-docs-plugin
      '@type': prov:Entity
    - '@id': urn:mif:skill:diataxis-explanation
      '@type': prov:Entity
citations:
  - '@type': Citation
    citationType: specification
    citationRole: methodology
    title: Diátaxis — Explanation
    url: https://diataxis.fr/explanation/
    accessed: '2026-06-30'
  - '@type': Citation
    citationType: article
    citationRole: background
    title: Diátaxis — a systematic framework for technical documentation (Daniele Procida)
    url: https://diataxis.fr/
    accessed: '2026-06-30'
  - '@type': Citation
    citationType: tool
    citationRole: source
    title: 'mif-docs — diataxis-explanation skill (SKILL.md)'
    url: https://github.com/modeled-information-format/mif-docs-plugin/tree/main/skills/diataxis-explanation
relationships:
  - type: relates-to
    target: urn:mif:d8972202-0b4d-52ea-89d7-90abe228e820
  - type: relates-to
    target: urn:mif:ec47e1d8-c9be-59f8-a146-432ca1edf92d
  - type: relates-to
    target: urn:mif:91cb1e5e-f6cb-5594-ba29-3ef40865212c
  - type: relates-to
    target: urn:mif:41c6e3a7-5004-5565-97fd-580483877ac7
ontology:
  '@type': OntologyReference
  id: mif-docs
  version: 1.0.0
  uri: https://mif-spec.dev/ontologies/mif-docs
entity:
  name: 'Skill reference: diataxis-explanation'
  entity_type: reference-document
extensions:
  x-skill: diataxis-explanation
  x-genre-conceptType: semantic
  x-target-level: 3
  x-purpose-group: diataxis-quadrants
---

# Skill reference: `diataxis-explanation`

The `diataxis-explanation` skill authors one document genre: a **Diátaxis
explanation** — an understanding-oriented discussion of the why behind a topic.
This reference describes what that document type is, how the skill produces one,
when it earns its place, and the provenance and sources behind it.

| Property | Value |
| --- | --- |
| Authors | An understanding-oriented explanation |
| Purpose group | Diátaxis quadrants |
| MIF `conceptType` | `semantic` |
| Target MIF level | 3 |
| Primary source | [Diátaxis — Explanation](https://diataxis.fr/explanation/) |

## What this document type is

An explanation is one of the four Diátaxis modes. Its defining property is that it
is **understanding-oriented**: it exists to illuminate a topic — to give
background, rationale, design history, trade-offs, and the connections between one
idea and others — so the reader comes away understanding *why* things are the way
they are. Diátaxis describes explanation as discursive and reflective: it is read
away from the work, at leisure, to deepen and broaden comprehension rather than to
perform an immediate task. It admits opinion and alternative views; it can discuss
what might have been and why it was not.

An explanation is therefore *not* a tutorial (which teaches a beginner by doing),
*not* a how-to guide (which drives a competent user to a goal), and *not* reference
(which states facts neutrally for lookup). Explanation is the one mode defined by
its relationship to understanding rather than to action or information, and folding
it into the action-oriented genres — pausing a tutorial or how-to to philosophize —
is a classic Diátaxis failure the separation exists to prevent.

## How the skill produces one

`diataxis-explanation` is a genre skill: it carries the Diátaxis explanation
pattern as durable instructions plus exemplars, and writes the artifact over a MIF
floor so the result is at once a readable discussion and a machine-conformant unit.

- **Pattern, made operational.** The skill encodes the understanding-oriented
  constraints — discuss the why, supply context and rationale, draw connections and
  weigh trade-offs, stay clear of step-by-step instruction — and refuses
  anti-triggered work (a known task belongs in a how-to; a fact belongs in
  reference).
- **Exemplars set the bar.** Like every genre in the suite it ships `good-l1.md`
  (the MIF Level-1 floor), `good.md` (the target level — Level 3 for an
  explanation), `bad.md` (a counter-example), and `evals/evals.json`. The
  `check-exemplars` gate proves `good-l1.md` validates at L1 and `good.md` at its
  target level, so the pattern the skill teaches is itself continuously verified.
- **MIF projection.** The explanation is authored with MIF frontmatter (via the
  shared `mif-frontmatter` substrate) and a `conceptType` of `semantic`, reflecting
  that it conveys understanding and relationships rather than a sequence of actions.
  `mif-validate` proves the Markdown ↔ JSON-LD round-trip is lossless before the
  document is considered done.

## When it is beneficial

Reach for `diataxis-explanation` when the reader needs to **grasp a concept or a
decision**: why an architecture is shaped as it is, what trade-offs a design
accepted, how one idea relates to another. Good explanation is what lets a reader
reason about a system instead of merely operating it, and it is the natural home
for the rationale that would otherwise clutter the action-oriented genres.

Do **not** use it when the reader wants to *do* something — a task they understand
wants a [how-to guide](https://diataxis.fr/how-to-guides/); a beginner wants a
[tutorial](https://diataxis.fr/tutorials/) — or when they want a bare fact, which
belongs in [reference](https://diataxis.fr/reference/). The trade-off is that
explanation does not directly advance a task: it is read at leisure for
comprehension, so its value is real but diffuse, and over-investing in it before
the action genres exist can leave users understanding a system they still cannot
use.

## Example

An explanation titled *"Why MIF uses lossless Markdown ↔ JSON-LD round-trips"*
discusses the design problem — keeping one artifact legible to humans and parseable
by machines — sketches the alternatives that were rejected, names the trade-offs
the round-trip constraint accepts, and connects the choice to provenance and the
MIF level model. It gives the reader no steps to follow and no field table to scan;
it leaves them understanding the rationale. The suite's own
[explanation material](../../../explanation/one-artifact-two-readers/) is written to this shape.

## Provenance & citations

- **Genre source — Diátaxis explanation:** the canonical definition of the
  understanding-oriented mode, <https://diataxis.fr/explanation/>, within the
  Diátaxis framework by Daniele Procida, <https://diataxis.fr/>.
- **Skill provenance:** authored by the `diataxis-explanation` skill in the mif-docs
  plugin, <https://github.com/modeled-information-format/mif-docs-plugin>; the
  skill's exemplars and `evals/` define and verify the pattern.
- **MIF conformance:** the document projects to canonical JSON-LD under the MIF
  specification, <https://mif-spec.dev>, and is proven lossless by `mif-validate`.
- **Index:** this skill is one entry in the [skills by purpose](../../skills-by-purpose/)
  catalog; its sibling quadrants are
  [diataxis-tutorial](../diataxis-tutorial/), [diataxis-how-to](../diataxis-how-to/),
  and [diataxis-reference](../diataxis-reference/).
