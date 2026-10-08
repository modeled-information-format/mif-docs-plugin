---
id: fe77a138-2c3e-5358-b5cb-560253765bd2
type: semantic
created: '2026-07-01T00:00:00Z'
modified: '2026-07-01T00:00:00Z'
namespace: reference/skills
title: 'Skill reference: market-research-report'
tags:
  - reference
  - mif-docs
  - skill
  - market-research
  - client-report
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
    - '@id': urn:mif:skill:market-research-report
      '@type': prov:Entity
citations:
  - '@type': Citation
    citationType: specification
    citationRole: background
    title: ESOMAR
    url: https://esomar.org/
    accessed: '2026-07-01'
  - '@type': Citation
    citationType: specification
    citationRole: background
    title: 'ISO 20252:2019 — Market, opinion and social research, including insights and data analytics'
    url: https://www.iso.org/standard/73671.html
    accessed: '2026-07-01'
  - '@type': Citation
    citationType: tool
    citationRole: source
    title: 'mif-docs — market-research-report skill (SKILL.md)'
    url: https://github.com/modeled-information-format/mif-docs-plugin/tree/main/skills/market-research-report
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
  name: 'Skill reference: market-research-report'
  entity_type: reference-document
extensions:
  x-skill: market-research-report
  x-genre-conceptType: semantic
  x-target-level: 3
  x-purpose-group: research-and-market-intelligence
---

# Skill reference: `market-research-report`

The `market-research-report` skill authors one document genre: a full
**ESOMAR/ISO 20252-style market research report** — a client-facing
deliverable that states the business question, discloses exactly how the
evidence was gathered, presents the findings by objective, and draws
recommendations that trace back to that evidence. This reference describes
what that document type is, how the skill produces one, when it earns its
place, and the provenance behind it.

| Property | Value |
| --- | --- |
| Authors | A full ESOMAR/ISO 20252-style market research report |
| Purpose group | Research and market intelligence |
| MIF `conceptType` | `semantic` |
| Target MIF level | 3 |
| Primary source | ESOMAR-style market-research report convention (ethics/conduct code, not a report-format mandate) |

## What this document type is

A market research report is a client-facing deliverable that states a
business question, discloses exactly how the evidence behind the answer was
gathered, presents the findings organized by research objective, and closes
with recommendations that trace back to that evidence. Its defining trait is
the **Methodology section's sampling and fieldwork disclosure**: an explicit
sample frame, sampling method, and sample size, plus a fieldwork summary
(mode, dates, response/completion rate). A report that presents findings
without that disclosure is not a conformant market research report, no matter
how polished the findings read.

The genre follows the widely-used ESOMAR-style report structure —
Background & Objectives, Methodology, Findings, Conclusions & Recommendations,
and a Technical Appendix. That structure is **conventional practice, not a
codified format standard**: ESOMAR/ICC publishes an ethics and conduct code,
not a report-format mandate, and the document must say so plainly rather than
claim ESOMAR conformance. Any reference to ISO 20252 quality practice is
anchored to "verify the current edition live at authoring time," since the
standard is under active revision.

This is distinct from a document that tracks a trajectory over time and
projects it forward (a trend-analysis report), from one that ranks vendors on
two evaluation axes (a competitive-quadrant report), and from a document that
scopes what to build and why before design (a [prd](../prd/) or
[feature-spec](../feature-spec/)).

## How the skill produces one

`market-research-report` is a genre skill: it carries the ESOMAR-style
five-section pattern as durable instructions plus exemplars, and writes the
artifact over a MIF floor so the result is at once a client-readable report
and a machine-conformant unit.

- **Pattern, made operational.** The skill encodes the five required
  sections — Background & Objectives, Methodology, Findings, Conclusions &
  Recommendations, Technical Appendix — and treats the Methodology section's
  sampling and fieldwork disclosure as mandatory, not optional matter: an
  undisclosed sample limitation is a defect, not an omission. It requires
  every claim in Findings to trace to a cited source, requires verification
  verdicts to be reported (`weakened` or `inconclusive` findings are annotated
  rather than dropped; only `falsified` findings are excluded from the
  evidence base), and requires exhaustive coverage of the surviving evidence
  rather than a cherry-picked subset.
