---
id: 19abffc8-4fbd-50a6-8d32-7e80996d8077
type: semantic
created: '2026-07-01T00:00:00Z'
modified: '2026-07-01T00:00:00Z'
namespace: reference/skills
title: 'Skill reference: trend-analysis'
tags:
  - reference
  - mif-docs
  - skill
  - trend-analysis
  - foresight
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
    - '@id': urn:mif:skill:trend-analysis
      '@type': prov:Entity
citations:
  - '@type': Citation
    citationType: documentation
    citationRole: methodology
    title: 'IEA, Electricity 2024'
    url: https://www.iea.org/reports/electricity-2024
    accessed: '2026-02-20'
  - '@type': Citation
    citationType: tool
    citationRole: source
    title: 'mif-docs — trend-analysis skill (SKILL.md)'
    url: https://github.com/modeled-information-format/mif-docs-plugin/tree/main/skills/trend-analysis
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
  name: 'Skill reference: trend-analysis'
  entity_type: reference-document
extensions:
  x-skill: trend-analysis
  x-genre-conceptType: semantic
  x-target-level: 3
  x-purpose-group: research-and-market-intelligence
---

# Skill reference: `trend-analysis`

The `trend-analysis` skill authors one document genre: a **trajectory
report** — a foresight deliverable that states the current direction of
change, the observable signals behind it, the forces driving and dampening
it, and the plausible forward scenarios so a reader can plan against an
uncertain future. This reference describes what that document type is, how
the skill produces one, when it earns its place, and the provenance behind
it.

| Property | Value |
| --- | --- |
| Authors | A trajectory report (trend analysis / foresight report) |
| Purpose group | Research & market intelligence |
| MIF `conceptType` | `semantic` |
| Target MIF level | 3 |
| Primary source | IFTF/WEF/APF-style foresight-report convention |

## What this document type is

A trend-analysis report is a **foresight deliverable**, not a snapshot: it
exists to say where something is headed, not just where it stands. Its
defining trait is the mandatory **trajectory or scenario diagram** — a
time-series trajectory rendered as a Mermaid `xychart-beta`, a
scenario-evolution diagram rendered as a Mermaid `stateDiagram-v2`, or both
when the data supports it. A report with no such figure is not a conformant
trend-analysis deliverable, because a trend without a time-anchored visual is
narration, not analysis. The report proceeds through Trajectory (the current
direction of change and its recent history), Signals (observable indicators,
each cited and classed leading or lagging), Drivers & Inhibitors (the forces
accelerating or dampening the trend), Scenarios (2 to 4 plausible forward
paths over a stated horizon with their triggers and confidence), and
Implications & Watch-list (what to monitor going forward). It follows the
widely-used IFTF/WEF/APF foresight-report pattern, which is conventional
practice rather than a codified standard — no standards body has formalized
a foresight/trend-report format, and the report itself must say so rather
than claim conformance to a named standard.

This is distinct from a fieldwork-and-sampling study of a market at a point
in time (a market-research-report) and from ranking vendors on two
evaluation axes (a competitive-quadrant) — both project a market's present
state rather than its trajectory over time. It is also distinct from a
decision proposal: it does not scope what to build, so it projects to MIF as
`semantic` content rather than a requirements or design document.

## How the skill produces one

`trend-analysis` is a genre skill: it carries the trajectory-report pattern
as durable instructions plus exemplars, and writes the artifact over a MIF
floor so the result is at once a human-readable report and a
machine-conformant unit.

- **Pattern, made operational.** The skill encodes the five required
  sections and treats the trajectory/scenario diagram as mandatory rather
  than optional matter, anchors every trajectory claim in time, separates
  observed signal from projected scenario, states confidence per scenario,
  and requires the convention-not-standard caveat to be stated plainly. It
  adds two opt-in, additive sub-structures — a STEEP/PESTLE environmental
  scan and a methodology appendix — that render only when explicitly
  requested, leaving the five-section default unchanged otherwise.
