---
id: 41c6e3a7-5004-5565-97fd-580483877ac7
type: semantic
created: '2026-06-30T12:00:00Z'
modified: '2026-06-30T12:00:00Z'
namespace: reference/skills
title: 'Skill reference: diataxis-reference'
tags:
  - reference
  - mif-docs
  - skill
  - diataxis
  - reference
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
    - '@id': urn:mif:skill:diataxis-reference
      '@type': prov:Entity
citations:
  - '@type': Citation
    citationType: specification
    citationRole: methodology
    title: Diátaxis — Reference
    url: https://diataxis.fr/reference/
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
    title: 'mif-docs — diataxis-reference skill (SKILL.md)'
    url: https://github.com/modeled-information-format/mif-docs-plugin/tree/main/skills/diataxis-reference
relationships:
  - type: relates-to
    target: urn:mif:d8972202-0b4d-52ea-89d7-90abe228e820
  - type: relates-to
    target: urn:mif:ec47e1d8-c9be-59f8-a146-432ca1edf92d
  - type: relates-to
    target: urn:mif:91cb1e5e-f6cb-5594-ba29-3ef40865212c
  - type: relates-to
    target: urn:mif:792e2200-62ca-526f-b89f-1edbc33409d4
ontology:
  '@type': OntologyReference
  id: mif-docs
  version: 1.0.0
  uri: https://mif-spec.dev/ontologies/mif-docs
entity:
  name: 'Skill reference: diataxis-reference'
  entity_type: reference-document
extensions:
  x-skill: diataxis-reference
  x-genre-conceptType: semantic
  x-target-level: 3
  x-purpose-group: diataxis-quadrants
---

# Skill reference: `diataxis-reference`

The `diataxis-reference` skill authors one document genre: a **Diátaxis
reference** — a dry, information-oriented, exhaustive description of one thing.
This reference describes what that document type is, how the skill produces one,
when it earns its place, and the provenance and sources behind it.

| Property | Value |
| --- | --- |
| Authors | A dry, information-oriented reference |
| Purpose group | Diátaxis quadrants |
| MIF `conceptType` | `semantic` |
| Target MIF level | 3 |
| Primary source | [Diátaxis — Reference](https://diataxis.fr/reference/) |

## What this document type is

A reference is one of the four Diátaxis modes. Its defining property is that it is
**information-oriented**: it exists to describe one thing — a CLI command, a config
file, an API endpoint, a schema — accurately, completely, and neutrally, so a
working practitioner can consult it. Diátaxis is emphatic that reference is austere
by design: it states what is, without instruction, persuasion, or speculation. Its
structure should **mirror the structure of the thing it documents** — if the
machinery has parts, the reference is organized by those parts — so a reader can
navigate to a fact the way they would navigate the product itself.

A reference is therefore *not* a tutorial (which teaches a beginner), *not* a
how-to guide (which drives a competent user to a goal), and *not* explanation
(which discusses the why). Reference is consulted, not read through; a reader
arrives knowing what they are looking for and leaves the moment they have it.
Smuggling tutorial hand-holding or explanatory argument into reference is the
failure Diátaxis warns against — it inflates the material the reader must skim.

## How the skill produces one

`diataxis-reference` is a genre skill: it carries the Diátaxis reference pattern as
durable instructions plus exemplars, and writes the artifact over a MIF floor so
the result is at once consultable description and a machine-conformant unit.

- **Pattern, made operational.** The skill encodes the information-oriented
  constraints — describe one thing exhaustively, mirror its structure, stay neutral
  and dry, omit teaching and rationale — and refuses anti-triggered work (learning
  belongs in a tutorial; accomplishing a goal belongs in a how-to).
- **Exemplars set the bar.** Like every genre in the suite it ships `good-l1.md`
  (the MIF Level-1 floor), `good.md` (the target level — Level 3 for a reference),
  `bad.md` (a counter-example), and `evals/evals.json`. The `check-exemplars` gate
  proves `good-l1.md` validates at L1 and `good.md` at its target level, so the
  pattern the skill teaches is itself continuously verified.
- **MIF projection.** The reference is authored with MIF frontmatter (via the
  shared `mif-frontmatter` substrate) and a `conceptType` of `semantic`, reflecting
  that reference describes a thing's properties rather than a sequence of actions.
  `mif-validate` proves the Markdown ↔ JSON-LD round-trip is lossless before the
  document is considered done.

## When it is beneficial

Reach for `diataxis-reference` when the reader needs a **fact about a specific
thing** they will consult repeatedly: the flags of a command, the fields of a
schema, the parameters of an endpoint. Good reference is the backbone of mature
documentation because it is the place practitioners return to, and its neutrality
makes it cheap to trust and to keep authoritative.

Do **not** use it for a reader who is learning — that wants a
[tutorial](https://diataxis.fr/tutorials/) — or for someone trying to accomplish a
task, which wants a [how-to guide](https://diataxis.fr/how-to-guides/). Do not use
it to argue or contextualize; the why belongs in
[explanation](https://diataxis.fr/explanation/). The trade-off is breadth over
flow: reference must be exhaustive and is consulted in fragments, so it reads
poorly start to finish — that is correct, not a defect.

## Example

A reference titled *"MIF frontmatter fields"* is organized to mirror the schema it
documents: one section per top-level key, each stating the field name, its type,
whether it is required at L1/L2/L3, and its meaning, in a flat table the reader can
scan. It does not narrate how to author a document or argue why the levels exist;
it states what each field is and stops. The suite's own
[reference material](../../genre-and-cli-catalog/) is built to this shape.

## Provenance & citations

- **Genre source — Diátaxis reference:** the canonical definition of the
  information-oriented mode, <https://diataxis.fr/reference/>, within the Diátaxis
  framework by Daniele Procida, <https://diataxis.fr/>.
- **Skill provenance:** authored by the `diataxis-reference` skill in the mif-docs
  plugin, <https://github.com/modeled-information-format/mif-docs-plugin>; the
  skill's exemplars and `evals/` define and verify the pattern.
- **MIF conformance:** the document projects to canonical JSON-LD under the MIF
  specification, <https://mif-spec.dev>, and is proven lossless by `mif-validate`.
- **Index:** this skill is one entry in the [skills by purpose](../../skills-by-purpose/)
  catalog; its sibling quadrants are
  [diataxis-tutorial](../diataxis-tutorial/), [diataxis-how-to](../diataxis-how-to/),
  and [diataxis-explanation](../diataxis-explanation/).