- **Exemplars set the bar.** Like every genre in the suite it ships
  `good-l1.md` (the MIF Level-1 floor), `good.md` (the Level-3 target),
  `bad.md` (a counter-example missing the Methodology sampling and fieldwork
  disclosure), and `evals/evals.json`. The `check-exemplars` gate proves
  `good-l1.md` validates at L1 and `good.md` at Level 3.
- **MIF projection.** The document is authored with MIF frontmatter (via the
  shared `mif-frontmatter` substrate) and a `conceptType` of `semantic`,
  reflecting that the report is declarative study knowledge — objectives,
  methodology, findings, recommendations — not a time-bound event or a step
  sequence. `mif-validate` proves the Markdown ↔ JSON-LD round-trip is
  lossless before the document is considered done.

## When it is beneficial

Reach for `market-research-report` when the deliverable is a **complete
market study for clients or stakeholders who must see the sampling basis, the
fieldwork, and traceable evidence before they trust it** — a business
commissioning a study to decide whether and how to act, where the credibility
of the recommendation rests on disclosed methodology as much as on the
findings themselves.

Do **not** use it for tracking how something is changing and projecting it
forward under uncertainty — that is trajectory-and-scenario work, not a
fieldwork-and-sampling study of a market at a point in time. Do not use it for
ranking vendors in a market on two evaluation axes (Completeness of Vision vs.
Ability to Execute, four quadrants, per-vendor strengths and cautions) — that
is a different comparative genre entirely, not a client study with disclosed
sampling and fieldwork. Do not use it to scope what to build and why before
design — that is a [prd](../prd/) or [feature-spec](../feature-spec/). If the
alignment must be grounded in a comparison table of options against decision
drivers rather than a fieldwork study, use [engineering](../engineering/)
instead. The cost is discipline: a report that skips the sampling and
fieldwork disclosure, or silently drops a surviving finding, is not a
conformant market research report.

## Example

A market research report titled *"Household Adoption of AI-Assisted Grocery
List Apps (U.S., 2026)"* opens with the commissioning client's business
question — whether to integrate an AI-assisted grocery-list feature into a
loyalty app — and four research objectives. The Methodology section discloses
a stratified random sample (n = 1,050, stratified by Census region and
income tercile) from a national online panel, a 22-item questionnaire, and
fieldwork run 2026-01-15 to 2026-02-02 with a 27.4% completion rate; it also
records that one analyst projection was `falsified` against the observed
adoption curve and excluded, while a price-sensitivity finding was `weakened`
by conflicting qualitative signal and retained with an explicit uncertainty
flag. Findings report 41% adoption incidence against 78% awareness, a
segment-comparison table with weighted margins of error rendered alongside a
`mermaid xychart-beta` bar chart, and the leading non-adopter barriers.
Conclusions & Recommendations name the awareness-to-trial gap as the primary
obstacle and recommend a phased launch targeting the highest-adoption
segment. The Technical Appendix repeats the sampling, instrument, and
fieldwork detail in full and states the ESOMAR convention-not-standard
caveat.

## Provenance & citations

- **Genre source — ESOMAR-style market-research report convention:** the
  widely-used industry structure for client-facing market studies,
  <https://esomar.org/>; ESOMAR/ICC publishes an ethics and conduct code, not
  a report-format mandate, so the document states that caveat rather than
  claiming ESOMAR conformance.
- **Quality-practice reference — ISO 20252:** market, opinion, and social
  research quality-management practice, checked against the current edition
  live at authoring time since the standard is under active revision,
  <https://www.iso.org/standard/73671.html>.
- **Skill provenance:** authored by the `market-research-report` skill in the
  mif-docs plugin, <https://github.com/modeled-information-format/mif-docs-plugin>;
  the skill's exemplars and `evals/` define and verify the pattern.
- **MIF conformance:** the document projects to canonical JSON-LD under the
  MIF specification, <https://mif-spec.dev>, and is proven lossless by
  `mif-validate`.
- **Index:** this skill is one entry in the [skills by purpose](../../skills-by-purpose/)
  catalog.
</content>
