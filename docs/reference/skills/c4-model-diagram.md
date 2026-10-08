---
id: 50ca956f-6106-572b-a166-6822a49c414e
type: semantic
created: '2026-06-30T12:00:00Z'
modified: '2026-06-30T12:00:00Z'
namespace: reference/skills
title: 'Skill reference: c4-model-diagram'
tags:
  - reference
  - mif-docs
  - skill
  - c4-model
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
    - '@id': urn:mif:skill:c4-model-diagram
      '@type': prov:Entity
citations:
  - '@type': Citation
    citationType: specification
    citationRole: methodology
    title: The C4 model for visualising software architecture (Simon Brown)
    url: https://c4model.com/
    accessed: '2026-06-30'
  - '@type': Citation
    citationType: tool
    citationRole: source
    title: Mermaid — C4 diagram syntax
    url: https://mermaid.js.org/syntax/c4.html
    accessed: '2026-06-30'
  - '@type': Citation
    citationType: tool
    citationRole: source
    title: 'mif-docs — c4-model-diagram skill (SKILL.md)'
    url: https://github.com/modeled-information-format/mif-docs-plugin/tree/main/skills/c4-model-diagram
relationships:
  - type: relates-to
    target: urn:mif:d8972202-0b4d-52ea-89d7-90abe228e820
  - type: relates-to
    target: urn:mif:2685127d-b9da-51df-b69e-d2c20ab7b205
  - type: relates-to
    target: urn:mif:b2030d2f-0690-55f3-a64e-de659e0962f0
  - type: relates-to
    target: urn:mif:f3aeebe9-1d88-5fd4-a18f-237fb79e69d1
ontology:
  '@type': OntologyReference
  id: mif-docs
  version: 1.0.0
  uri: https://mif-spec.dev/ontologies/mif-docs
entity:
  name: 'Skill reference: c4-model-diagram'
  entity_type: reference-document
extensions:
  x-skill: c4-model-diagram
  x-genre-conceptType: semantic
  x-target-level: 3
  x-purpose-group: architecture-design
---

# Skill reference: `c4-model-diagram`

The `c4-model-diagram` skill authors one document genre: a **C4 model
architecture document** — Simon Brown's four levels of abstraction rendered as
notation-independent Mermaid C4 diagrams plus an element catalog. This reference
describes what that document type is, how the skill produces one, when it earns
its place, and the provenance and sources behind it.

| Property | Value |
| --- | --- |
| Authors | A C4 model document (diagrams + element catalog) |
| Purpose group | Architecture design |
| MIF `conceptType` | `semantic` |
| Target MIF level | 3 |
| Primary source | [The C4 model](https://c4model.com/) |

## What this document type is

The C4 model describes software architecture as a hierarchy of **four levels of
abstraction**, each a zoom step into the level above. *System Context* shows the
system as a single box among its users and the other systems it talks to.
*Container* opens that box into separately deployable or runnable units — web
apps, services, databases, message brokers. *Component* opens one container into
its major structural pieces and their responsibilities. *Code* — used sparingly —
drops to class-level detail where it adds value. The model's discipline is that
each diagram answers exactly one question at one zoom level, so a reader is never
shown too much or too little at once.

C4 is deliberately **notation-independent**: the levels are the model, and any
notation can render them. This skill renders them as Mermaid C4 diagrams so the
source is plain text that lives and diffs alongside the docs, paired with an
**element catalog** that names every person, software system, container, and
component with its responsibility. A C4 document is *not* a decision record — a
choice belongs in an [adr](../adr/) — and not a single sequence or deployment
view in isolation. Because it is structural knowledge, it projects to MIF as
`semantic` content at Level 3.

## How the skill produces one

`c4-model-diagram` is a genre skill: it carries the C4 pattern as durable
instructions plus exemplars, and writes the artifact over a MIF floor so the
result is at once human-readable diagrams and a machine-conformant unit.

- **Pattern, made operational.** The skill encodes the four levels, the
  one-question-per-diagram discipline, and the paired element catalog, and refuses
  anti-triggered work (a decision belongs in an ADR; a lone sequence or deployment
  view belongs in its own diagram genre).
- **Exemplars set the bar.** Like every genre in the suite it ships `good-l1.md`
  (the MIF Level-1 floor), `good.md` (the Level-3 target), `bad.md` (a
  counter-example), and `evals/evals.json`. The `check-exemplars` gate proves
  `good-l1.md` validates at L1 and `good.md` at Level 3, keeping the taught
  pattern continuously verified.
- **MIF projection.** The document is authored with MIF frontmatter (via the
  shared `mif-frontmatter` substrate) and a `conceptType` of `semantic`, and the
  Mermaid diagrams round-trip as plain text. `mif-validate` proves the Markdown ↔
  JSON-LD round-trip is lossless before the document is considered done.

## When it is beneficial

Reach for `c4-model-diagram` when you must **communicate architecture to a mixed
audience** at the zoom level each viewer needs: a System Context diagram for
executives and product, Container and Component diagrams for engineers. The
hierarchy lets one document serve everyone without drowning non-technical readers
in detail or starving engineers of it, and the text-based Mermaid source keeps the
diagrams version-controlled and reviewable.

Do **not** use it to record a point-in-time decision and its trade-offs — that is
an [adr](../adr/). Do not use it when the goal is a single sequence/data-flow or a
deployment-only view; reach for the matching diagram genre instead. When you need
the whole-system narrative around the diagrams, the
[arc42-arch-doc](../arc42-arch-doc/) genre embeds C4 views inside its context and
building-block sections, and a machine-first spec belongs in
[ai-architecture-doc](../ai-architecture-doc/). The cost of C4 is upkeep: diagrams
drift from reality fastest, so keep the level count small and the catalog current.

## Example

A C4 document titled *"MIF docs platform — C4 views"* opens with a System Context
diagram placing the platform between authors, readers, and the MIF validator,
then a Container diagram resolving it into the docs site, the conversion CLI, and
the schema store, then a Component diagram of the converter's parser, projector,
and round-trip checker. An element catalog table lists each box with a one-line
responsibility, and the Code level is omitted because nothing at class level
needs explaining.

## Provenance & citations

- **Genre source — the C4 model:** Simon Brown's four-level model for visualising
  software architecture, <https://c4model.com/>, rendered with Mermaid's C4 syntax,
  <https://mermaid.js.org/syntax/c4.html>.
- **Skill provenance:** authored by the `c4-model-diagram` skill in the mif-docs
  plugin, <https://github.com/modeled-information-format/mif-docs-plugin>; the
  skill's exemplars and `evals/` define and verify the pattern.
- **MIF conformance:** the document projects to canonical JSON-LD under the MIF
  specification, <https://mif-spec.dev>, and is proven lossless by `mif-validate`.
- **Index:** this skill is one entry in the [skills by purpose](../../skills-by-purpose/)
  catalog; its architecture-design siblings are
  [arc42-arch-doc](../arc42-arch-doc/),
  [google-design-doc](../google-design-doc/), and
  [ai-architecture-doc](../ai-architecture-doc/).
