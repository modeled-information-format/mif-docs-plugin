---
id: f3c0b22b-a8f5-5640-a50e-3e0fc300347f
type: semantic
created: '2026-06-30T12:00:00Z'
modified: '2026-06-30T12:00:00Z'
namespace: reference/skills
title: 'Skill reference: prd'
tags:
  - reference
  - mif-docs
  - skill
  - prd
  - requirements
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
    - '@id': urn:mif:skill:prd
      '@type': prov:Entity
citations:
  - '@type': Citation
    citationType: article
    citationRole: methodology
    title: 'Atlassian — How to create a product requirements document (PRD)'
    url: https://www.atlassian.com/agile/product-management/requirements
    accessed: '2026-06-30'
  - '@type': Citation
    citationType: specification
    citationRole: methodology
    title: 'EARS — the Easy Approach to Requirements Syntax (Alistair Mavin)'
    url: https://alistairmavin.com/ears/
    accessed: '2026-06-30'
  - '@type': Citation
    citationType: tool
    citationRole: source
    title: 'mif-docs — prd skill (SKILL.md)'
    url: https://github.com/modeled-information-format/mif-docs-plugin/tree/main/skills/prd
relationships:
  - type: relates-to
    target: urn:mif:d8972202-0b4d-52ea-89d7-90abe228e820
  - type: relates-to
    target: urn:mif:138f94bd-3adc-51e0-a23c-fa5ebedb5172
ontology:
  '@type': OntologyReference
  id: mif-docs
  version: 1.0.0
  uri: https://mif-spec.dev/ontologies/mif-docs
entity:
  name: 'Skill reference: prd'
  entity_type: reference-document
extensions:
  x-skill: prd
  x-genre-conceptType: semantic
  x-target-level: 3
  x-purpose-group: product-feature-specs
---

# Skill reference: `prd`

The `prd` skill authors one document genre: a **Product Requirements Document** — a
problem-first statement of what to build and why, with success metrics, explicit
non-goals, and functional requirements expressed as testable criteria. This
reference describes what that document type is, how the skill produces one, when it
earns its place, and the provenance and sources behind it.

| Property | Value |
| --- | --- |
| Authors | A Product Requirements Document |
| Purpose group | Product & feature specs |
| MIF `conceptType` | `semantic` |
| Target MIF level | 3 |
| Primary source | [Atlassian — PRD](https://www.atlassian.com/agile/product-management/requirements) |

## What this document type is

A PRD scopes a product or feature before design begins: it leads with the **problem**
and the user need, defines **success metrics** that say how the team will know it
worked, draws **non-goals** that fence the scope, and then lists the **functional
requirements** the solution must satisfy. PRDs have no single canonical standard;
the skill frames the widely-taught industry practice — represented here by
Atlassian's guidance — and sharpens it on one point: functional requirements are
written as **EARS** criteria (the Easy Approach to Requirements Syntax) so each
requirement is unambiguous and gradable identically by a human and an agent.

A PRD is therefore *not* a description of the technical *how*. Once the problem and
requirements are settled, the design belongs in a [feature-spec](../feature-spec/) or
a design doc, and a single hard-to-reverse choice belongs in an [adr](../adr/). The
PRD answers *what* and *why*; it deliberately stops short of prescribing the
implementation, leaving engineers room to design against clear, testable targets.

## How the skill produces one

`prd` is a genre skill: it carries the PRD pattern as durable instructions plus
exemplars, and writes the artifact over a MIF floor so the result is at once a
human-readable spec and a machine-conformant unit.

- **Pattern, made operational.** The skill encodes the problem-first structure —
  problem, success metrics, non-goals, requirements — and enforces EARS phrasing on
  the functional requirements, refusing anti-triggered work by redirecting the
  technical *how* to a feature-spec or design doc.
- **Exemplars set the bar.** Like every genre in the suite it ships `good-l1.md`
  (the MIF Level-1 floor), `good.md` (the Level-3 target), `bad.md` (a
  counter-example), and `evals/evals.json`. The `check-exemplars` gate proves
  `good-l1.md` validates at L1 and `good.md` at L3, so the pattern the skill teaches
  is itself continuously verified.
- **MIF projection.** The PRD is authored with MIF frontmatter (via the shared
  `mif-frontmatter` substrate) and a `conceptType` of `semantic`, reflecting that a
  requirements document is declarative knowledge about intent rather than a sequence
  of steps. `mif-validate` proves the Markdown ↔ JSON-LD round-trip is lossless before
  the document is considered done.

## When it is beneficial

Reach for `prd` at the **front of a build**, when the team needs to agree on the
problem, the measure of success, and the scope before anyone designs or estimates. A
good PRD prevents the most expensive class of mistake — building the wrong thing
well — by forcing the problem and its success metrics into writing and by drawing
non-goals that keep scope from creeping.

Do **not** use it to capture the technical design (that is a feature-spec or design
doc), to record a settled architectural decision (an ADR), or to enumerate
fine-grained implementation tasks. The cost of a PRD is the discipline of writing
testable requirements and honest non-goals; skip it only when the problem is trivial
or already universally understood.

## Example

A PRD titled *"Self-serve API key rotation"* opens with the problem — support tickets
to rotate compromised keys take days and frustrate customers — sets a success metric
(median rotation time under one minute, ticket volume down 80%), and lists non-goals
(no change to the key format, no bulk rotation in v1). Its functional requirements
read as EARS criteria — *"When a user requests rotation, the system shall issue a new
key and invalidate the old key within 60 seconds"* — each one a target an engineer
can design against and a tester can grade.

## Provenance & citations

- **Genre source — PRD practice:** the industry guidance on product requirements,
  <https://www.atlassian.com/agile/product-management/requirements>, with functional
  requirements sharpened into EARS criteria, <https://alistairmavin.com/ears/>.
- **Skill provenance:** authored by the `prd` skill in the mif-docs plugin,
  <https://github.com/modeled-information-format/mif-docs-plugin>; the skill's
  exemplars and `evals/` define and verify the pattern.
- **MIF conformance:** the document projects to canonical JSON-LD under the MIF
  specification, <https://mif-spec.dev>, and is proven lossless by `mif-validate`.
- **Index:** this skill is one entry in the [skills by purpose](../../skills-by-purpose/)
  catalog; its sibling product-and-feature-spec genre is
  [feature-spec](../feature-spec/).
