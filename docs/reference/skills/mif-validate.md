---
id: reference-skill-mif-validate
type: semantic
created: '2026-06-30T12:00:00Z'
modified: '2026-07-12T02:37:45.074Z'
namespace: reference/skills
title: 'Skill reference: mif-validate'
tags:
  - reference
  - mif-docs
  - skill
  - mif
  - validation
temporal:
  '@type': TemporalMetadata
  validFrom: '2026-06-30T00:00:00Z'
  recordedAt: '2026-06-30T12:00:00Z'
  ttl: P1Y
provenance:
  '@type': Provenance
  sourceType: agent_inferred
  trustLevel: user_stated
  agent: claude-code/claude-sonnet-5
  wasAttributedTo:
    '@id': https://github.com/modeled-information-format
    '@type': prov:Agent
  wasGeneratedBy:
    '@id': urn:mif:activity:claude-code-session:0baec4b0-123e-4559-a4cb-5342f36006c2
    '@type': prov:Activity
  wasDerivedFrom:
    - '@id': https://github.com/modeled-information-format/mif-docs-plugin
      '@type': prov:Entity
    - '@id': urn:mif:skill:mif-validate
      '@type': prov:Entity
  agentVersion: 2.1.207
citations:
  - '@type': Citation
    citationType: specification
    citationRole: methodology
    title: MIF — Modeled Information Format specification
    url: https://mif-spec.dev
    accessed: '2026-06-30'
  - '@type': Citation
    citationType: specification
    citationRole: background
    title: JSON Schema 2020-12 specification
    url: https://json-schema.org/specification
    accessed: '2026-06-30'
  - '@type': Citation
    citationType: tool
    citationRole: methodology
    title: Ajv — JSON Schema validator
    url: https://ajv.js.org/
    accessed: '2026-06-30'
  - '@type': Citation
    citationType: tool
    citationRole: source
    title: 'mif-docs — mif-validate skill (SKILL.md)'
    url: https://github.com/modeled-information-format/mif-docs-plugin/tree/main/skills/mif-validate
relationships:
  - type: relates-to
    target: urn:mif:reference-skills-by-purpose
  - type: relates-to
    target: urn:mif:reference-skill-mif-frontmatter
  - type: relates-to
    target: urn:mif:reference-skill-ears-acceptance-criteria
  - type: relates-to
    target: urn:mif:reference-skill-doc-set-planner
ontology:
  '@type': OntologyReference
  id: mif-docs
  version: 1.0.0
  uri: https://mif-spec.dev/ontologies/mif-docs
entity:
  name: 'Skill reference: mif-validate'
  entity_type: reference-document
extensions:
  x-skill: mif-validate
  x-genre-conceptType: substrate
  x-target-level: 3
  x-purpose-group: authoring-helpers
---

# Skill reference: `mif-validate`

The `mif-validate` skill is a **substrate helper**: it is the gate that proves a
document is MIF-conformant, rather than a genre that authors prose. This
reference describes what that proof consists of, how the skill produces it, when
it runs, and the sources behind it.

| Property | Value |
| --- | --- |
| Authors | A deterministic MIF-conformance verdict (and form conversion) |
| Purpose group | Authoring helpers |
| MIF `conceptType` | `substrate` |
| Target MIF level | 3 |
| Primary source | [MIF specification](https://mif-spec.dev) |

## What this document type is

`mif-validate` produces a verdict, not a document: a deterministic statement that
a given file is — or is not — MIF-conformant at a stated level. The verdict rests
on three independent checks. First, it projects the document's frontmatter to
canonical JSON-LD and validates that against the published
[MIF schema](https://mif-spec.dev) using [Ajv](https://ajv.js.org/) under
[JSON Schema 2020-12](https://json-schema.org/specification). Second, it enforces
the **level floor** — that an L1, L2, or L3 claim is backed by the fields that
level requires. Third, it verifies the **Markdown ↔ JSON-LD round-trip is
lossless**, converting the document to JSON-LD and back and asserting the result
is byte-identical to the source.

That third check is what makes MIF trustworthy: it guarantees the machine
projection and the human document are two views of one artifact, with nothing
added or dropped in either direction. The skill also converts a document to
either output form on demand, so the JSON-LD projection can be emitted for
downstream tooling. It is *not* a linter of prose quality and *not* a genre
author; it judges conformance and nothing else.

## How the skill produces one

`mif-validate` carries the conformance procedure as durable instructions plus the
validator scripts the suite runs in its gates.

- **Schema check.** The JSON-LD projection is validated against the canonical
  schema with Ajv; any structural or enum violation fails the verdict — as the
  fail-closed guard does when an author writes a non-conformant block.
- **Level floor.** The skill confirms the document carries every field its
  claimed level demands: **L1** requires `id`, `type`, and `created`; **L2**
  additionally requires `namespace`, `modified`, and `temporal`; **L3**
  additionally requires `provenance` and `temporal.validFrom` — refusing, for
  example, an L3 claim that lacks a provenance graph.
- **Round-trip proof.** It runs the lossless Markdown ↔ JSON-LD conversion and
  rejects any document whose round-trip is not exact, which constrains authors to
  the constructs proven to round-trip.
- **Eval cases.** The skill ships `evals/evals.json` exercising conformant and
  non-conformant inputs. As a substrate helper it carries no `templates/`
  exemplars; the `check-exemplars` gate applies only to the genre skills, not to
  the validator itself.

## When it is beneficial

Run `mif-validate` as the **final gate** after authoring or editing any MIF
document, and whenever you need to emit a document's JSON-LD form. It is the
companion to [mif-frontmatter](../mif-frontmatter/): the former writes the
metadata, the latter proves it. Because the verdict is deterministic, it can run
in CI and block a non-conformant change automatically.

There is no genre anti-trigger — the helper validates every genre — but it is not
a substitute for human review of content: a document can be perfectly conformant
and still poorly written. Use it for conformance, not editorial quality.

## Example

After drafting an ADR, the author runs `mif-validate` at level 3. It projects the
frontmatter to JSON-LD, validates it against the MIF schema, confirms the L3
provenance and citations are present, and verifies the round-trip is lossless,
emitting a single VALID verdict — or a precise list of failures to fix.

## Provenance & citations

- **Genre source — the MIF specification:** the schema and levels validated
  against live at <https://mif-spec.dev>, checked with
  [Ajv](https://ajv.js.org/) under
  [JSON Schema 2020-12](https://json-schema.org/specification).
- **Skill provenance:** authored by the `mif-validate` skill in the mif-docs
  plugin, <https://github.com/modeled-information-format/mif-docs-plugin>; its
  scripts back the suite's conformance gates.
- **MIF conformance:** this document itself is proven lossless and L3-conformant
  by the very check it documents.
- **Index:** one entry in the [skills by purpose](../../skills-by-purpose/)
  catalog; its fellow helpers are [mif-frontmatter](../mif-frontmatter/) and
  [ears-acceptance-criteria](../ears-acceptance-criteria/), orchestrated by
  [doc-set-planner](../doc-set-planner/).
