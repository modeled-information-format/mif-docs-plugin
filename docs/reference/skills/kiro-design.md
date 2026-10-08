---
id: 6f6fcc98-7ffa-58f4-b0b9-25edbbb38f84
type: semantic
created: '2026-06-30T12:00:00Z'
modified: '2026-06-30T12:00:00Z'
namespace: reference/skills
title: 'Skill reference: kiro-design'
tags:
  - reference
  - mif-docs
  - skill
  - kiro
  - design
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
    - '@id': urn:mif:skill:kiro-design
      '@type': prov:Entity
citations:
  - '@type': Citation
    citationType: specification
    citationRole: methodology
    title: Kiro — Specs
    url: https://kiro.dev/docs/specs/
    accessed: '2026-06-30'
  - '@type': Citation
    citationType: tool
    citationRole: source
    title: 'mif-docs — kiro-design skill (SKILL.md)'
    url: https://github.com/modeled-information-format/mif-docs-plugin/tree/main/skills/kiro-design
relationships:
  - type: relates-to
    target: urn:mif:d8972202-0b4d-52ea-89d7-90abe228e820
  - type: relates-to
    target: urn:mif:adda9d07-cdd9-5391-ba64-08188770c562
  - type: relates-to
    target: urn:mif:2afc8508-5ee4-570c-bbae-f52982c3703e
ontology:
  '@type': OntologyReference
  id: mif-docs
  version: 1.0.0
  uri: https://mif-spec.dev/ontologies/mif-docs
entity:
  name: 'Skill reference: kiro-design'
  entity_type: reference-document
extensions:
  x-skill: kiro-design
  x-genre-conceptType: semantic
  x-target-level: 3
  x-purpose-group: kiro-spec-set
---

# Skill reference: `kiro-design`

The `kiro-design` skill authors one document genre: the **`design.md`** of an AWS
Kiro three-document spec set. This reference describes what that document type is,
how the skill produces one, when it earns its place, and the provenance and
sources behind it.

| Property | Value |
| --- | --- |
| Authors | The `design.md` of a Kiro spec set |
| Purpose group | Kiro spec set |
| MIF `conceptType` | `semantic` |
| Target MIF level | 3 |
| Primary source | [Kiro — Specs](https://kiro.dev/docs/specs/) |

## What this document type is

`design.md` is the **second** of the three linked Kiro artifacts. Where
[kiro-requirements](../kiro-requirements/) states *what* the feature must do,
`design.md` states *how* it will be built — the technical design that turns
numbered requirements into an implementable shape. It typically covers the
architecture and components, data models and interfaces, the sequence of
interactions, error handling, and the testing strategy, at whatever depth the
feature warrants. Its defining discipline is **traceability backward**: every
design element cites the requirement number it satisfies, so a reviewer can confirm
that the design covers all requirements and introduces nothing the requirements do
not justify.

This document is *not* the requirements themselves — the *what* lives in
`requirements.md`. It is *not* the build plan — the ordered, checkbox
implementation steps live in [kiro-tasks](../kiro-tasks/), which trace forward
from this design. `design.md` is the hinge of the set: it consumes requirement
numbers and emits design decisions that the task list then sequences into work.

## How the skill produces one

`kiro-design` is a genre skill: it carries the Kiro design pattern as durable
instructions plus exemplars, and writes the artifact over a MIF floor so the
result is at once a readable design and a machine-conformant unit.

- **Pattern, made operational.** The skill encodes the design sections —
  architecture, components, data, sequencing, error handling, testing — and
  enforces that each design choice references the requirement number it serves,
  refusing anti-triggered work (the *what* belongs in `kiro-requirements`; the
  task list belongs in `kiro-tasks`).
- **Traceability.** Because design elements bind to requirement IDs, the set
  stays coherent: missing coverage and orphan design both become visible by
  comparison against `requirements.md`.
- **Exemplars set the bar.** Like every genre in the suite it ships `good-l1.md`
  (the MIF Level-1 floor), `good.md` (the target level — Level 3 here),
  `bad.md` (a counter-example), and `evals/evals.json`. The `check-exemplars`
  gate proves `good-l1.md` validates at L1 and `good.md` at its target level.
- **MIF projection.** The document is authored with MIF frontmatter (via the
  shared `mif-frontmatter` substrate) and a `conceptType` of `semantic`,
  reflecting that a design asserts structural facts rather than performed steps.
  `mif-validate` proves the Markdown to JSON-LD round-trip is lossless before
  the document is considered done.

## When it is beneficial

Reach for `kiro-design` once requirements are agreed and you need to settle the
technical approach before generating work. Its value is that it makes the design
**reviewable against the requirements**: a stakeholder can check coverage and a
coding agent can read a structured design rather than inferring one from prose.

Do **not** use it before requirements exist — the design has nothing to trace
back to. Do not use it to enumerate the build steps; that is
[kiro-tasks](../kiro-tasks/). For a one-off architectural narrative outside the
Kiro workflow, a Google-style design doc or an arc42 document is a better fit. The
cost of the genre is the upkeep of the traceability links as requirements shift.

## Example

A `design.md` for a password-reset feature opens with an overview, then an
architecture section describing the reset-token service and the mail dispatcher,
a data-model section defining the token record and its expiry, and a sequence
section walking the request-link-redeem flow. Each subsection annotates which
requirement it satisfies — "satisfies Requirement 1 and Requirement 2" — and an
error-handling section maps the unwanted-behaviour EARS criteria from
`requirements.md` onto concrete failure responses.

## Provenance & citations

- **Genre source — Kiro specs:** the canonical definition of the three-document
  spec workflow and the role of `design.md` within it,
  <https://kiro.dev/docs/specs/>.
- **Skill provenance:** authored by the `kiro-design` skill in the mif-docs
  plugin, <https://github.com/modeled-information-format/mif-docs-plugin>; the
  skill's exemplars and `evals/` define and verify the pattern.
- **MIF conformance:** the document projects to canonical JSON-LD under the MIF
  specification, <https://mif-spec.dev>, and is proven lossless by `mif-validate`.
- **Index:** this skill is one entry in the [skills by purpose](../../skills-by-purpose/)
  catalog; its sibling spec-set members are
  [kiro-requirements](../kiro-requirements/) and [kiro-tasks](../kiro-tasks/).
