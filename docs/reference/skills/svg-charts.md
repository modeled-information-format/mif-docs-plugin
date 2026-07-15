---
id: reference-skill-svg-charts
type: semantic
created: '2026-07-15T18:00:00Z'
modified: '2026-07-15T18:00:00Z'
namespace: reference/skills
title: 'Skill reference: svg-charts'
tags:
  - reference
  - mif-docs
  - skill
  - svg
  - charts
temporal:
  '@type': TemporalMetadata
  validFrom: '2026-07-15T00:00:00Z'
  recordedAt: '2026-07-15T18:00:00Z'
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
    - '@id': urn:mif:skill:svg-charts
      '@type': prov:Entity
citations:
  - '@type': Citation
    citationType: article
    citationRole: background
    title: 'SVGs are only rendered on GitHub if you use an <img> that points to another file'
    url: https://alexwlchan.net/notes/2024/how-to-render-svgs-on-github/
    accessed: '2026-07-15'
  - '@type': Citation
    citationType: article
    citationRole: background
    title: 'GitHub Community Discussion #151372 — why GitHub Markdown does not allow inline SVG'
    url: https://github.com/orgs/community/discussions/151372
    accessed: '2026-07-15'
  - '@type': Citation
    citationType: article
    citationRole: methodology
    title: Mermaid vs D3.js vs Chart.js — Visualization 2026
    url: https://www.pkgpulse.com/guides/mermaid-vs-d3-vs-chartjs-diagrams-data-visualization-2026
    accessed: '2026-07-15'
  - '@type': Citation
    citationType: article
    citationRole: methodology
    title: Visualizing metrics with Mermaid pie and bar chart diagrams
    url: https://www.mermaidcreator.com/blog/mermaid-pie-bar-chart-metrics-visualization
    accessed: '2026-07-15'
  - '@type': Citation
    citationType: article
    citationRole: background
    title: 'Financial Projections Slide in Pitch Decks: What Investors Expect to See'
    url: https://slidemodel.com/financial-projections-slide-pitch-deck/
    accessed: '2026-07-15'
  - '@type': Citation
    citationType: tool
    citationRole: source
    title: 'mif-docs — svg-charts skill (SKILL.md)'
    url: https://github.com/modeled-information-format/mif-docs-plugin/tree/main/skills/svg-charts
relationships:
  - type: relates-to
    target: urn:mif:reference-skills-by-purpose
  - type: relates-to
    target: urn:mif:reference-skill-business-plan
  - type: relates-to
    target: urn:mif:reference-skill-market-research-report
ontology:
  '@type': OntologyReference
  id: mif-docs
  version: 1.0.0
  uri: https://mif-spec.dev/ontologies/mif-docs
entity:
  name: 'Skill reference: svg-charts'
  entity_type: reference-document
extensions:
  x-skill: svg-charts
  x-genre-conceptType: substrate
  x-target-level: 2
  x-purpose-group: authoring-helpers
---

# Skill reference: `svg-charts`

The `svg-charts` skill is a **substrate helper**: it generates a standalone,
brand-colorable `.svg` chart file for the specific cases the suite's default
embedded-Mermaid convention cannot cover, and returns the `<img>` line a
calling genre skill embeds in its document body. This reference describes
why a separate file (not inline markup) is required, how the skill produces
one, when it earns its place over the default Mermaid convention, and its
sources.

| Property | Value |
| --- | --- |
| Authors | A standalone `.svg` chart file plus its embed line |
| Purpose group | Authoring helpers |
| MIF `conceptType` | `substrate` |
| Target MIF level | 2 |
| Primary constraint | GitHub strips inline `<svg>` markup from rendered markdown |

## What this document type is

`svg-charts` does not author a document genre; it authors one artifact — a
real `.svg` file — plus the exact `<img src="...">` line a genre skill
embeds to reference it. The reason this is a file and not markup pasted
into the document body is a rendering constraint, not a stylistic choice:
GitHub Flavored Markdown strips embedded `<svg>` elements from rendered
markdown for XSS/security reasons, and only renders SVG through an `<img>`
tag pointing at a separate file. Since every MIF document this suite
produces is read as rendered markdown — GitHub PRs, repository browsing,
Starlight sites — a helper that emitted inline `<svg>...</svg>` markup into
a document body would silently fail to render on GitHub, the primary
surface these documents are viewed on.

