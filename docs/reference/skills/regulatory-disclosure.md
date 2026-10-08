---
id: 1487d7ce-1239-5c7e-a0b6-4a7b2c9d4797
type: semantic
created: '2026-07-01T00:00:00Z'
modified: '2026-07-01T00:00:00Z'
namespace: reference/skills
title: 'Skill reference: regulatory-disclosure'
tags:
  - reference
  - mif-docs
  - skill
  - regulatory-disclosure
  - sec-10-k
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
    - '@id': urn:mif:skill:regulatory-disclosure
      '@type': prov:Entity
citations:
  - '@type': Citation
    citationType: specification
    citationRole: methodology
    title: 'Regulation S-K (17 CFR Part 229)'
    url: https://www.ecfr.gov/current/title-17/chapter-II/part-229?toc=1
    accessed: '2026-07-01'
  - '@type': Citation
    citationType: tool
    citationRole: source
    title: 'mif-docs — regulatory-disclosure skill (SKILL.md)'
    url: https://github.com/modeled-information-format/mif-docs-plugin/tree/main/skills/regulatory-disclosure
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
  name: 'Skill reference: regulatory-disclosure'
  entity_type: reference-document
extensions:
  x-skill: regulatory-disclosure
  x-genre-conceptType: semantic
  x-target-level: 3
  x-purpose-group: regulated-and-compliance-reports
---

# Skill reference: `regulatory-disclosure`

The `regulatory-disclosure` skill authors one document genre: an **SEC-style
annual disclosure report** — a document that reproduces the section order,
audience, and evidentiary discipline of a public-company Form 10-K under
Regulation S-K. This reference describes what that document type is, how the
skill produces one, when it earns its place, and the provenance behind it.

| Property | Value |
| --- | --- |
| Authors | An SEC-style annual disclosure report |
| Purpose group | Regulated & compliance reports |
| MIF `conceptType` | `semantic` |
| Target MIF level | 3 |
| Primary source | [Regulation S-K (17 CFR Part 229)](https://www.ecfr.gov/current/title-17/chapter-II/part-229?toc=1) |

## What this document type is

A regulatory disclosure report reproduces the fixed **item order** of a Form
10-K annual filing: Business, then Risk Factors, then Properties & Legal
Proceedings, then Selected Financial Data, then Management's Discussion &
Analysis (MD&A), then Financial Statements & Supplementary Data, then
Controls & Procedures. Its defining trait is that this order is not
negotiable — a report that reorders or omits a required item is not a
conformant disclosure report — and that **MD&A is the analytical core**: the
section where the numbers are explained, not merely restated. The genre
carries an explicit scope caveat: it reproduces disclosure *structure*, never
legal or financial sufficiency, regulatory conformance, or audit assurance,
and it must never be marketed as "10-K compliant."

This is distinct from an internal controls/process conformance review (a
`compliance-audit`, judged against a control framework with no Reg S-K item
order), from a voluntary ESG or impact narrative organized around impact
themes rather than a statutory item order (a `sustainability-report`), and
from a single technical decision with a comparison table (an
[engineering](../engineering/) report) or pre-decision requirements (a
[prd](../prd/) or [feature-spec](../feature-spec/)).

## How the skill produces one

`regulatory-disclosure` is a genre skill: it carries the Reg S-K item-order
pattern as durable instructions plus exemplars, and writes the artifact over a
MIF floor so the result is at once a human-readable filing narrative and a
machine-conformant unit.

- **Pattern, made operational.** The skill encodes the seven-item Reg S-K
  order as the single most load-bearing structural requirement, requires the
  Selected Financial Data heading to always be emitted even when the
  underlying item has been eliminated (marked explicit N/A with the citation
  that eliminated it), and treats MD&A as the analytical heart rather than a
  restatement of Business.
- **Exemplars set the bar.** Like every genre in the suite it ships
  `good-l1.md` (the MIF Level-1 floor), `good.md` (the Level-3 target),
  `bad.md` (a counter-example that omits Risk Factors), and `evals/evals.json`.
  The `check-exemplars` gate proves `good-l1.md` validates at L1 and `good.md`
  at Level 3, keeping the taught pattern continuously verified.
- **MIF projection.** The document is authored with MIF frontmatter (via the
  shared `mif-frontmatter` substrate) and a `conceptType` of `semantic`,
  reflecting that a disclosure report is declarative, point-in-time
  organizational fact plus rationale, not a step sequence. `mif-validate`
  proves the Markdown ↔ JSON-LD round-trip is lossless before the document is
  considered done.

## When it is beneficial

Reach for `regulatory-disclosure` when the deliverable must reproduce the
disclosure structure of a public-company annual report — the fixed item
order, the investor-facing MD&A, and the every-claim-cited discipline are the
artifact's reason to exist. Every material claim resolves to a cited source (a
MIF finding `@id` and its source URL at MIF Level 3); the report is built from
the full surviving findings corpus, never a cherry-picked subset, and
verification verdicts on weakened or inconclusive findings are annotated
rather than silently dropped.

