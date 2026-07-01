---
id: reference-skill-engineering
type: semantic
created: '2026-07-01T00:00:00Z'
modified: '2026-07-01T00:00:00Z'
namespace: reference/skills
title: 'Skill reference: engineering'
tags:
  - reference
  - mif-docs
  - skill
  - engineering
  - decision-record
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
    - '@id': urn:mif:skill:engineering
      '@type': prov:Entity
citations:
  - '@type': Citation
    citationType: specification
    citationRole: methodology
    title: 'ANSI/NISO Z39.18 — Scientific and Technical Reports: Preparation, Presentation, and Preservation'
    url: https://www.niso.org/publications/z3918-2005-r2015
    accessed: '2026-07-01'
  - '@type': Citation
    citationType: tool
    citationRole: source
    title: 'mif-docs — engineering skill (SKILL.md)'
    url: https://github.com/modeled-information-format/mif-docs-plugin/tree/main/skills/engineering
  - '@type': Citation
    citationType: tool
    citationRole: background
    title: 'research-harness-template discussion #228 — genre-consolidation pilot'
    url: https://github.com/modeled-information-format/research-harness-template/discussions/228
    accessed: '2026-07-01'
relationships:
  - type: relates-to
    target: urn:mif:reference-skills-by-purpose
  - type: relates-to
    target: urn:mif:reference-skill-adr
  - type: relates-to
    target: urn:mif:reference-skill-google-design-doc
ontology:
  '@type': OntologyReference
  id: mif-docs
  version: 1.0.0
  uri: https://mif-spec.dev/ontologies/mif-docs
entity:
  name: 'Skill reference: engineering'
  entity_type: reference-document
extensions:
  x-skill: engineering
  x-genre-conceptType: semantic
  x-target-level: 3
  x-purpose-group: decisions-and-proposals
---

# Skill reference: `engineering`

The `engineering` skill authors one document genre: an **engineering decision /
evaluation report** — a practitioner-facing document that evaluates concrete
options against stated decision drivers in a mandatory comparison table, states
which option was chosen, and gives the engineers who build or operate the result
enough to act. This reference describes what that document type is, how the
skill produces one, when it earns its place, and the provenance behind it.

| Property | Value |
| --- | --- |
| Authors | An engineering decision / evaluation report |
| Purpose group | Decisions & proposals |
| MIF `conceptType` | `semantic` |
| Target MIF level | 3 |
| Primary source | Practitioner evaluation-report convention, with an optional ANSI/NISO Z39.18 overlay |

## What this document type is

An engineering report evaluates a set of concrete options against stated
decision drivers and records the choice. Its defining trait is the **mandatory
Trade-offs comparison table** — a Markdown table mapping every candidate option
against the decision drivers — which the Decision section must then cite as its
evidence. The report also covers Problem/Context, Options Considered,
Implementation Notes, and Consequences, and can additively carry formal
ANSI/NISO Z39.18 technical-report front and back matter when a formal
conformance is requested.

This is distinct from a single already-made, immutable decision (an
[adr](../adr/)), from an informal alignment narrative whose trade-offs are prose
rather than a required matrix (a [google-design-doc](../google-design-doc/)),
and from a requirements document (a [prd](../prd/) or [feature-spec](../feature-spec/)).

## How the skill produces one

`engineering` is a genre skill: it carries the evaluation-report pattern as
durable instructions plus exemplars, and writes the artifact over a MIF floor so
the result is at once a human-readable report and a machine-conformant unit.

- **Pattern, made operational.** The skill encodes the six required sections
  and treats the Trade-offs comparison table as mandatory — a report without it
  is not conformant — plus the additive Z39.18 overlay for formal conformance
  requests.
- **Exemplars set the bar.** Like every genre in the suite it ships `good-l1.md`
  (the MIF Level-1 floor), `good.md` (the Level-3 target), `bad.md` (a
  counter-example missing the comparison table), and `evals/evals.json`. The
  `check-exemplars` gate proves `good-l1.md` validates at L1 and `good.md` at
  Level 3.
- **MIF projection.** The document is authored with MIF frontmatter (via the
  shared `mif-frontmatter` substrate) and a `conceptType` of `semantic`.
  `mif-validate` proves the Markdown ↔ JSON-LD round-trip is lossless.

## When it is beneficial

Reach for `engineering` when a team must **evaluate concrete options against
stated decision drivers** and hand the engineers who build or operate the
result a report they can act on — the comparison table is the artifact's
reason to exist. It is the pilot genre migrated from the
`research-harness-template` harness's `packs/reports/engineering` pack as part
of the genre-consolidation effort tracked in
[research-harness-template#228](https://github.com/modeled-information-format/research-harness-template/discussions/228),
where the harness stops re-implementing genre and conformance plumbing per pack
and consumes this skill instead.

Do **not** use it when the decision is already made and only needs recording
immutably with its drivers — that is an [adr](../adr/). Do not use it for an
informal, prose-driven alignment narrative without a required table — that is
[google-design-doc](../google-design-doc/). For product requirements, use
[prd](../prd/) or [feature-spec](../feature-spec/).

## Example

An engineering report titled *"Message Queue for the Event Pipeline"* opens with
the decision drivers (throughput, at-least-once delivery, operational
simplicity, a managed option), evaluates Apache Kafka, AWS SQS, and Redpanda
Cloud in a comparison table against those drivers, and adopts Redpanda Cloud
with the Decision citing the table's throughput and operational-simplicity
cells. Implementation Notes name the concrete provisioning and cutover steps,
and Consequences state the trade-off accepted (a managed-service bill and a new
external dependency) for the operational load removed.

## Provenance & citations

- **Genre source — practitioner evaluation-report convention:** a
  comparison-table-driven decision report used broadly across engineering
  organizations, with an additive optional overlay for
  [ANSI/NISO Z39.18](https://www.niso.org/publications/z3918-2005-r2015)
  technical-report conformance.
- **Migration source:** the `research-harness-template` harness's
  `packs/reports/engineering` pack, migrated per
  [discussion #228](https://github.com/modeled-information-format/research-harness-template/discussions/228).
- **Skill provenance:** authored by the `engineering` skill in the mif-docs
  plugin, <https://github.com/modeled-information-format/mif-docs-plugin>; the
  skill's exemplars and `evals/` define and verify the pattern.
- **MIF conformance:** the document projects to canonical JSON-LD under the MIF
  specification, <https://mif-spec.dev>, and is proven lossless by `mif-validate`.
- **Index:** this skill is one entry in the [skills by purpose](../../skills-by-purpose/)
  catalog; its Decisions & proposals siblings are [adr](../adr/), [rust-rfc](../rust-rfc/),
  and [python-pep](../python-pep/).
