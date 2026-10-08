---
id: adda9d07-cdd9-5391-ba64-08188770c562
type: semantic
created: '2026-06-30T12:00:00Z'
modified: '2026-06-30T12:00:00Z'
namespace: reference/skills
title: 'Skill reference: kiro-requirements'
tags:
  - reference
  - mif-docs
  - skill
  - kiro
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
    - '@id': urn:mif:skill:kiro-requirements
      '@type': prov:Entity
citations:
  - '@type': Citation
    citationType: specification
    citationRole: methodology
    title: Kiro — Specs
    url: https://kiro.dev/docs/specs/
    accessed: '2026-06-30'
  - '@type': Citation
    citationType: specification
    citationRole: source
    title: EARS — the Easy Approach to Requirements Syntax (Alistair Mavin)
    url: https://alistairmavin.com/ears/
    accessed: '2026-06-30'
  - '@type': Citation
    citationType: tool
    citationRole: source
    title: 'mif-docs — kiro-requirements skill (SKILL.md)'
    url: https://github.com/modeled-information-format/mif-docs-plugin/tree/main/skills/kiro-requirements
relationships:
  - type: relates-to
    target: urn:mif:d8972202-0b4d-52ea-89d7-90abe228e820
  - type: relates-to
    target: urn:mif:6f6fcc98-7ffa-58f4-b0b9-25edbbb38f84
  - type: relates-to
    target: urn:mif:2afc8508-5ee4-570c-bbae-f52982c3703e
ontology:
  '@type': OntologyReference
  id: mif-docs
  version: 1.0.0
  uri: https://mif-spec.dev/ontologies/mif-docs
entity:
  name: 'Skill reference: kiro-requirements'
  entity_type: reference-document
extensions:
  x-skill: kiro-requirements
  x-genre-conceptType: semantic
  x-target-level: 3
  x-purpose-group: kiro-spec-set
---

# Skill reference: `kiro-requirements`

The `kiro-requirements` skill authors one document genre: the **`requirements.md`**
of an AWS Kiro three-document spec set. This reference describes what that document
type is, how the skill produces one, when it earns its place, and the provenance
and sources behind it.

| Property | Value |
| --- | --- |
| Authors | The `requirements.md` of a Kiro spec set |
| Purpose group | Kiro spec set |
| MIF `conceptType` | `semantic` |
| Target MIF level | 3 |
| Primary source | [Kiro — Specs](https://kiro.dev/docs/specs/) |

## What this document type is

A Kiro spec set is three linked artifacts — `requirements.md`, `design.md`, and
`tasks.md` — that move a feature from intent to implementation as a structured
chain a coding agent can consume. `requirements.md` is the **first** of the three:
it captures *what* the feature must do, before any technical design exists. Each
requirement is a numbered entry pairing a **user story** ("As a `<role>`, I want
`<capability>`, so that `<benefit>`") with a set of **EARS acceptance criteria**
that state, in a constrained grammar, exactly when the system must respond and how.
Numbering matters: the design and the task list both trace back to these numbers,
so requirement IDs become the spine of the whole set.

This document is *not* a technical design — the *how* belongs in
[kiro-design](../kiro-design/). It is *not* an implementation plan — the ordered,
checkbox build steps belong in [kiro-tasks](../kiro-tasks/). It is also not a
free-form product brief: the discipline of EARS keeps each criterion gradeable by
a human and an agent identically, which is what lets the downstream documents bind
to it.

## How the skill produces one

`kiro-requirements` is a genre skill: it carries the Kiro requirements pattern as
durable instructions plus exemplars, and writes the artifact over a MIF floor so
the result is at once a readable requirements doc and a machine-conformant unit.

- **Pattern, made operational.** The skill encodes the user-story-plus-EARS
  shape, enforces stable requirement numbering, and refuses anti-triggered work
  (design belongs in `kiro-design`; tasks belong in `kiro-tasks`).
- **EARS criteria.** Acceptance criteria use the five EARS patterns — ubiquitous,
  event-driven (WHEN), state-driven (WHILE), unwanted-behaviour (IF/THEN), and
  optional-feature (WHERE) — drawn from the shared `ears-acceptance-criteria`
  substrate so each line is testable rather than aspirational.
- **Exemplars set the bar.** Like every genre in the suite it ships `good-l1.md`
  (the MIF Level-1 floor), `good.md` (the target level — Level 3 here),
  `bad.md` (a counter-example), and `evals/evals.json`. The `check-exemplars`
  gate proves `good-l1.md` validates at L1 and `good.md` at its target level.
- **MIF projection.** The document is authored with MIF frontmatter (via the
  shared `mif-frontmatter` substrate) and a `conceptType` of `semantic`,
  reflecting that requirements assert facts about the system rather than steps.
  `mif-validate` proves the Markdown to JSON-LD round-trip is lossless before
  the document is considered done.

## When it is beneficial

Reach for `kiro-requirements` at the **start** of a feature, when you need an
agreed, numbered statement of what to build before anyone argues about how. Its
value is traceability: because every later artifact cites these requirement
numbers, a reviewer can follow any task back to the requirement that justifies it,
and any requirement forward to the code that satisfies it.

Do **not** use it for the technical approach — that is [kiro-design](../kiro-design/)
— or for the build sequence, which is [kiro-tasks](../kiro-tasks/). For a
single-feature spec that does not need the full three-document chain, a lighter
artifact such as a feature spec may serve better. The cost of the genre is
discipline: writing EARS criteria and maintaining numbering is more work than a
prose wishlist, and it pays off only when the design and tasks actually bind to it.

## Example

A `requirements.md` for a password-reset feature opens with an introduction
naming the feature and its scope, then lists Requirement 1 ("As a locked-out user,
I want to request a reset link…") with EARS criteria such as "WHEN a user submits
a registered email, the system SHALL send a reset link within 60 seconds" and "IF
the email is unregistered, THEN the system SHALL show the same confirmation
without disclosing account existence". Requirement 2 covers link expiry, and so on
— each numbered so `design.md` and `tasks.md` can reference them precisely.

## Provenance & citations

- **Genre source — Kiro specs:** the canonical definition of the three-document
  spec workflow, <https://kiro.dev/docs/specs/>, with acceptance criteria written
  in EARS, <https://alistairmavin.com/ears/>.
- **Skill provenance:** authored by the `kiro-requirements` skill in the mif-docs
  plugin, <https://github.com/modeled-information-format/mif-docs-plugin>; the
  skill's exemplars and `evals/` define and verify the pattern.
- **MIF conformance:** the document projects to canonical JSON-LD under the MIF
  specification, <https://mif-spec.dev>, and is proven lossless by `mif-validate`.
- **Index:** this skill is one entry in the [skills by purpose](../../skills-by-purpose/)
  catalog; its sibling spec-set members are
  [kiro-design](../kiro-design/) and [kiro-tasks](../kiro-tasks/).
