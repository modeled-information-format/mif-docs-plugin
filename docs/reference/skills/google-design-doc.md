---
id: reference-skill-google-design-doc
type: semantic
created: '2026-06-30T12:00:00Z'
modified: '2026-06-30T12:00:00Z'
namespace: reference/skills
title: 'Skill reference: google-design-doc'
tags:
  - reference
  - mif-docs
  - skill
  - design-doc
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
    - '@id': urn:mif:skill:google-design-doc
      '@type': prov:Entity
citations:
  - '@type': Citation
    citationType: article
    citationRole: methodology
    title: Design Docs at Google (Malte Ubl)
    url: https://www.industrialempathy.com/posts/design-docs-at-google/
    accessed: '2026-06-30'
  - '@type': Citation
    citationType: tool
    citationRole: source
    title: 'mif-docs — google-design-doc skill (SKILL.md)'
    url: https://github.com/modeled-information-format/mif-docs-plugin/tree/main/skills/google-design-doc
relationships:
  - type: relates-to
    target: urn:mif:reference-skills-by-purpose
  - type: relates-to
    target: urn:mif:reference-skill-arc42-arch-doc
  - type: relates-to
    target: urn:mif:reference-skill-c4-model-diagram
  - type: relates-to
    target: urn:mif:reference-skill-ai-architecture-doc
ontology:
  '@type': OntologyReference
  id: mif-docs
  version: 1.0.0
  uri: https://mif-spec.dev/ontologies/mif-docs
entity:
  name: 'Skill reference: google-design-doc'
  entity_type: reference-document
extensions:
  x-skill: google-design-doc
  x-genre-conceptType: semantic
  x-target-level: 3
  x-purpose-group: architecture-design
---

# Skill reference: `google-design-doc`

The `google-design-doc` skill authors one document genre: a **Google-style
engineering design doc** — an informal, trade-off-focused narrative that frames a
problem, proposes one design, and weighs the alternatives it rejected. This
reference describes what that document type is, how the skill produces one, when
it earns its place, and the provenance and sources behind it.

| Property | Value |
| --- | --- |
| Authors | A Google-style engineering design doc |
| Purpose group | Architecture design |
| MIF `conceptType` | `semantic` |
| Target MIF level | 3 |
| Primary source | [Design Docs at Google](https://www.industrialempathy.com/posts/design-docs-at-google/) |

## What this document type is

A Google design doc is an **informal**, relatively short document an engineer or
small team writes *before* building something non-trivial, to think through the
design and to win alignment from the people the work touches. Its defining trait
is that it is **trade-off-focused narrative**, not a template: it frames the
problem and context, states the goals and explicit non-goals, proposes one design
in enough detail to be critiqued, and — crucially — devotes real space to the
**alternatives considered and why they were rejected**. Other common sections
cover system context, APIs, data storage, security and privacy, and a degree of
detail proportional to the risk of the decision. The document's value is the
thinking it forces and the review conversation it anchors, captured durably so the
rationale survives the decision.

A design doc is therefore *not* a single immutable decision record — one settled
choice belongs in an [adr](../adr/) — *not* a requirements document, and *not* an
operational procedure. It is a proposal-and-rationale narrative, so it projects to
MIF as `semantic` content at Level 3.

## How the skill produces one

`google-design-doc` is a genre skill: it carries the design-doc pattern as durable
instructions plus exemplars, and writes the artifact over a MIF floor so the
result is at once a human-readable proposal and a machine-conformant unit.

- **Pattern, made operational.** The skill encodes the informal, trade-off-first
  shape — problem and context, goals and non-goals, one proposed design, rejected
  alternatives with reasons, scope of detail matched to risk — and refuses
  anti-triggered work (a settled decision belongs in an ADR; requirements belong in
  a feature spec).
- **Exemplars set the bar.** Like every genre in the suite it ships `good-l1.md`
  (the MIF Level-1 floor), `good.md` (the Level-3 target), `bad.md` (a
  counter-example), and `evals/evals.json`. The `check-exemplars` gate proves
  `good-l1.md` validates at L1 and `good.md` at Level 3, keeping the taught pattern
  continuously verified.
- **MIF projection.** The document is authored with MIF frontmatter (via the
  shared `mif-frontmatter` substrate) and a `conceptType` of `semantic`, reflecting
  that the doc is reasoned argument rather than performed steps. `mif-validate`
  proves the Markdown ↔ JSON-LD round-trip is lossless before the document is
  considered done.

## When it is beneficial

Reach for `google-design-doc` when a team must **align on a non-trivial technical
approach before building**, and the rationale — especially what was rejected and
why — is worth keeping. It shines for cross-team or high-risk work where the
review conversation matters as much as the answer, and where future readers will
ask "why didn't we just do X?" The doc's informality is a feature: it lowers the
cost of writing enough that the thinking actually happens on paper.

Do **not** use it when the decision is already made and you only need to record it
immutably with its drivers — that is an [adr](../adr/). If the alignment must be
grounded in a mandatory options-vs-criteria comparison table rather than prose
trade-offs, use [engineering](../engineering/) instead. Do not use it for product
requirements; lead with the problem and success metrics in a
[feature-spec](../feature-spec/) instead. For an operational procedure, write a
runbook. When you need durable whole-system structure rather than a single
proposal, prefer [arc42-arch-doc](../arc42-arch-doc/) or the diagram-led
[c4-model-diagram](../c4-model-diagram/), and for a machine-first spec a coding
agent consumes, [ai-architecture-doc](../ai-architecture-doc/). The cost is
discipline: a design doc that skips the rejected alternatives is just an
announcement, and loses most of its value.

## Example

A design doc titled *"Versioned schema mirror for mif-spec.dev"* opens with the
problem (consumers need pinned schema URLs without breaking the stable `$id`),
states goals and non-goals, proposes generating a versioned mirror at build time,
then weighs the alternatives it rejected — versioning the canonical `$id`,
committing the mirror to source, redirecting at the CDN — each with the reason it
lost. A short security-and-privacy note and a rollout plan close it, and the doc
links the ADR that later records the settled decision.

## Provenance & citations

- **Genre source — Design Docs at Google:** Malte Ubl's account of the practice,
  its purpose, and its typical sections,
  <https://www.industrialempathy.com/posts/design-docs-at-google/>.
- **Skill provenance:** authored by the `google-design-doc` skill in the mif-docs
  plugin, <https://github.com/modeled-information-format/mif-docs-plugin>; the
  skill's exemplars and `evals/` define and verify the pattern.
- **MIF conformance:** the document projects to canonical JSON-LD under the MIF
  specification, <https://mif-spec.dev>, and is proven lossless by `mif-validate`.
- **Index:** this skill is one entry in the [skills by purpose](../../skills-by-purpose/)
  catalog; its architecture-design siblings are
  [arc42-arch-doc](../arc42-arch-doc/),
  [c4-model-diagram](../c4-model-diagram/), and
  [ai-architecture-doc](../ai-architecture-doc/).
