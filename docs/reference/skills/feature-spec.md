---
id: 138f94bd-3adc-51e0-a23c-fa5ebedb5172
type: semantic
created: '2026-06-30T12:00:00Z'
modified: '2026-06-30T12:00:00Z'
namespace: reference/skills
title: 'Skill reference: feature-spec'
tags:
  - reference
  - mif-docs
  - skill
  - feature-spec
  - ears
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
    - '@id': urn:mif:skill:feature-spec
      '@type': prov:Entity
citations:
  - '@type': Citation
    citationType: specification
    citationRole: methodology
    title: 'EARS — the Easy Approach to Requirements Syntax (Alistair Mavin)'
    url: https://alistairmavin.com/ears/
    accessed: '2026-06-30'
  - '@type': Citation
    citationType: specification
    citationRole: background
    title: MIF — Modeled Information Format specification
    url: https://mif-spec.dev
    accessed: '2026-06-30'
  - '@type': Citation
    citationType: tool
    citationRole: source
    title: 'mif-docs — feature-spec skill (SKILL.md)'
    url: https://github.com/modeled-information-format/mif-docs-plugin/tree/main/skills/feature-spec
relationships:
  - type: relates-to
    target: urn:mif:d8972202-0b4d-52ea-89d7-90abe228e820
  - type: relates-to
    target: urn:mif:f3c0b22b-a8f5-5640-a50e-3e0fc300347f
ontology:
  '@type': OntologyReference
  id: mif-docs
  version: 1.0.0
  uri: https://mif-spec.dev/ontologies/mif-docs
entity:
  name: 'Skill reference: feature-spec'
  entity_type: reference-document
extensions:
  x-skill: feature-spec
  x-genre-conceptType: semantic
  x-target-level: 2
  x-purpose-group: product-feature-specs
---

# Skill reference: `feature-spec`

The `feature-spec` skill authors one document genre: a **lightweight, AI-ready
feature specification** — a compact, build-ready spec an implementer or coding agent
can act on directly. This reference describes what that document type is, how the
skill produces one, when it earns its place, and the provenance and sources behind
it.

| Property | Value |
| --- | --- |
| Authors | A lightweight, AI-ready feature specification |
| Purpose group | Product & feature specs |
| MIF `conceptType` | `semantic` |
| Target MIF level | 2 |
| Primary source | [EARS](https://alistairmavin.com/ears/) |

## What this document type is

A feature spec is a deliberately small artifact — roughly 500 to 2000 tokens — that
gives one feature exactly enough definition to build. Its four parts are an
**Overview** (what the feature is and the value it delivers), **EARS acceptance
criteria** (the testable behaviours, written in the Easy Approach to Requirements
Syntax so a human and an agent grade them identically), a **Design** sketch (the
shape of the implementation), and **Edge Cases** (the corners an implementer would
otherwise miss). The size is the point: it is large enough to be unambiguous and
small enough to sit inside a coding agent's working context without crowding out the
code.

A feature spec is therefore *not* an org-wide architecture document — that scope
belongs to [arc42-arch-doc](../arc42-arch-doc/) — *not* a record of a single
hard-to-reverse decision (an [adr](../adr/)), and *not* a multi-feature product
document. Its closest sibling is the [prd](../prd/): the PRD scopes the problem and
the *why* across a product, while the feature spec turns one slice of that into a
direct, actionable build instruction.

## How the skill produces one

`feature-spec` is a genre skill: it carries the feature-spec pattern as durable
instructions plus exemplars, and writes the artifact over a MIF floor so the result
is at once a human-readable spec and a machine-conformant unit.

- **Pattern, made operational.** The skill encodes the four-part shape — Overview,
  EARS acceptance criteria, Design, Edge Cases — and the token budget that keeps it
  agent-ready, refusing anti-triggered work by redirecting org-wide architecture to
  arc42 and multi-feature scope to a PRD.
- **Exemplars set the bar.** Like every genre in the suite it ships `good-l1.md`
  (the MIF Level-1 floor), `good.md` (the target level — Level 2 for a feature
  spec), `bad.md` (a counter-example), and `evals/evals.json`. The `check-exemplars`
  gate proves `good-l1.md` validates at L1 and `good.md` at L2, so the pattern the
  skill teaches is itself continuously verified.
- **MIF projection.** The spec is authored with MIF frontmatter (via the shared
  `mif-frontmatter` substrate) and a `conceptType` of `semantic`, reflecting that a
  specification is declarative knowledge about intended behaviour rather than a
  sequence of steps. `mif-validate` proves the Markdown ↔ JSON-LD round-trip is
  lossless before the document is considered done.

## When it is beneficial

Reach for `feature-spec` when **one feature** needs a concise, build-ready
definition and you want an implementer — human or agent — to act on it without
further interpretation. The format shines in agent-driven workflows precisely
because it is small and its acceptance criteria are machine-gradable: the same EARS
statements that tell a person what "done" means also give an agent a checklist to
verify against.

Do **not** use it for organisation-wide architecture (write an arc42 document), for a
single architectural decision (an ADR), or for product-level scoping across many
features (a PRD). The trade-off is breadth: a feature spec intentionally covers one
slice, so a large initiative needs several specs — often coordinated by the
[doc-set-planner](../doc-set-planner/) — rather than one oversized document.

## Example

A feature spec titled *"Inline rename in the file tree"* opens with a two-sentence
Overview, then lists EARS acceptance criteria — *"When the user double-clicks a file
name, the system shall replace the label with an editable field"* and *"If the new
name collides with a sibling, then the system shall reject the rename and show an
inline error"*. A short Design names the component and the event flow, and Edge Cases
calls out empty names, path-length limits, and concurrent edits — enough for an agent
to implement and self-check in one pass.

## Provenance & citations

- **Genre source — EARS and MIF:** acceptance criteria follow the Easy Approach to
  Requirements Syntax, <https://alistairmavin.com/ears/>, and the document is authored
  to be machine-readable under the MIF specification, <https://mif-spec.dev>.
- **Skill provenance:** authored by the `feature-spec` skill in the mif-docs plugin,
  <https://github.com/modeled-information-format/mif-docs-plugin>; the skill's
  exemplars and `evals/` define and verify the pattern.
- **MIF conformance:** the document projects to canonical JSON-LD under the MIF
  specification, <https://mif-spec.dev>, and is proven lossless by `mif-validate`.
- **Index:** this skill is one entry in the [skills by purpose](../../skills-by-purpose/)
  catalog; its sibling product-and-feature-spec genre is [prd](../prd/).
