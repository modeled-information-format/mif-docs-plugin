---
id: d73eb9c0-bc46-5239-b98f-af105019d590
type: semantic
created: '2026-07-01T00:00:00Z'
modified: '2026-07-01T00:00:00Z'
namespace: reference/skills
title: 'Skill reference: exec-summary'
tags:
  - reference
  - mif-docs
  - skill
  - exec-summary
  - executive-summary
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
    - '@id': urn:mif:skill:exec-summary
      '@type': prov:Entity
citations:
  - '@type': Citation
    citationType: article
    citationRole: methodology
    title: 'BLUF (Bottom Line Up Front) — U.S. Army writing convention for leading with the conclusion'
    url: https://www.armywriter.com/bluf.htm
    accessed: '2026-07-01'
  - '@type': Citation
    citationType: tool
    citationRole: source
    title: 'mif-docs — exec-summary skill (SKILL.md)'
    url: https://github.com/modeled-information-format/mif-docs-plugin/tree/main/skills/exec-summary
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
  name: 'Skill reference: exec-summary'
  entity_type: reference-document
extensions:
  x-skill: exec-summary
  x-genre-conceptType: semantic
  x-target-level: 3
  x-purpose-group: business-communication
---

# Skill reference: `exec-summary`

The `exec-summary` skill authors one document genre: a **decision-oriented
executive summary** — BLUF, Key Findings, Recommendation, Risks & Caveats — a
1-2 page standalone brief for decision-makers who will act without reading a
full report. This reference describes what that document type is, how the
skill produces one, when it earns its place, and the provenance behind it.

| Property | Value |
| --- | --- |
| Authors | A decision-oriented executive summary |
| Purpose group | Business communication |
| MIF `conceptType` | `semantic` |
| Target MIF level | 3 |
| Primary source | The BLUF (Bottom Line Up Front) writing convention |

## What this document type is

An executive summary is a short, standalone brief for decision-makers —
executives, sponsors, board members — who need the conclusion and the single
recommended action and will not read past page two. Its defining trait is the
**BLUF (Bottom Line Up Front)** — the answer and the recommended action stated
before any context, in a heading that must literally contain "BLUF" so
automated checks can locate it. The document states conclusions and their
business consequence; it does not narrate method, explore alternatives, or
expose intermediate analysis. Length is a hard ceiling of 1-2 pages in
standalone mode: if it grows, the skill cuts rather than continues.

This is distinct from a team-facing technical evaluation with a mandatory
comparison table (an [engineering](../engineering/) report), from a narrative
alignment doc read by engineers before building (a
[google-design-doc](../google-design-doc/)), and from the fuller study or
report the summary would introduce, which the skill never generates itself.

## How the skill produces one

`exec-summary` is a genre skill: it carries the BLUF pattern as durable
instructions plus exemplars, and writes the artifact over a MIF floor so the
result is at once a human-readable brief and a machine-conformant unit.

- **Pattern, made operational.** The skill encodes four required sections —
  BLUF, Key Findings (3-5 bullets, each with its "so what" and a source
  citation), Recommendation (What/Why/How/Risk), and Risks & Caveats (1-3
  failure conditions plus confidence basis) — and enforces active voice, at
  least one quantified finding, and inline numeric citation markers resolving
  to a compact footnote list rather than a bibliography.
- **A composable, additive overlay.** Standalone is the default. When
  requested, the skill can instead render the genre as the leadership-summary
  section of a larger report — the management summary introducing a
  market-research study, or the PTES Executive/Leadership Summary (with
  Posture, Risk Profile, and Roadmap) introducing a pentest report — emitting
  only that section, sized for embedding, never the fuller report's body.
- **Exemplars set the bar.** Like every genre in the suite it ships
  `good-l1.md` (the MIF Level-1 floor), `good.md` (the Level-3 target),
  `bad.md` (a counter-example that buries the recommendation behind background
  and method instead of leading with BLUF), and `evals/evals.json`. The
  `check-exemplars` gate proves `good-l1.md` validates at L1 and `good.md` at
  Level 3.
- **MIF projection.** The document is authored with MIF frontmatter (via the
  shared `mif-frontmatter` substrate) and a `conceptType` of `semantic`,
  reflecting that the doc is declarative decision-and-rationale knowledge, not
  a time-bound event or a step sequence. `mif-validate` proves the Markdown ↔
  JSON-LD round-trip is lossless before the document is considered done.

## When it is beneficial

Reach for `exec-summary` when the deliverable is a short brief for
decision-makers who will act without reading a full report, and the center of
gravity is a single recommendation with its business consequence stated
before any context. It shines whenever a decision needs to move fast on a
one-to-two-page read, whether standalone or embedded as the leadership-summary
section of a fuller report.

Do **not** use it for the fuller study or report this summary would
introduce — that is [feature-spec](../feature-spec/) or a
requirements/architecture genre depending on what is being scoped, since this
genre only produces the leadership-summary section and never the full body.
Do not use it for a team-facing technical evaluation with a comparison
table — that is [engineering](../engineering/). Do not use it for a narrative
alignment doc read by engineers before building — that is
[google-design-doc](../google-design-doc/).

## Example

An executive summary titled *"Executive Summary: Data Warehouse
Consolidation"* opens with the BLUF: approve consolidating three regional
data-warehouse platforms (Snowflake, BigQuery, Redshift) onto a single
Snowflake instance within 90 days, since running three in parallel costs
$2.4M/year against $600K/year consolidated. Key Findings cite the duplicate
storage and compute spend, the query-latency parity Snowflake already meets,
the 6-engineer-week estimate from a completed EU-region pilot, and the
90-day contract-renewal window. The Recommendation states What (retire
BigQuery and Redshift), Why (eliminate $1.8M/year in duplicate spend), How
(reuse the EU pilot's runbook before renewal), and Risk (a missed renewal
deadline forces another year of triple-platform spend). Risks & Caveats
name the single-pilot basis for the effort estimate, the renewal-deadline
dependency, and the load-dependent latency assumption, and two footnotes
resolve the inline citation markers.

## Provenance & citations

- **Genre source — BLUF:** the Bottom Line Up Front convention of leading
  written communication with the conclusion and recommended action before any
  supporting context, <https://www.armywriter.com/bluf.htm>.
- **Skill provenance:** authored by the `exec-summary` skill in the mif-docs
  plugin, <https://github.com/modeled-information-format/mif-docs-plugin>; the
  skill's exemplars and `evals/` define and verify the pattern.
- **MIF conformance:** the document projects to canonical JSON-LD under the MIF
  specification, <https://mif-spec.dev>, and is proven lossless by `mif-validate`.
- **Index:** this skill is one entry in the [skills by purpose](../../skills-by-purpose/)
  catalog; its business-communication siblings include
  [engineering](../engineering/) and [google-design-doc](../google-design-doc/).
</content>
