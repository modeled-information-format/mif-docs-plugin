---
id: f3aeebe9-1d88-5fd4-a18f-237fb79e69d1
type: semantic
created: '2026-06-30T12:00:00Z'
modified: '2026-06-30T12:00:00Z'
namespace: reference/skills
title: 'Skill reference: ai-architecture-doc'
tags:
  - reference
  - mif-docs
  - skill
  - ai-spec
  - architecture
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
    - '@id': urn:mif:skill:ai-architecture-doc
      '@type': prov:Entity
citations:
  - '@type': Citation
    citationType: specification
    citationRole: methodology
    title: arc42 — architecture template
    url: https://arc42.org/
    accessed: '2026-06-30'
  - '@type': Citation
    citationType: specification
    citationRole: background
    title: The C4 model for visualising software architecture
    url: https://c4model.com/
    accessed: '2026-06-30'
  - '@type': Citation
    citationType: specification
    citationRole: background
    title: MADR — Markdown Architectural Decision Records
    url: https://adr.github.io/madr/
    accessed: '2026-06-30'
  - '@type': Citation
    citationType: specification
    citationRole: background
    title: EARS — Easy Approach to Requirements Syntax (Alistair Mavin)
    url: https://alistairmavin.com/ears/
    accessed: '2026-06-30'
  - '@type': Citation
    citationType: tool
    citationRole: source
    title: 'mif-docs — ai-architecture-doc skill (SKILL.md)'
    url: https://github.com/modeled-information-format/mif-docs-plugin/tree/main/skills/ai-architecture-doc
relationships:
  - type: relates-to
    target: urn:mif:d8972202-0b4d-52ea-89d7-90abe228e820
  - type: relates-to
    target: urn:mif:2685127d-b9da-51df-b69e-d2c20ab7b205
  - type: relates-to
    target: urn:mif:50ca956f-6106-572b-a166-6822a49c414e
  - type: relates-to
    target: urn:mif:b2030d2f-0690-55f3-a64e-de659e0962f0
ontology:
  '@type': OntologyReference
  id: mif-docs
  version: 1.0.0
  uri: https://mif-spec.dev/ontologies/mif-docs
entity:
  name: 'Skill reference: ai-architecture-doc'
  entity_type: reference-document
extensions:
  x-skill: ai-architecture-doc
  x-genre-conceptType: semantic
  x-target-level: 3
  x-purpose-group: architecture-design
---

# Skill reference: `ai-architecture-doc`

The `ai-architecture-doc` skill authors one document genre: a **composite AI-spec
architecture document** — one spec-channel artifact that embeds an arc42/C4-style
structure plus testable non-functional requirements and an ADR-style decision log.
This reference describes what that document type is, how the skill produces one,
when it earns its place, and the provenance and sources behind it.

| Property | Value |
| --- | --- |
| Authors | A composite AI-spec architecture document |
| Purpose group | Architecture design |
| MIF `conceptType` | `semantic` |
| Target MIF level | 3 |
| Primary source | [arc42](https://arc42.org/) |

## What this document type is

An AI-architecture doc is a **composite, machine-first** architecture spec: it
combines, in a single artifact, the three things a coding agent needs to build
correctly. From arc42 and C4 it takes **structure** — context, building blocks,
and the relationships between them — so the agent knows the shape of the system.
From [EARS](https://alistairmavin.com/ears/) it takes **testable non-functional
requirements** — latency, availability, security, and the like, each written so a
human and an agent grade it identically rather than as vague prose. From
[MADR](https://adr.github.io/madr/) it takes an **ADR-style decision log** — the
constraints already decided, with their rationale, so the agent does not relitigate
settled choices. The result is one spec-channel document optimised to be consumed,
not just read: unambiguous structure, gradeable requirements, and pinned decisions.

It is therefore *not* a pure human narrative — for that, write an
[arc42-arch-doc](../arc42-arch-doc/) — and *not* a set of diagrams alone, which is
[c4-model-diagram](../c4-model-diagram/). It is the deliberately composite form,
and it projects to MIF as `semantic` content at Level 3, where the structure,
requirements, and decisions all become addressable.

## How the skill produces one

`ai-architecture-doc` is a genre skill: it carries the composite pattern as durable
instructions plus exemplars, and writes the artifact over a MIF floor so the result
is at once human-readable and agent-consumable.

- **Pattern, made operational.** The skill encodes the three embedded layers —
  arc42/C4 structure, EARS non-functional requirements, an ADR-style decision log —
  and refuses anti-triggered work (a pure narrative belongs in arc42-arch-doc;
  diagrams alone belong in c4-model-diagram).
- **Exemplars set the bar.** Like every genre in the suite it ships `good-l1.md`
  (the MIF Level-1 floor), `good.md` (the Level-3 target), `bad.md` (a
  counter-example), and `evals/evals.json`. The `check-exemplars` gate proves
  `good-l1.md` validates at L1 and `good.md` at Level 3, keeping the taught pattern
  continuously verified.
- **MIF projection.** The document is authored with MIF frontmatter (via the shared
  `mif-frontmatter` substrate) and a `conceptType` of `semantic`; the EARS criteria
  draw on the `ears-acceptance-criteria` substrate so each requirement is gradeable.
  `mif-validate` proves the Markdown ↔ JSON-LD round-trip is lossless before the
  document is considered done.

## When it is beneficial

Reach for `ai-architecture-doc` when the primary consumer of the architecture is a
**coding agent** and you want it to build to spec without inventing structure,
guessing at quality targets, or reopening decided trade-offs. It is the right
genre when structure, testable NFRs, and pinned decisions all need to travel
together as one authoritative artifact — for example, the architecture handed to an
agent at the start of an implementation task.

Do **not** use it when the audience is human and the goal is understanding or
review; a [arc42-arch-doc](../arc42-arch-doc/) narrative or a
[google-design-doc](../google-design-doc/) is friendlier for that. Do not use it
when you only need diagrams at varying zoom — that is
[c4-model-diagram](../c4-model-diagram/). The cost of the composite form is that it
carries three concerns at once: it is denser to write and to keep coherent, so use
it where the machine-first payoff justifies maintaining structure, requirements,
and decisions in lockstep.

## Example

An AI-architecture doc titled *"MIF conversion service — agent spec"* opens with a
C4-style context and building-block view of the parser, projector, and round-trip
checker, then lists EARS non-functional requirements ("WHEN a document is
converted, the service SHALL reproduce the source byte-for-byte on round-trip"),
then an ADR-style log pinning the settled constraints (JSON Schema 2020-12, the
stable unversioned `$id`). A coding agent reads it and implements the converter
without re-deriving the structure or re-deciding the schema dialect.

## Provenance & citations

- **Genre sources:** the composite draws structure from arc42, <https://arc42.org/>,
  and the C4 model, <https://c4model.com/>; testable requirements from EARS,
  <https://alistairmavin.com/ears/>; and a decision log from MADR,
  <https://adr.github.io/madr/>.
- **Skill provenance:** authored by the `ai-architecture-doc` skill in the mif-docs
  plugin, <https://github.com/modeled-information-format/mif-docs-plugin>; the
  skill's exemplars and `evals/` define and verify the pattern.
- **MIF conformance:** the document projects to canonical JSON-LD under the MIF
  specification, <https://mif-spec.dev>, and is proven lossless by `mif-validate`.
- **Index:** this skill is one entry in the [skills by purpose](../../skills-by-purpose/)
  catalog; its architecture-design siblings are
  [arc42-arch-doc](../arc42-arch-doc/),
  [c4-model-diagram](../c4-model-diagram/), and
  [google-design-doc](../google-design-doc/).
