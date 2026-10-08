---
id: 776e28a8-7fd8-5a5d-b477-efde9b5358cc
type: semantic
created: '2026-06-30T12:00:00Z'
modified: '2026-06-30T12:00:00Z'
namespace: reference/skills
title: 'Skill reference: mif-frontmatter'
tags:
  - reference
  - mif-docs
  - skill
  - mif
  - frontmatter
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
    - '@id': urn:mif:skill:mif-frontmatter
      '@type': prov:Entity
citations:
  - '@type': Citation
    citationType: specification
    citationRole: methodology
    title: MIF — Modeled Information Format specification
    url: https://mif-spec.dev
    accessed: '2026-06-30'
  - '@type': Citation
    citationType: specification
    citationRole: methodology
    title: JSON-LD 1.1 (W3C Recommendation)
    url: https://www.w3.org/TR/json-ld11/
    accessed: '2026-06-30'
  - '@type': Citation
    citationType: specification
    citationRole: background
    title: PROV-O — The PROV Ontology (W3C Recommendation)
    url: https://www.w3.org/TR/prov-o/
    accessed: '2026-06-30'
  - '@type': Citation
    citationType: tool
    citationRole: source
    title: 'mif-docs — mif-frontmatter skill (SKILL.md)'
    url: https://github.com/modeled-information-format/mif-docs-plugin/tree/main/skills/mif-frontmatter
relationships:
  - type: relates-to
    target: urn:mif:d8972202-0b4d-52ea-89d7-90abe228e820
  - type: relates-to
    target: urn:mif:6a9f7095-2d06-51d9-90be-0be973fe887e
  - type: relates-to
    target: urn:mif:e9c994fc-55a7-56a4-b8b4-9273afbbbc6a
  - type: relates-to
    target: urn:mif:f8d4c638-fac3-5c75-b314-c7a5f047a81d
ontology:
  '@type': OntologyReference
  id: mif-docs
  version: 1.0.0
  uri: https://mif-spec.dev/ontologies/mif-docs
entity:
  name: 'Skill reference: mif-frontmatter'
  entity_type: reference-document
extensions:
  x-skill: mif-frontmatter
  x-genre-conceptType: substrate
  x-target-level: 1
  x-purpose-group: authoring-helpers
---

# Skill reference: `mif-frontmatter`

The `mif-frontmatter` skill is a **substrate helper**: it does not author a
document genre of its own, it supplies the MIF metadata layer that every genre
in the suite is written over. This reference describes what that frontmatter is,
how the skill produces it, when it is invoked, and the provenance behind it.

| Property | Value |
| --- | --- |
| Authors | The MIF Level 1–3 frontmatter for any document |
| Purpose group | Authoring helpers |
| MIF `conceptType` | `substrate` |
| Target MIF level | 1 |
| Primary source | [MIF specification](https://mif-spec.dev) |

## What this document type is

MIF frontmatter is the YAML block at the head of a document that projects
losslessly to canonical [JSON-LD](https://www.w3.org/TR/json-ld11/). It is not a
free-form preamble: it is a **layered schema** with three conformance floors.
Level 1 carries the identity floor — `id`, `type`, `title`, timestamps,
`namespace`, and an `entity` block — so that any tool can address the document.
Level 2 adds `temporal` validity, `tags`, and an `ontology` reference. Level 3
adds the full [PROV-O](https://www.w3.org/TR/prov-o/) `provenance` graph,
`citations`, and `relationships[]` that wire the document into a knowledge graph.

The substrate is deliberately genre-agnostic: a tutorial, an ADR, and a runbook
all share the same frontmatter spine, and only their `extensions` and
`conceptType` differ. That uniformity is what lets the rest of the suite treat
every artifact — regardless of genre — as one addressable, machine-readable unit.
It is *not* a content format and carries no prose; the body genre owns the words.

## How the skill produces one

`mif-frontmatter` carries the layered MIF schema as durable instructions plus
eval cases and emits the block other skills build on.

- **Climb from the floor.** The skill always satisfies L1 first, then climbs to
  L2 and L3 only as the drafting context supplies real detail — never inventing
  provenance or citations to reach a level the source does not support.
- **Eval cases.** The skill ships `evals/evals.json` exercising the L1-to-L3
  climb. As a substrate helper it carries no `templates/` exemplars; the
  `check-exemplars` gate (which proves `good-l1.md` at L1 and `good.md` at its
  target level) applies only to the genre skills.
- **Lossless projection.** The emitted YAML is required to round-trip to JSON-LD
  and back without loss; the [mif-validate](../mif-validate/) helper proves that
  round-trip before the document is considered done.

## When it is beneficial

Reach for `mif-frontmatter` whenever a document needs MIF-conformant metadata —
which, in this suite, is every document. It is invoked implicitly by every genre
skill, and directly when you are adding MIF metadata to an existing file or
raising a document from one level to the next. The L1-first discipline is the
value: it produces a valid, addressable artifact immediately and defers richer
metadata until it can be asserted truthfully.

There is no genre anti-trigger here because the helper has no genre — but do not
over-reach for a level the content cannot honestly support. An early draft with
no decided provenance belongs at L1 or L2; forcing an L3 PROV graph onto it
fabricates an audit trail. The cost is minimal: the floor is a handful of fields.

## Example

A how-to guide begins life with an L1 block — `id`, `type: procedural`, a
`title`, `created`/`modified`, and an `entity` name — enough for the round-trip
to pass. As the guide matures, the author adds `tags`, an `ontology` reference,
and `temporal` validity to reach L2, then a `provenance` graph and `citations`
to reach L3, at which point [mif-validate](../mif-validate/) confirms the
document is conformant at the claimed level.

## Provenance & citations

- **Genre source — the MIF specification:** the canonical schema, levels, and
  JSON-LD projection are defined at <https://mif-spec.dev>, built on
  [JSON-LD 1.1](https://www.w3.org/TR/json-ld11/) and the
  [PROV-O ontology](https://www.w3.org/TR/prov-o/).
- **Skill provenance:** authored by the `mif-frontmatter` skill in the mif-docs
  plugin, <https://github.com/modeled-information-format/mif-docs-plugin>; its
  exemplars and `evals/` define and verify the floor.
- **MIF conformance:** the block it emits is proven lossless and level-conformant
  by [mif-validate](../mif-validate/).
- **Index:** this skill is one entry in the [skills by purpose](../../skills-by-purpose/)
  catalog; its fellow helpers are
  [ears-acceptance-criteria](../ears-acceptance-criteria/) and
  [mif-validate](../mif-validate/), orchestrated by
  [doc-set-planner](../doc-set-planner/).
