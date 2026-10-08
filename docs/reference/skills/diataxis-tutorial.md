---
id: ec47e1d8-c9be-59f8-a146-432ca1edf92d
type: semantic
created: '2026-06-30T12:00:00Z'
modified: '2026-06-30T12:00:00Z'
namespace: reference/skills
title: 'Skill reference: diataxis-tutorial'
tags:
  - reference
  - mif-docs
  - skill
  - diataxis
  - tutorial
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
    - '@id': urn:mif:skill:diataxis-tutorial
      '@type': prov:Entity
citations:
  - '@type': Citation
    citationType: specification
    citationRole: methodology
    title: Diátaxis — Tutorials
    url: https://diataxis.fr/tutorials/
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
    title: 'mif-docs — diataxis-tutorial skill (SKILL.md)'
    url: https://github.com/modeled-information-format/mif-docs-plugin/tree/main/skills/diataxis-tutorial
relationships:
  - type: relates-to
    target: urn:mif:d8972202-0b4d-52ea-89d7-90abe228e820
  - type: relates-to
    target: urn:mif:91cb1e5e-f6cb-5594-ba29-3ef40865212c
  - type: relates-to
    target: urn:mif:41c6e3a7-5004-5565-97fd-580483877ac7
  - type: relates-to
    target: urn:mif:792e2200-62ca-526f-b89f-1edbc33409d4
ontology:
  '@type': OntologyReference
  id: mif-docs
  version: 1.0.0
  uri: https://mif-spec.dev/ontologies/mif-docs
entity:
  name: 'Skill reference: diataxis-tutorial'
  entity_type: reference-document
extensions:
  x-skill: diataxis-tutorial
  x-genre-conceptType: procedural
  x-target-level: 2
  x-purpose-group: diataxis-quadrants
---

# Skill reference: `diataxis-tutorial`

The `diataxis-tutorial` skill authors one document genre: a **Diátaxis
tutorial** — a learning-oriented, hands-on lesson. This reference describes what
that document type is, how the skill produces one, when it earns its place, and
the provenance and sources behind it.

| Property | Value |
| --- | --- |
| Authors | A learning-oriented, hands-on tutorial |
| Purpose group | Diátaxis quadrants |
| MIF `conceptType` | `procedural` |
| Target MIF level | 2 |
| Primary source | [Diátaxis — Tutorials](https://diataxis.fr/tutorials/) |

## What this document type is

A tutorial is one of the four Diátaxis modes. Its defining property is that it is
**learning-oriented**: it exists to take a beginner, by the hand, through a single
concrete success *by doing*, so they come away with confidence and a working
mental foothold — not a comprehensive understanding and not a finished production
task. Diátaxis is explicit that the tutorial's author is a teacher responsible for
the learner's journey: every step must work, every instruction must be one the
learner can follow without prior knowledge, and the lesson must deliver a visible,
early, and repeated sense of achievement.

A tutorial is therefore *not* a how-to guide (which serves a competent user with a
goal they already understand), *not* reference (which is consulted, not read
through), and *not* explanation (which discusses the why). Mixing those modes into
a tutorial is the single most common documentation failure Diátaxis names, and the
genre exists precisely to keep them separate.

## How the skill produces one

`diataxis-tutorial` is a genre skill: it carries the Diátaxis tutorial pattern as
durable instructions plus exemplars, and writes the artifact over a MIF floor so
the result is at once a human-readable lesson and a machine-conformant unit.

- **Pattern, made operational.** The skill encodes the learning-oriented
  constraints — concrete first success, no digressions into explanation, every
  step verified — and refuses anti-triggered work (a known task belongs in a
  how-to; facts belong in reference).
- **Exemplars set the bar.** Like every genre in the suite it ships
  `good-l1.md` (the MIF Level-1 floor), `good.md` (the target level — Level 2 for
  a tutorial), `bad.md` (a counter-example), and `evals/evals.json`. The
  `check-exemplars` gate proves `good-l1.md` validates at L1 and `good.md` at its
  target level, so the pattern the skill teaches is itself continuously verified.
- **MIF projection.** The tutorial is authored with MIF frontmatter (via the
  shared `mif-frontmatter` substrate) and a `conceptType` of `procedural`,
  reflecting that a tutorial is a sequence of performed steps. `mif-validate`
  proves the Markdown ↔ JSON-LD round-trip is lossless before the document is
  considered done.

## When it is beneficial

Reach for `diataxis-tutorial` when the reader is **new** and the goal is their
confidence: onboarding, getting-started lessons, a first end-to-end walkthrough of
a tool or workflow. A good tutorial dramatically lowers the activation energy for
adoption because it manufactures an early success the learner can build on.

Do **not** use it when the reader already knows what they want to accomplish — a
task they understand wants a [how-to guide](https://diataxis.fr/how-to-guides/),
which is leaner and assumes competence. Do not use it for lookup material (that is
[reference](https://diataxis.fr/reference/)) or for background and rationale (that
is [explanation](https://diataxis.fr/explanation/)). The cost of a tutorial is
maintenance: because every step must work, tutorials are the most expensive genre
to keep current, so write one where onboarding value justifies that upkeep.

## Example

A tutorial titled *"Author and validate your first MIF document"* opens with a
one-sentence promise of what the learner will have built by the end, lists the
prerequisites, then walks through numbered steps — create the file, add the L1
frontmatter, run `mif-validate`, see it pass — each producing a visible result.
It does not pause to explain *why* JSON-LD round-trips; it links that to an
explanation and keeps the learner moving toward the success. The suite's own
[getting-started tutorial](../../../tutorials/getting-started/) is exactly this shape.

## Provenance & citations

- **Genre source — Diátaxis tutorials:** the canonical definition of the
  learning-oriented mode, <https://diataxis.fr/tutorials/>, within the Diátaxis
  framework by Daniele Procida, <https://diataxis.fr/>.
- **Skill provenance:** authored by the `diataxis-tutorial` skill in the mif-docs
  plugin, <https://github.com/modeled-information-format/mif-docs-plugin>; the
  skill's exemplars and `evals/` define and verify the pattern.
- **MIF conformance:** the document projects to canonical JSON-LD under the MIF
  specification, <https://mif-spec.dev>, and is proven lossless by `mif-validate`.
- **Index:** this skill is one entry in the [skills by purpose](../../skills-by-purpose/)
  catalog; its sibling quadrants are
  [diataxis-how-to](../diataxis-how-to/), [diataxis-reference](../diataxis-reference/),
  and [diataxis-explanation](../diataxis-explanation/).
