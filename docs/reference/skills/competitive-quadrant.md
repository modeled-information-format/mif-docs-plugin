---
id: a8905869-202e-57b5-842d-189ca978d2b4
type: semantic
created: '2026-07-01T00:00:00Z'
modified: '2026-07-01T00:00:00Z'
namespace: reference/skills
title: 'Skill reference: competitive-quadrant'
tags:
  - reference
  - mif-docs
  - skill
  - competitive-quadrant
  - vendor-comparison
temporal:
  '@type': TemporalMetadata
  validFrom: '2026-07-01T00:00:00Z'
  recordedAt: '2026-07-01T00:00:00Z'
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
    - '@id': urn:mif:skill:competitive-quadrant
      '@type': prov:Entity
citations:
  - '@type': Citation
    citationType: documentation
    citationRole: supports
    title: Kong Gateway documentation
    url: https://docs.konghq.com/
    accessed: '2026-06-26'
  - '@type': Citation
    citationType: documentation
    citationRole: supports
    title: Apigee documentation
    url: https://cloud.google.com/apigee/docs
    accessed: '2026-06-26'
  - '@type': Citation
    citationType: documentation
    citationRole: supports
    title: Amazon API Gateway documentation
    url: https://docs.aws.amazon.com/apigateway/
    accessed: '2026-06-26'
  - '@type': Citation
    citationType: documentation
    citationRole: supports
    title: Tyk documentation
    url: https://tyk.io/docs/
    accessed: '2026-06-26'
  - '@type': Citation
    citationType: documentation
    citationRole: supports
    title: Gravitee documentation
    url: https://documentation.gravitee.io/
    accessed: '2026-06-26'
  - '@type': Citation
    citationType: tool
    citationRole: source
    title: 'mif-docs — competitive-quadrant skill (SKILL.md)'
    url: https://github.com/modeled-information-format/mif-docs-plugin/tree/main/skills/competitive-quadrant
relationships:
  - type: relates-to
    target: urn:mif:d8972202-0b4d-52ea-89d7-90abe228e820
  - type: relates-to
    target: urn:mif:d60dba7d-ef07-5ed0-a013-1b0b5e9b1ace
ontology:
  '@type': OntologyReference
  id: mif-docs
  version: 1.0.0
  uri: https://mif-spec.dev/ontologies/mif-docs
entity:
  name: 'Skill reference: competitive-quadrant'
  entity_type: reference-document
extensions:
  x-skill: competitive-quadrant
  x-genre-conceptType: semantic
  x-target-level: 3
  x-purpose-group: research-and-market-intelligence
---

# Skill reference: `competitive-quadrant`

The `competitive-quadrant` skill authors one document genre: a **two-axis
competitive-quadrant report** — a practitioner deliverable that scores every
included vendor or offering in a defined market on Completeness of Vision and
Ability to Execute, and places each into exactly one of four quadrants. This
reference describes what that document type is, how the skill produces one,
when it earns its place, and the provenance behind it.

| Property | Value |
| --- | --- |
| Authors | A two-axis competitive-quadrant report |
| Purpose group | Research & market intelligence |
| MIF `conceptType` | `semantic` |
| Target MIF level | 3 |
| Primary source | Generic two-axis competitive-analysis convention (Completeness of Vision × Ability to Execute) — explicitly not Gartner's Magic Quadrant methodology or trademark |

## What this document type is

A competitive-quadrant report scores every vendor or offering in a defined
market on two evaluation axes — **Completeness of Vision** (x) and **Ability
to Execute** (y) — and places each into exactly one of four quadrants:
**Leaders**, **Challengers**, **Visionaries**, **Niche Players**. Its defining
trait is the **quadrant placement itself**, backed by explicit inclusion
criteria stating which vendors qualify, per-axis scoring traced to cited
sources, and a per-vendor **Strengths** and **Cautions** pair. A required
Mermaid `quadrantChart` figure renders the two-axis placement; the genre also
covers Context & Market Overview and a Methodology section documenting how
evidence was gathered and the assessment's as-of date and limits. It captures
declarative comparative-judgment knowledge, not a time-bound event or a
step-by-step procedure.

This genre reproduces only a **generic two-axis competitive-analysis
structure**. It is **not** a Gartner Magic Quadrant and must never claim to
be one, imply Gartner endorsement, or use "Magic Quadrant" as a conformance or
branding claim — "Magic Quadrant" is a Gartner trademark and a proprietary
methodology, and the caveat is load-bearing enough that every report this
genre produces states it explicitly.

