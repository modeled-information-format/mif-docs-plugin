---
id: 91cb1e5e-f6cb-5594-ba29-3ef40865212c
type: semantic
created: '2026-06-30T12:00:00Z'
modified: '2026-06-30T12:00:00Z'
namespace: reference/skills
title: 'Skill reference: diataxis-how-to'
tags:
  - reference
  - mif-docs
  - skill
  - diataxis
  - how-to
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
    - '@id': urn:mif:skill:diataxis-how-to
      '@type': prov:Entity
citations:
  - '@type': Citation
    citationType: specification
    citationRole: methodology
    title: Diátaxis — How-to guides
    url: https://diataxis.fr/how-to-guides/
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
    title: 'mif-docs — diataxis-how-to skill (SKILL.md)'
    url: https://github.com/modeled-information-format/mif-docs-plugin/tree/main/skills/diataxis-how-to
relationships:
  - type: relates-to
    target: urn:mif:d8972202-0b4d-52ea-89d7-90abe228e820
  - type: relates-to
    target: urn:mif:ec47e1d8-c9be-59f8-a146-432ca1edf92d
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
  name: 'Skill reference: diataxis-how-to'
  entity_type: reference-document
extensions:
  x-skill: diataxis-how-to
  x-genre-conceptType: procedural
  x-target-level: 2
  x-purpose-group: diataxis-quadrants
---

# Skill reference: `diataxis-how-to`

The `diataxis-how-to` skill authors one document genre: a **Diátaxis how-to
guide** — a task-oriented recipe that walks a competent user through one real
goal. This reference describes what that document type is, how the skill produces
one, when it earns its place, and the provenance and sources behind it.

| Property | Value |
| --- | --- |
| Authors | A task-oriented how-to guide |
| Purpose group | Diátaxis quadrants |
| MIF `conceptType` | `procedural` |
| Target MIF level | 2 |
| Primary source | [Diátaxis — How-to guides](https://diataxis.fr/how-to-guides/) |

## What this document type is

A how-to guide is one of the four Diátaxis modes. Its defining property is that it
is **task-oriented**: it serves a user who already knows what they want to
accomplish and needs the sequence of actions that gets them there. Diátaxis frames
the how-to as a recipe — a set of directions for solving one real-world problem,
addressed to someone competent who can adapt the steps to their own situation. It
assumes prior knowledge, omits teaching, and is measured by whether the reader
reaches the goal, not by what they learned along the way.

A how-to guide is therefore *not* a tutorial (which teaches a beginner through a
crafted first success), *not* reference (which is consulted for facts, not read
through), and *not* explanation (which discusses the why). The how-to occupies the
action quadrant for users who are already capable; mixing in teaching or
background dilutes the very leanness that makes it useful.

## How the skill produces one

`diataxis-how-to` is a genre skill: it carries the Diátaxis how-to pattern as
durable instructions plus exemplars, and writes the artifact over a MIF floor so
the result is at once a usable recipe and a machine-conformant unit.

- **Pattern, made operational.** The skill encodes the task-oriented constraints —
  start from a real goal, give a coherent sequence of actions, address a competent
  reader, omit explanation — and refuses anti-triggered work (a beginner who needs
  to learn belongs in a tutorial; a fact lookup belongs in reference).
- **Exemplars set the bar.** Like every genre in the suite it ships `good-l1.md`
  (the MIF Level-1 floor), `good.md` (the target level — Level 2 for a how-to),
  `bad.md` (a counter-example), and `evals/evals.json`. The `check-exemplars` gate
  proves `good-l1.md` validates at L1 and `good.md` at its target level, so the
  pattern the skill teaches is itself continuously verified.
- **MIF projection.** The guide is authored with MIF frontmatter (via the shared
  `mif-frontmatter` substrate) and a `conceptType` of `procedural`, reflecting that
  a how-to is a sequence of performed actions. `mif-validate` proves the
  Markdown ↔ JSON-LD round-trip is lossless before the document is considered done.

## When it is beneficial

Reach for `diataxis-how-to` when the reader is **already competent** and has a
goal in hand: configuring a feature, integrating two tools, performing an
operation they understand but have not memorized. A good how-to is lean — it
respects the reader's time by giving exactly the steps and trusting them to adapt.

Do **not** use it when the reader is new and needs to learn — that wants a
[tutorial](https://diataxis.fr/tutorials/), which manufactures an early success
and carries the learner. Do not use it for lookup material (that is
[reference](https://diataxis.fr/reference/)) or for background and rationale (that
is [explanation](https://diataxis.fr/explanation/)). The trade-off is that a how-to
deliberately withholds teaching: a reader who lacks the assumed competence will be
lost, so pitch it to someone who can already operate in the domain.

## Example

A how-to titled *"Add MIF frontmatter to an existing document"* opens by naming
the goal in one line, lists what the reader must already have, then gives a tight
sequence of actions — open the file, paste the L1 block, fill `id` and `title`,
run `mif-validate`, fix any failure — and stops the moment the goal is met. It
does not explain what JSON-LD is or why the floor matters; it links those to
explanation and keeps the competent reader moving. The suite's own
[how-to guides](../../../how-to/validate-and-author-a-document/) follow exactly this shape.

## Provenance & citations

- **Genre source — Diátaxis how-to guides:** the canonical definition of the
  task-oriented mode, <https://diataxis.fr/how-to-guides/>, within the Diátaxis
  framework by Daniele Procida, <https://diataxis.fr/>.
- **Skill provenance:** authored by the `diataxis-how-to` skill in the mif-docs
  plugin, <https://github.com/modeled-information-format/mif-docs-plugin>; the
  skill's exemplars and `evals/` define and verify the pattern.
- **MIF conformance:** the document projects to canonical JSON-LD under the MIF
  specification, <https://mif-spec.dev>, and is proven lossless by `mif-validate`.
- **Index:** this skill is one entry in the [skills by purpose](../../skills-by-purpose/)
  catalog; its sibling quadrants are
  [diataxis-tutorial](../diataxis-tutorial/), [diataxis-reference](../diataxis-reference/),
  and [diataxis-explanation](../diataxis-explanation/).
