---
id: 2afc8508-5ee4-570c-bbae-f52982c3703e
type: semantic
created: '2026-06-30T12:00:00Z'
modified: '2026-06-30T12:00:00Z'
namespace: reference/skills
title: 'Skill reference: kiro-tasks'
tags:
  - reference
  - mif-docs
  - skill
  - kiro
  - tasks
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
    - '@id': urn:mif:skill:kiro-tasks
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
    title: 'mif-docs — kiro-tasks skill (SKILL.md)'
    url: https://github.com/modeled-information-format/mif-docs-plugin/tree/main/skills/kiro-tasks
relationships:
  - type: relates-to
    target: urn:mif:d8972202-0b4d-52ea-89d7-90abe228e820
  - type: relates-to
    target: urn:mif:adda9d07-cdd9-5391-ba64-08188770c562
  - type: relates-to
    target: urn:mif:6f6fcc98-7ffa-58f4-b0b9-25edbbb38f84
ontology:
  '@type': OntologyReference
  id: mif-docs
  version: 1.0.0
  uri: https://mif-spec.dev/ontologies/mif-docs
entity:
  name: 'Skill reference: kiro-tasks'
  entity_type: reference-document
extensions:
  x-skill: kiro-tasks
  x-genre-conceptType: procedural
  x-target-level: 2
  x-purpose-group: kiro-spec-set
---

# Skill reference: `kiro-tasks`

The `kiro-tasks` skill authors one document genre: the **`tasks.md`** of an AWS
Kiro three-document spec set. This reference describes what that document type is,
how the skill produces one, when it earns its place, and the provenance and
sources behind it.

| Property | Value |
| --- | --- |
| Authors | The `tasks.md` of a Kiro spec set |
| Purpose group | Kiro spec set |
| MIF `conceptType` | `procedural` |
| Target MIF level | 2 |
| Primary source | [Kiro — Specs](https://kiro.dev/docs/specs/) |

## What this document type is

`tasks.md` is the **third** and final Kiro artifact — the implementation plan that
turns the design into work. It is a numbered, checkbox list of tasks, sequenced so
that each builds on the last. Its defining properties are that every task is
**small** (a self-contained increment a developer or coding agent can complete and
verify), **test-driven** (the task names the test or behaviour that proves it is
done), and **traceable** (it cites the design element and requirement number it
implements). The checkbox form is not decoration: it makes the plan a live
progress record that an agent can drive top to bottom, checking off completed work.

This document is *not* the requirements — the *what* lives in
[kiro-requirements](../kiro-requirements/) — and *not* the design — the *how* lives
in [kiro-design](../kiro-design/). `tasks.md` is purely the ordered execution of
that design. It carries a `procedural` conceptType precisely because it is a
sequence of performed steps rather than an assertion of facts.

## How the skill produces one

`kiro-tasks` is a genre skill: it carries the Kiro task-list pattern as durable
instructions plus exemplars, and writes the artifact over a MIF floor so the
result is at once a runnable plan and a machine-conformant unit.

- **Pattern, made operational.** The skill encodes the constraints — small,
  test-driven, ordered tasks rendered as a checkbox list — and enforces that each
  task traces to the design and requirement it implements, refusing anti-triggered
  work (requirements belong in `kiro-requirements`; design belongs in
  `kiro-design`).
- **Test-driven by construction.** Each task names the verification that closes
  it, so the plan doubles as an acceptance checklist rather than a vague to-do.
- **Exemplars set the bar.** Like every genre in the suite it ships `good-l1.md`
  (the MIF Level-1 floor), `good.md` (the target level — Level 2 here),
  `bad.md` (a counter-example), and `evals/evals.json`. The `check-exemplars`
  gate proves `good-l1.md` validates at L1 and `good.md` at its target level.
- **MIF projection.** The document is authored with MIF frontmatter (via the
  shared `mif-frontmatter` substrate) and a `conceptType` of `procedural`,
  reflecting that a task list is a sequence of performed steps. `mif-validate`
  proves the Markdown to JSON-LD round-trip is lossless before the document is
  considered done.

## When it is beneficial

Reach for `kiro-tasks` once the design is settled and you want an executable
plan — especially when a coding agent will do the building. Its value is that it
converts a design into a sequence of small, verifiable increments, each of which a
reviewer can check and an agent can complete without re-deriving the plan.

Do **not** use it before a design exists; the tasks have nothing to trace back to
and risk encoding decisions that belong in `kiro-design`. Do not use it as a
general project tracker — it is scoped to one feature's spec set. The cost of the
genre is keeping the task list in step with the design as it evolves, since stale
tasks point at design elements that have changed.

## Example

A `tasks.md` for a password-reset feature lists Task 1 ("Create the reset-token
model and migration — verify with a unit test asserting expiry defaults"), Task 2
("Implement the request-link endpoint — test the 60-second send criterion and the
non-disclosure path"), and so on, each as an unchecked checkbox item annotated
with the design element and requirement it implements. An agent works the list in
order, checking each box as its named test passes.

## Provenance & citations

- **Genre source — Kiro specs:** the canonical definition of the three-document
  spec workflow and the role of `tasks.md` within it,
  <https://kiro.dev/docs/specs/>.
- **Skill provenance:** authored by the `kiro-tasks` skill in the mif-docs
  plugin, <https://github.com/modeled-information-format/mif-docs-plugin>; the
  skill's exemplars and `evals/` define and verify the pattern.
- **MIF conformance:** the document projects to canonical JSON-LD under the MIF
  specification, <https://mif-spec.dev>, and is proven lossless by `mif-validate`.
- **Index:** this skill is one entry in the [skills by purpose](../../skills-by-purpose/)
  catalog; its sibling spec-set members are
  [kiro-requirements](../kiro-requirements/) and [kiro-design](../kiro-design/).