## How the skill produces one

`competitive-quadrant` is a genre skill: it carries the two-axis quadrant
pattern as durable instructions plus exemplars, and writes the artifact over a
MIF floor so the result is at once a human-readable report and a
machine-conformant unit.

- **Pattern, made operational.** The skill encodes Market Definition /
  Inclusion Criteria, the two-axis evaluation framework, per-vendor profiles,
  quadrant placement, Context & Market Overview, and Methodology, and treats
  the Mermaid `quadrantChart` figure as mandatory — a placement without it is
  not conformant. It requires exhaustive coverage of every vendor meeting the
  inclusion criteria and traces every axis score, Strength, and Caution to a
  cited source.
- **Exemplars set the bar.** Like every genre in the suite it ships
  `good-l1.md` (the MIF Level-1 floor), `good.md` (the Level-3 target),
  `bad.md` (a counter-example that places vendors with no quadrant figure at
  all), and `evals/evals.json`. The `check-exemplars` gate proves `good-l1.md`
  validates at L1 and `good.md` at Level 3.
- **MIF projection.** The document is authored with MIF frontmatter (via the
  shared `mif-frontmatter` substrate) and a `conceptType` of `semantic`.
  `mif-validate` proves the Markdown ↔ JSON-LD round-trip is lossless.

## When it is beneficial

Reach for `competitive-quadrant` when the deliverable must **rank vendors or
offerings in a defined market on two evaluation axes and force each into one
quadrant** — inclusion criteria, cited axis scores, and the required figure
are the artifact's reason to exist.

Do **not** use it for a narrative survey of a market's size, segments,
growth, and trends with no forced two-axis placement of named vendors — that
broader, descriptive genre does not require every entrant to land in exactly
one of four quadrants. Do not use it for a single evaluation with a free-form
comparison table and no fixed two-axis quadrant shape — that is
[engineering](../engineering/): its Trade-offs table maps options against
decision drivers, but never forces a Completeness-of-Vision-by-Ability-to-
Execute placement. Do not use it for an informal, one-design narrative
weighing alternatives before building something — that is
[google-design-doc](../google-design-doc/), not a vendor-comparison genre.

## Example

A report titled *"Competitive Quadrant: Full Lifecycle API Gateway
Platforms"* opens with the caveat that it is a generic two-axis analysis, not
a Gartner Magic Quadrant, then states its inclusion criteria (a
request-routing data plane plus a separate management plane, general
availability, and public documentation). Five vendors qualify: Kong, Apigee,
AWS API Gateway, Tyk, and Gravitee. Each is scored on Completeness of Vision
(lifecycle breadth, deployment openness) and Ability to Execute
(production-readiness, ecosystem depth, operational simplicity), given a
Strengths/Cautions profile, and placed on a Mermaid `quadrantChart`: Kong and
Apigee land in Leaders, AWS API Gateway in Challengers, and Tyk and Gravitee in
Niche Players, with no vendor placed in Visionaries this cycle. A Context &
Market Overview explains the market's bifurcation between lifecycle
incumbents and single-cloud managed offerings, and the Methodology section
states the as-of date, that no claim was independently benchmarked, and that
pricing was out of scope.

## Provenance & citations

- **Genre source — generic two-axis competitive-analysis convention:** a
  Completeness of Vision × Ability to Execute structure with four quadrants,
  explicitly disclaimed as distinct from Gartner's proprietary Magic Quadrant
  methodology and trademark.
- **Exemplar vendor sources:** the skill's Level-3 exemplar cites each
  evaluated vendor's own public documentation — Kong Gateway documentation,
  <https://docs.konghq.com/>; Apigee documentation,
  <https://cloud.google.com/apigee/docs>; Amazon API Gateway documentation,
  <https://docs.aws.amazon.com/apigateway/>; Tyk documentation,
  <https://tyk.io/docs/>; Gravitee documentation,
  <https://documentation.gravitee.io/>.
- **Skill provenance:** authored by the `competitive-quadrant` skill in the
  mif-docs plugin, <https://github.com/modeled-information-format/mif-docs-plugin>;
  the skill's exemplars and `evals/` define and verify the pattern.
- **MIF conformance:** the document projects to canonical JSON-LD under the
  MIF specification, <https://mif-spec.dev>, and is proven lossless by
  `mif-validate`.
- **Index:** this skill is one entry in the [skills by purpose](../../skills-by-purpose/)
  catalog.
