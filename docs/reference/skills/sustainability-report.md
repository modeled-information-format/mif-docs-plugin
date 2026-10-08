---
id: 278cf759-4342-5ec0-81c1-e003ed3174ef
type: semantic
created: '2026-07-01T00:00:00Z'
modified: '2026-07-01T00:00:00Z'
namespace: reference/skills
title: 'Skill reference: sustainability-report'
tags:
  - reference
  - mif-docs
  - skill
  - sustainability-report
  - gri
  - esg
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
    - '@id': urn:mif:skill:sustainability-report
      '@type': prov:Entity
citations:
  - '@type': Citation
    citationType: documentation
    citationRole: methodology
    title: GRI Standards
    url: https://www.globalreporting.org/standards/
    accessed: '2026-07-01'
  - '@type': Citation
    citationType: tool
    citationRole: source
    title: 'mif-docs — sustainability-report skill (SKILL.md)'
    url: https://github.com/modeled-information-format/mif-docs-plugin/tree/main/skills/sustainability-report
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
  name: 'Skill reference: sustainability-report'
  entity_type: reference-document
extensions:
  x-skill: sustainability-report
  x-genre-conceptType: semantic
  x-target-level: 3
  x-purpose-group: research-and-market-intelligence
---

# Skill reference: `sustainability-report`

The `sustainability-report` skill authors one document genre: a **GRI-Standards
sustainability/ESG report** — a disclosure-oriented document that reports an
organization's economic, environmental, and social impacts against the Global
Reporting Initiative's topic standards, ties every disclosure to a stated
materiality determination, and indexes every disclosure to its location. This
reference describes what that document type is, how the skill produces one,
when it earns its place, and the provenance behind it.

| Property | Value |
| --- | --- |
| Authors | A GRI-Standards sustainability/ESG report |
| Purpose group | Research and market intelligence |
| MIF `conceptType` | `semantic` |
| Target MIF level | 3 |
| Primary source | [GRI Standards](https://www.globalreporting.org/standards/) |

## What this document type is

A GRI sustainability report reproduces the Global Reporting Initiative's own
reporting architecture: the **GRI 1** Foundation principles, **GRI 2** General
Disclosures on organizational profile and governance, **GRI 3** Material
Topics (the materiality determination itself, not merely a list of topics),
and Topic Standards drawn from the **GRI 200** (economic), **GRI 300**
(environmental), and **GRI 400** (social) series. Its defining trait is the
**GRI content index** — mandatory back matter mapping every disclosure the
report makes to its location, and to any omission with a stated reason. The
genre is a structural convention, not a certification: it reproduces the GRI
**structure** only and is presented as GRI-structured, not GRI-assured, never
asserting assurance, third-party verification, or full "in accordance with
GRI" conformance.

This is distinct from an internal controls/process conformance review (a
`compliance-audit`), a statutory annual filing in Reg S-K / Form 10-K item
order (a `regulatory-disclosure`), and a single already-made decision with no
comparison or disclosure structure to show (an [adr](../adr/)). It is
declarative disclosure knowledge tied to a reporting period, so it projects to
MIF as `semantic` content at Level 3.

## How the skill produces one

`sustainability-report` is a genre skill: it carries the GRI reporting pattern
as durable instructions plus exemplars, and writes the artifact over a MIF
floor so the result is at once a human-readable disclosure report and a
machine-conformant unit.

- **Pattern, made operational.** The skill encodes the GRI 1/2/3 Universal
  Standards plus GRI 200/300/400 Topic Standards shape, requires the
  materiality determination to explain *how* topics were identified and
  prioritized (not just listed), and treats the GRI Content Index as
  mandatory — a report without one is not conformant with this genre.
- **Exemplars set the bar.** Like every genre in the suite it ships
  `templates/good-l1.md` (the MIF Level-1 floor), `templates/good.md` (the
  Level-3 target), and `templates/bad.md` (a counter-example missing the GRI
  Content Index).
- **MIF projection.** The document is authored with MIF frontmatter (via the
  shared `mif-frontmatter` substrate) and a `conceptType` of `semantic`.
  `mif-validate` proves the Markdown ↔ JSON-LD round-trip is lossless, and
  every claim traces to a cited MIF finding `@id` with its verification
  verdict reported rather than silently dropped.

## When it is beneficial

Reach for `sustainability-report` when the deliverable must **reproduce the
GRI sustainability-reporting structure** — a voluntary ESG or impact narrative
organized by GRI topic standards, built exhaustively from a surviving-findings
corpus, and indexed so a reader can audit disclosure coverage at a glance.

Do **not** use it for an internal controls/process conformance review with an
auditor's-report framing and a tests-of-controls matrix — that is
`compliance-audit`; it never carries the GRI topic-standard frame or a GRI
content index. Do not use it for a statutory annual disclosure in Reg S-K /
Form 10-K item order (Business, Risk Factors, MD&A, Financial Statements) —
that is `regulatory-disclosure`, a mandatory public-company filing shape, not
a voluntary GRI-organized narrative. For a single already-made decision with
no comparison or disclosure structure, use an [adr](../adr/) instead. If the
need is a mandatory options-vs-criteria comparison table rather than a
disclosure index, use [engineering](../engineering/).

## Example

A sustainability report titled *"Solvane Textiles Group — Sustainability
Report 2025"* opens with GRI 1 Foundation principles and the fiscal-year
reporting boundary, gives GRI 2 General Disclosures on the company's nine
manufacturing sites and board-level Sustainability Committee, and states a
GRI 3 materiality determination that prioritizes water stewardship and labor
conditions — backed by a Mermaid `quadrantChart` materiality matrix. Topic
Standards disclosures follow: GRI 303 water withdrawal intensity down 9% year
over year, GRI 305 Scope 1/2 emissions down 7%, GRI 401 employee turnover down
from 14.2% to 11.4%, and GRI 407 collective-bargaining coverage across all
direct manufacturing sites. A GRI Content Index closes the report, mapping
each disclosure (2-1, 2-9, 2-29, 3-1, 3-2, 303-5, 305-1/305-2, 401-1, 407-1)
to its location with no omissions.

## Provenance & citations

- **Genre source — GRI Standards:** the Global Reporting Initiative's
  Universal Standards (GRI 1, GRI 2, GRI 3) and Topic Standards (GRI
  200/300/400 series), <https://www.globalreporting.org/standards/>.
- **Skill provenance:** authored by the `sustainability-report` skill in the
  mif-docs plugin, <https://github.com/modeled-information-format/mif-docs-plugin>;
  the skill's exemplars define and verify the pattern.
- **MIF conformance:** the document projects to canonical JSON-LD under the
  MIF specification, <https://mif-spec.dev>, and is proven lossless by
  `mif-validate`.
- **Index:** this skill is one entry in the [skills by purpose](../../skills-by-purpose/)
  catalog; its Research and market intelligence siblings include
  [engineering](../engineering/).