- **Exemplars set the bar.** Like every genre in the suite it ships
  `good-l1.md` (the MIF Level-1 floor), `good.md` (the Level-3 target),
  `bad.md` (a counter-example — a report that asserts a single forward
  scenario as settled fact with no trajectory or scenario diagram anywhere),
  and `evals/evals.json`. The `check-exemplars` gate proves `good-l1.md`
  validates at L1 and `good.md` at Level 3.
- **MIF projection.** The document is authored with MIF frontmatter (via the
  shared `mif-frontmatter` substrate) and a `conceptType` of `semantic`,
  reflecting that the report is declarative trajectory-and-scenario
  knowledge rather than a time-bound event or step sequence. `mif-validate`
  proves the Markdown ↔ JSON-LD round-trip is lossless before the document
  is considered done.

## When it is beneficial

Reach for `trend-analysis` when the deliverable must **track how something
is changing and project it forward under uncertainty** — a technology
adoption curve, a demand trajectory, a regulatory or social shift — and a
reader needs to plan against multiple plausible futures rather than a single
forecast. The mandatory trajectory/scenario diagram and the signal-vs-driver
discipline are the artifact's reason to exist: they force the report to
distinguish what has actually been observed from what is merely projected.

Do **not** use it for a fieldwork-and-sampling study of a market at a point
in time — that calls for a market-research-report's Background &
Objectives, mandatory sampling and fieldwork disclosure, Findings, and
Conclusions & Recommendations, not a trajectory over a time horizon. Do
**not** use it to rank vendors in a market on two evaluation axes — that is
a competitive-quadrant, built around Completeness of Vision vs. Ability to
Execute and per-vendor strengths/cautions, not a trend over time. And do not
use it to scope what to build and why before design — that is a
[prd](../prd/) or [feature-spec](../feature-spec/). Where a comparison-table
decision report is what is actually needed, use
[engineering](../engineering/) instead.

## Example

A trend-analysis report titled *"Trend Analysis: Global Data Center
Electricity Demand"* opens with an as-of date and a horizon through 2030,
states the Trajectory (data center electricity consumption rising steadily
since 2022, driven by cloud growth and AI buildout, per the IEA's
*Electricity 2024* projection of roughly doubled demand) alongside a Mermaid
`xychart-beta` plotting the trajectory from 2022 through 2030. Signals
classify hyperscaler AI infrastructure capex and utility large-load
interconnection requests as leading indicators, and metered electricity
consumption as a lagging one. Drivers & Inhibitors weighs continued AI
workload growth and on-premise migration against grid interconnection
queues, chip supply constraints, and efficiency gains. Scenarios lay out
three forward paths — efficiency-tempered growth, grid-constrained plateau,
and unconstrained AI buildout — each with a trigger and a confidence level,
paired with a Mermaid `stateDiagram-v2` showing the branch from the current
trajectory to each scenario. Implications & Watch-list closes with the
concrete indicators (capex guidance, interconnection queue lengths,
accelerator efficiency claims) that would confirm or break each scenario,
and a References list resolving the inline `[1]` citation to the IEA report.

## Provenance & citations

- **Genre source — IFTF/WEF/APF foresight-report convention:** a
  trajectory/signals/drivers/scenarios pattern used broadly across
  institutional foresight practice; not a codified standards-body format,
  which the report itself must disclose.
- **Exemplar source — IEA, *Electricity 2024*:** the report's `good.md`
  exemplar grounds its trajectory claim in this projection,
  <https://www.iea.org/reports/electricity-2024>.
- **Skill provenance:** authored by the `trend-analysis` skill in the
  mif-docs plugin, <https://github.com/modeled-information-format/mif-docs-plugin>;
  the skill's exemplars and `evals/` define and verify the pattern.
- **MIF conformance:** the document projects to canonical JSON-LD under the
  MIF specification, <https://mif-spec.dev>, and is proven lossless by
  `mif-validate`.
- **Index:** this skill is one entry in the
  [skills by purpose](../../skills-by-purpose/) catalog; its research and
  decision-adjacent sibling is [engineering](../engineering/).
</content>
