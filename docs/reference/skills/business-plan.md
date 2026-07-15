---
id: reference-skill-business-plan
type: semantic
created: '2026-07-15T13:45:00Z'
modified: '2026-07-15T17:38:50.831Z'
namespace: reference/skills
title: 'Skill reference: business-plan'
tags:
  - reference
  - mif-docs
  - skill
  - business-plan
  - financing
temporal:
  '@type': TemporalMetadata
  validFrom: '2026-07-15T00:00:00Z'
  recordedAt: '2026-07-15T13:45:00Z'
  ttl: P1Y
provenance:
  '@type': Provenance
  sourceType: agent_inferred
  trustLevel: user_stated
  agent: claude-code/claude-sonnet-5
  wasAttributedTo:
    '@id': https://github.com/modeled-information-format
    '@type': prov:Agent
  wasGeneratedBy:
    '@id': urn:mif:activity:claude-code-session:ea349909-51fc-46da-95a3-2043bbcf6bdb
    '@type': prov:Activity
  wasDerivedFrom:
    - '@id': https://github.com/modeled-information-format/mif-docs-plugin
      '@type': prov:Entity
    - '@id': urn:mif:skill:business-plan
      '@type': prov:Entity
  agentVersion: 2.1.210
citations:
  - '@type': Citation
    citationType: specification
    citationRole: background
    title: U.S. Small Business Administration — Write your business plan
    url: https://www.sba.gov/business-guide/plan-your-business/write-your-business-plan
    accessed: '2026-07-15'
  - '@type': Citation
    citationType: specification
    citationRole: background
    title: SCORE — Business Plan Template for a Startup Business
    url: https://www.score.org/resource/template/business-plan-template-a-startup-business
    accessed: '2026-07-15'
  - '@type': Citation
    citationType: specification
    citationRole: methodology
    title: SCORE — Financial Projections Template
    url: https://www.score.org/resource/template/financial-projections-template
    accessed: '2026-07-15'
  - '@type': Citation
    citationType: specification
    citationRole: background
    title: Lean Canvas (Ash Maurya, Running Lean) — Business Model Toolbox
    url: https://bmtoolbox.net/tools/lean-canvas/
    accessed: '2026-07-15'
  - '@type': Citation
    citationType: specification
    citationRole: background
    title: Guy Kawasaki — The Only 10 Slides You Need in Your Pitch
    url: https://guykawasaki.com/the-only-10-slides-you-need-in-your-pitch/
    accessed: '2026-07-15'
  - '@type': Citation
    citationType: tool
    citationRole: source
    title: 'mif-docs — business-plan skill (SKILL.md)'
    url: https://github.com/modeled-information-format/mif-docs-plugin/tree/main/skills/business-plan
relationships:
  - type: relates-to
    target: urn:mif:reference-skills-by-purpose
  - type: relates-to
    target: urn:mif:reference-skill-market-research-report
  - type: relates-to
    target: urn:mif:reference-skill-prd
ontology:
  '@type': OntologyReference
  id: mif-docs
  version: 1.0.0
  uri: https://mif-spec.dev/ontologies/mif-docs
entity:
  name: 'Skill reference: business-plan'
  entity_type: reference-document
extensions:
  x-skill: business-plan
  x-genre-conceptType: semantic
  x-target-level: 3
  x-purpose-group: business-planning
---

# Skill reference: `business-plan`

The `business-plan` skill authors one document genre: a full **investor- and
lender-ready business plan** — a comprehensive, standalone planning document
that states what the business is, who it serves, how it competes, how it
operates, and how it makes and spends money, written so a lender, investor,
or partner can decide whether to fund or work with it from this document
alone. This reference describes what that document type is, how the skill
produces one, when it earns its place, and the provenance behind it.

| Property | Value |
| --- | --- |
| Authors | A full SBA/SCORE-style, Lean-Canvas-informed business plan |
| Purpose group | Business planning |
| MIF `conceptType` | `semantic` |
| Target MIF level | 3 |
| Primary source | SBA/SCORE business-plan convention (guidance and checklist, not a certifying format standard) plus Lean Canvas problem-solution framing |

## What this document type is

A business plan is a standalone deliverable that states a business's
identity, market, competitive position, operations, management, and
financial plan in one document, written so a lender, investor, or partner
can decide whether to fund or work with it without needing any other
source. Its defining trait is the **Financial Plan & Projections section's
disclosed assumptions**: a 3-statement projection (income statement, cash
flow, balance sheet) over a 3-year horizon, a break-even analysis, and every
material assumption behind the projected figures (pricing, unit volume,
growth rate, cost basis) stated explicitly. A plan that presents projected
revenue or profitability without those assumptions is not a conformant
business plan, no matter how polished the narrative reads.

The genre follows the widely-used SBA/SCORE-style structure — Executive
Summary through Appendix — as **conventional practice among lenders and
business counselors, not a single codified format standard**: the SBA
publishes guidance and a checklist, not a certifying format, and the
document must say so rather than claim an "SBA-approved format." Lean
Canvas contributes the Problem/Solution/Unique-Value-Proposition/Unfair-
Advantage framing used within the Company Description, Products &
Services, and Competitive Analysis sections, particularly for early-stage
ventures.

This is distinct from a document that scopes a single feature's build (a
[prd](../prd/) or [feature-spec](../feature-spec/)), a fieldwork-and-sampling
study of a market at a point in time (a
[market-research-report](../market-research-report/)), and a pure technical
trade-off evaluation (an [engineering](../engineering/) report).