## How the skill produces one

`svg-charts` carries a narrow decision rule plus an output contract as
durable instructions.

- **When to use it, not Mermaid.** The suite's default is embedded Mermaid
  (`xychart-beta`, `pie`, `quadrantChart`), used directly in `SKILL.md` by
  `market-research-report`, `competitive-quadrant`, `trend-analysis`,
  `c4-model-diagram`, and `business-plan` — and that stays the default for
  anything within its documented range. `svg-charts` is reached for only
  when a chart genuinely needs something Mermaid's base syntax cannot do:
  more than roughly five pie or bar segments (labels collide past that
  point), custom per-series or brand-specific colors (Mermaid assigns from
  a fixed theme palette only), or a log scale, error bars, or multi-series
  combo chart.
- **Output contract.** One self-contained `.svg` file (inline
  styles/attributes only, no external font/script/CSS references) written
  alongside the document that will embed it, plus the exact `<img>` line to
  paste into the body — never raw markup. Static only: no `<script>`, no
  interactivity, matching what pitch-deck research says investors actually
  want (clarity over decoration).
- **Eval cases.** The skill ships `evals/evals.json` covering the
  Mermaid-is-sufficient case (declines to over-engineer), the
  over-Mermaid's-limit case (generates a file), the inline-markup
  anti-request (refuses and explains why), and the log-scale case. As a
  substrate helper it carries no `templates/` exemplars; the
  `check-exemplars` gate applies only to the genre skills.

## When it is beneficial

Reach for `svg-charts` from within a genre skill's own instructions —
`business-plan`'s `SKILL.md` cross-references it exactly as
`ears-acceptance-criteria` is referenced by `prd` — whenever a chart's
segment count, color requirement, or scale genuinely exceeds Mermaid's
documented range. It is not a document genre on its own and never invoked
directly to produce a whole document; it produces one supporting asset for
a genre skill that needs it.

Do **not** reach for it when Mermaid already covers the need — five or
fewer segments in standard colors, a simple trend line — since a generated
file and an `<img>` reference is unnecessary indirection over a `mermaid`
code block that already renders inline with nothing else to manage. Do not
use it for interactive or drill-down visualization; it only emits static
SVG.

## Example

A `business-plan` document names seven wholesale-grocer accounts in the
company's own brand colors — too many segments and too specific a palette
for Mermaid's fixed-theme pie chart. `svg-charts` generates
`assets/wholesale-account-share.svg` and returns
`<img src="assets/wholesale-account-share.svg" alt="Wholesale account revenue share">`,
which `business-plan` embeds in its Market Analysis section in place of a
`mermaid pie` block that could not have rendered all seven accounts
legibly.

## Provenance & citations

- **Rendering constraint — GitHub strips inline SVG:**
  <https://alexwlchan.net/notes/2024/how-to-render-svgs-on-github/>,
  <https://github.com/orgs/community/discussions/151372>.
- **Mermaid's documented limits (pie-slice legibility, fixed theme
  palette, no log/combo support):**
  <https://www.mermaidcreator.com/blog/mermaid-pie-bar-chart-metrics-visualization>,
  <https://www.pkgpulse.com/guides/mermaid-vs-d3-vs-chartjs-diagrams-data-visualization-2026>.
- **Chart design expectations for investor-facing documents:**
  <https://slidemodel.com/financial-projections-slide-pitch-deck/>.
- **Skill provenance:** authored by the `svg-charts` skill in the mif-docs
  plugin, <https://github.com/modeled-information-format/mif-docs-plugin>.
- **MIF conformance:** projects to canonical JSON-LD under the MIF
  specification, <https://mif-spec.dev>, proven lossless by
  [mif-validate](../mif-validate/).
- **Index:** one entry in the [skills by purpose](../../skills-by-purpose/)
  catalog; used by [business-plan](../business-plan/) and available to any
  other genre that hits Mermaid's limits.
