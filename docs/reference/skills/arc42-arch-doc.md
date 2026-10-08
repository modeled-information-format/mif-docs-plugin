---
id: 2685127d-b9da-51df-b69e-d2c20ab7b205
type: semantic
created: '2026-06-30T12:00:00Z'
modified: '2026-06-30T12:00:00Z'
namespace: reference/skills
title: 'Skill reference: arc42-arch-doc'
tags:
  - reference
  - mif-docs
  - skill
  - arc42
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
    - '@id': urn:mif:skill:arc42-arch-doc
      '@type': prov:Entity
citations:
  - '@type': Citation
    citationType: specification
    citationRole: methodology
    title: arc42 — the template for architecture communication and documentation
    url: https://arc42.org/
    accessed: '2026-06-30'
  - '@type': Citation
    citationType: specification
    citationRole: source
    title: arc42 overview — the twelve sections
    url: https://arc42.org/overview
    accessed: '2026-06-30'
  - '@type': Citation
    citationType: tool
    citationRole: source
    title: 'mif-docs — arc42-arch-doc skill (SKILL.md)'
    url: https://github.com/modeled-information-format/mif-docs-plugin/tree/main/skills/arc42-arch-doc
relationships:
  - type: relates-to
    target: urn:mif:d8972202-0b4d-52ea-89d7-90abe228e820
  - type: relates-to
    target: urn:mif:50ca956f-6106-572b-a166-6822a49c414e
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
  name: 'Skill reference: arc42-arch-doc'
  entity_type: reference-document
extensions:
  x-skill: arc42-arch-doc
  x-genre-conceptType: semantic
  x-target-level: 3
  x-purpose-group: architecture-design
---

# Skill reference: `arc42-arch-doc`

The `arc42-arch-doc` skill authors one document genre: an **arc42 architecture
document** — the twelve-section template that captures a system's architecture as
durable, declarative knowledge. This reference describes what that document type
is, how the skill produces one, when it earns its place, and the provenance and
sources behind it.

| Property | Value |
| --- | --- |
| Authors | A full arc42 software architecture document (SAD) |
| Purpose group | Architecture design |
| MIF `conceptType` | `semantic` |
| Target MIF level | 3 |
| Primary source | [arc42](https://arc42.org/) |

## What this document type is

arc42 is an open template for describing and communicating software and system
architectures. Its defining property is a **fixed twelve-section structure** that
gives every system the same drawer for every kind of architectural knowledge:
introduction and goals, constraints, context and scope, solution strategy,
building-block view, runtime view, deployment view, cross-cutting concepts,
architecture decisions, quality requirements, risks and technical debt, and a
glossary. The sections move from the abstract — what the system must achieve and
under what constraints — down to concrete structure, behaviour, and the decisions
that shaped them. The template is deliberately notation- and tool-agnostic: it
prescribes *what* to record, not *how* to draw it.

An arc42 document is therefore *not* a single decision record — one consequential
choice belongs in an [adr](../adr/) — and *not* a step-by-step procedure, which is
a runbook or how-to. It is the durable, whole-system reference an architect
maintains over the life of the system. Because it is descriptive knowledge rather
than performed steps, it projects to MIF as `semantic` content at Level 3.

## How the skill produces one

`arc42-arch-doc` is a genre skill: it carries the arc42 template as durable
instructions plus exemplars, and writes the artifact over a MIF floor so the
result is at once a human-readable SAD and a machine-conformant unit.

- **Pattern, made operational.** The skill encodes the twelve sections and their
  intent — goals before structure, building blocks before runtime, decisions
  recorded with their forces — and refuses anti-triggered work (a lone decision
  belongs in an ADR; operational steps belong in a runbook).
- **Exemplars set the bar.** Like every genre in the suite it ships `good-l1.md`
  (the MIF Level-1 floor), `good.md` (the Level-3 target), `bad.md` (a
  counter-example), and `evals/evals.json`. The `check-exemplars` gate proves
  `good-l1.md` validates at L1 and `good.md` at Level 3, so the pattern the skill
  teaches is itself continuously verified.
- **MIF projection.** The document is authored with MIF frontmatter (via the
  shared `mif-frontmatter` substrate) and a `conceptType` of `semantic`,
  reflecting that an architecture description is structural knowledge rather than a
  sequence of steps. `mif-validate` proves the Markdown ↔ JSON-LD round-trip is
  lossless before the document is considered done.

## When it is beneficial

Reach for `arc42-arch-doc` when you need the whole picture of a system in one
durable place: onboarding new engineers, surviving team turnover, passing an
architecture review, or giving a coding agent a complete structural map. The
fixed sections make gaps visible — an empty "quality requirements" or "risks"
drawer is itself a finding — and give every reader a predictable place to look.

Do **not** use it to capture a single decision and its trade-offs; that is an
[adr](../adr/), which is smaller and immutable once accepted. Do not use it when
the deliverable is diagrams at varying zoom levels for a mixed audience — that is
the [c4-model-diagram](../c4-model-diagram/) genre, which arc42's building-block
and context views happily embed. And for a machine-first spec a coding agent
consumes — arc42 structure plus testable NFRs and a decision log in one artifact —
prefer [ai-architecture-doc](../ai-architecture-doc/). The cost of arc42 is
breadth: a full SAD is a substantial document to write and to keep current, so use
it where the whole-system view repays the upkeep.

## Example

An arc42 document titled *"MIF conversion service — architecture"* opens with the
quality goals (lossless round-trip, deterministic validation) and the stakeholders
who care about them, states the constraints (Node runtime, JSON Schema 2020-12),
sketches the system context, then descends through the building-block view of the
converter and validator down to the runtime and deployment views. A
cross-cutting-concepts section records how provenance and versioning are handled
uniformly, a decisions section links the ADRs behind each major choice, and the
quality-requirements section lists scenarios a reviewer can test against.

## Provenance & citations

- **Genre source — arc42:** the canonical template for architecture communication
  and documentation, <https://arc42.org/>, and its twelve-section overview,
  <https://arc42.org/overview>.
- **Skill provenance:** authored by the `arc42-arch-doc` skill in the mif-docs
  plugin, <https://github.com/modeled-information-format/mif-docs-plugin>; the
  skill's exemplars and `evals/` define and verify the pattern.
- **MIF conformance:** the document projects to canonical JSON-LD under the MIF
  specification, <https://mif-spec.dev>, and is proven lossless by `mif-validate`.
- **Index:** this skill is one entry in the [skills by purpose](../../skills-by-purpose/)
  catalog; its architecture-design siblings are
  [c4-model-diagram](../c4-model-diagram/),
  [google-design-doc](../google-design-doc/), and
  [ai-architecture-doc](../ai-architecture-doc/).