## How the skill produces one

`business-plan` is a genre skill: it carries the eleven-section SBA/SCORE
pattern as durable instructions plus exemplars, and writes the artifact over
a MIF floor so the result is at once a lender-readable plan and a
machine-conformant unit.

- **Pattern, made operational.** The skill encodes Executive Summary,
  Company Description, Products & Services, Market Analysis, Competitive
  Analysis, Marketing & Sales Strategy, Operations Plan, Management &
  Organization, Financial Plan & Projections, a genre-conditional Funding
  Request, and Appendix. It treats the Financial Plan's assumption
  disclosure as mandatory, not optional matter, requires every external
  market or competitive claim to trace to a cited source or an explicitly
  labeled assumption, and keeps the Funding Request section conditional on
  whether financing is actually being sought rather than stubbing it with
  invented numbers.
- **Charts stay in-line, no new helper skill.** Revenue, use-of-funds, and
  market-segmentation charts are rendered as fenced `mermaid` blocks
  (`xychart-beta`, `pie`, optionally `quadrantChart`) directly in the
  skill's own instructions — the same convention already used by
  `market-research-report`, `competitive-quadrant`, `trend-analysis`, and
  `c4-model-diagram`. No dedicated diagram-generation helper skill exists
  in this suite, and none was introduced for this genre.
- **Exemplars set the bar.** Like every genre in the suite it ships
  `good-l1.md` (the MIF Level-1 floor), `good.md` (the Level-3 target),
  `bad.md` (a counter-example missing the Financial Plan assumption
  disclosure), and `evals/evals.json`. The `check-exemplars` gate proves
  `good-l1.md` validates at L1 and `good.md` at Level 3.
- **MIF projection.** The document is authored with MIF frontmatter (via the
  shared `mif-frontmatter` substrate) and a `conceptType` of `semantic`,
  reflecting that a business plan is declarative planning knowledge — what
  the business is, how it competes, its financial plan — not a time-bound
  event or a step sequence. `mif-validate` proves the Markdown ↔ JSON-LD
  round-trip is lossless before the document is considered done.

## When it is beneficial

Reach for `business-plan` when the deliverable must justify **business
development, financing, market planning, market research synthesis, or
strategic planning decisions with a disclosed financial plan** — a founder
or operator who needs a single document a lender, investor, or internal
decision-maker can act on without other context.

Do **not** use it to scope a single feature or product's build — that is a
[prd](../prd/) (problem, goals, requirements) or
[feature-spec](../feature-spec/) (the build-ready slice), not a whole-company
plan. Do not use it for a fieldwork-and-sampling study of a market at a
point in time — that is a [market-research-report](../market-research-report/),
which can be commissioned first and then cited as a source within a business
plan's Market Analysis section rather than substituting for the plan. Do not
use it for a pure technical trade-off evaluation — that is
[engineering](../engineering/). Do not use it as a short, standalone decision
brief — that is [exec-summary](../exec-summary/); a business plan's own
Executive Summary section fills this role within the plan, not as a separate
genre invocation. The cost is discipline: a plan that presents financial
projections with no disclosed assumptions, or stubs a Funding Request with
invented numbers when no financing is sought, is not a conformant business
plan.

## Example

A business plan titled *"Meridian Cold-Brew Coffee Co. — Second Location &
Wholesale Expansion (2026)"* opens with an Executive Summary stating the
$150,000 SBA 7(a) financing request and the company's first-year traction
($310,000 revenue, 58% gross margin). Company Description frames the
Lean-Canvas Problem (no mid-price, high-quality grab-and-go cold-brew
option in the target market) and Solution (an 18-hour slow-extraction
process at grab-and-go speed). Financial Plan & Projections discloses
pricing, volume-ramp, and cost-basis assumptions behind a 3-year revenue
projection ($340K / $480K / $640K), rendered as a `mermaid xychart-beta` bar
chart, plus a break-even month and a note that the year-3 figure is a
lower-confidence extrapolation. Funding Request states the $150,000 amount,
use of funds (rendered as a `mermaid pie` chart), and the 10-year SBA 7(a)
term sought.

## Provenance & citations

- **Genre source — SBA business-plan guidance:** the U.S. Small Business
  Administration's guidance and checklist for writing a business plan
  (guidance, not a certifying format), <https://www.sba.gov/business-guide/plan-your-business/write-your-business-plan>.
- **Genre source — SCORE business-plan template convention:** the widely-used
  SCORE startup business-plan template structure,
  <https://www.score.org/resource/template/business-plan-template-a-startup-business>.
- **Financial Plan convention — SCORE financial-projections template:**
  <https://www.score.org/resource/template/financial-projections-template>.
- **Problem-solution framing — Lean Canvas (Ash Maurya):**
  <https://bmtoolbox.net/tools/lean-canvas/>.
- **Investor-narrative discipline — Guy Kawasaki's 10/20/30 rule:**
  <https://guykawasaki.com/the-only-10-slides-you-need-in-your-pitch/>.
- **Skill provenance:** authored by the `business-plan` skill in the
  mif-docs plugin, <https://github.com/modeled-information-format/mif-docs-plugin>;
  the skill's exemplars and `evals/` define and verify the pattern.
- **MIF conformance:** the document projects to canonical JSON-LD under the
  MIF specification, <https://mif-spec.dev>, and is proven lossless by
  `mif-validate`.
- **Index:** this skill is one entry in the [skills by purpose](../../skills-by-purpose/)
  catalog.