Do **not** use it for an internal controls/process conformance review (SOC 2,
ISO 27001, an internal-audit finding set) — that judges conformance against a
control framework and has no Reg S-K item order or investor-facing MD&A. Do
not use it for a voluntary ESG or impact narrative with no fixed statutory
item order — that is organized around impact themes and frameworks (e.g.
GRI/SASB), not Business/Risk Factors/MD&A/Controls. Do not use it for a single
technical decision with a comparison table — that is
[engineering](../engineering/); for what to build and why, pre-decision, use a
[prd](../prd/) or [feature-spec](../feature-spec/) instead.

## Example

The shipped `good.md` exemplar, *"Solara Grid Systems, Inc. — Annual
Disclosure Report, Fiscal Year 2025,"* is a fictional company used to
illustrate the genre's structure, not an actual SEC filing. It covers Business
(a commercial and industrial solar-plus-storage developer with 480 megawatts
of contracted capacity), Risk Factors ordered by materiality (customer
concentration, interconnection queue delays, federal tax-credit policy risk,
component supply risk), Properties & Legal Proceedings (a leased headquarters
and one pending subcontractor payment dispute), and a Selected Financial Data
section marked explicit N/A — citing SEC Release No. 33-10890, which
eliminated Item 301 and folded its purpose into MD&A. MD&A then does the real
analytical work: fiscal-2025 revenue of $312 million (up 22% year over year),
a Mermaid `xychart-beta` revenue trend chart, liquidity and capital resources,
and known trends and uncertainties tying back to the interconnection risk
named in Risk Factors. Financial Statements & Supplementary Data presents a
four-year metrics table, and Controls & Procedures closes with management's
effectiveness conclusion and no identified material weakness. A numbered
References section grounds both regulatory citations.

## Provenance & citations

- **Genre source — Regulation S-K:** the SEC's disclosure item requirements
  for annual reports, 17 CFR Part 229,
  <https://www.ecfr.gov/current/title-17/chapter-II/part-229?toc=1>, including
  SEC Release No. 33-10890 eliminating Item 301 (Selected Financial Data) and
  folding its purpose into MD&A,
  <https://www.sec.gov/files/rules/final/2020/33-10890.pdf>.
- **Skill provenance:** authored by the `regulatory-disclosure` skill in the
  mif-docs plugin,
  <https://github.com/modeled-information-format/mif-docs-plugin>; the
  skill's exemplars and `evals/` define and verify the pattern.
- **MIF conformance:** the document projects to canonical JSON-LD under the
  MIF specification, <https://mif-spec.dev>, and is proven lossless by
  `mif-validate`.
- **Index:** this skill is one entry in the
  [skills by purpose](../../skills-by-purpose/) catalog; its closest sibling
  among the authored reference pages is [engineering](../engineering/).
