---
name: svg-charts
description: Generate a standalone, brand-colorable SVG chart file (bar, line, pie, or combo) for cases the suite's default Mermaid-in-markdown convention cannot cover — more than roughly five pie or bar segments, custom per-series colors, log scales, or multi-series combo charts — saved as a real file and embedded via an img tag, since GitHub strips inline svg markup from rendered markdown. Use when a genre skill's chart need exceeds Mermaid's documented limits.
argument-hint: "<chart type: bar|line|pie|combo> <data + labels> [--colors #hex,#hex,...] [--output path.svg]"
---

# svg-charts

Shared helper (not a standalone document genre). Produces a real, standalone
**`.svg` file** — never inline `<svg>` markup pasted into a document body —
for chart needs the suite's default embedded-Mermaid convention (see
`market-research-report`, `competitive-quadrant`, `trend-analysis`,
`c4-model-diagram`, `business-plan`) cannot cover.

## Why a separate file, not inline markup

GitHub Flavored Markdown strips embedded `<svg>` elements from rendered
markdown for XSS/security reasons; SVG only renders there via an `<img>` tag
pointing at a **separate file**, never inline in the markdown body. Since
every MIF document this suite produces is read as rendered markdown (GitHub
PRs, repository browsing, Starlight sites), a chart helper that emitted
inline SVG markup into the document body would silently fail to render on
GitHub — the primary surface these documents are viewed on. `svg-charts`
therefore always writes a real `.svg` file next to the document and returns
the `<img src="...">` line to embed — never raw markup for the body.

Source: GitHub strips embedded `<svg>` elements; only an `<img>` pointing to
an external file renders — <https://alexwlchan.net/notes/2024/how-to-render-svgs-on-github/>,
<https://github.com/orgs/community/discussions/151372>.

## When to reach for this instead of Mermaid

**Stay with the default embedded-Mermaid convention** (`xychart-beta`,
`pie`, `quadrantChart` — see `market-research-report`,
`competitive-quadrant`, `trend-analysis`, `c4-model-diagram`, or
`business-plan`) for anything within its documented range: simple bar/line
trend charts, a cost or use-of-funds breakdown of five or fewer segments,
standard-theme colors. Mermaid renders natively and inline on GitHub with no
extra file to manage — do not reach for `svg-charts` when Mermaid already
covers the need.

**Reach for `svg-charts` instead** when the chart genuinely needs something
Mermaid cannot do:

- **More than roughly five pie or bar segments** — Mermaid pie-chart labels
  collide and become unreadable past about five slices.
- **Brand-specific or per-series custom colors** — Mermaid assigns colors
  from its fixed theme palette only; its base syntax has no per-slice or
  per-series color override.
- **Log scales, error bars, or multi-series combo charts** (e.g. a
  bar-plus-line revenue/margin overlay) — outside Mermaid's chart grammar
  entirely.

Sources on these specific limits: <https://www.mermaidcreator.com/blog/mermaid-pie-bar-chart-metrics-visualization>,
<https://www.pkgpulse.com/guides/mermaid-vs-d3-vs-chartjs-diagrams-data-visualization-2026>.

## Output contract

1. Generate one self-contained `.svg` file (inline `<style>`/attributes
   only — no external font, script, or CSS references) at the given or a
   sibling `--output` path, alongside the document that will embed it.
2. Return the exact `<img src="<relative-path>" alt="<chart title>">` line
   for the calling skill to embed in the document body — never raw
   `<svg>...</svg>` markup, which will not render on GitHub.
3. Apply the calling document's stated brand colors when supplied
   (`--colors`); otherwise use a small, colorblind-safe default palette and
   say so explicitly rather than guessing brand intent.
4. Keep the chart static: no `<script>`, no animation, no interactivity.
   Pitch-deck research is explicit that investors want clarity over
   decoration, not interactive flourishes: <https://slidemodel.com/financial-projections-slide-pitch-deck/>.
5. Label every value directly on the chart (bar/segment labels, not a
   separate legend the reader must cross-reference) — the same
   don't-make-the-reader-do-math principle the pitch-deck research names.

## Anti-triggers — do not use this helper for

- **Anything within Mermaid's documented range** — five or fewer
  pie/bar segments, a simple trend line, standard-theme colors. Adding a
  generated file and an `<img>` reference where a `mermaid` code block
  would already work is unnecessary indirection.
- **Interactive or drill-down visualizations** — this helper only emits
  static SVG; an interactive chart is out of scope for a document meant to
  be read as plain rendered markdown.

## Example

A `business-plan` document names seven wholesale-grocer accounts (too many
for a readable Mermaid pie) and wants each shown in the company's own brand
colors. It calls `svg-charts` for a bar chart of per-account revenue share
in those colors, gets back `assets/wholesale-account-share.svg` plus
`<img src="assets/wholesale-account-share.svg" alt="Wholesale account revenue share">`,
and embeds that line in its Market Analysis section instead of a `mermaid
pie` block, which could not have rendered all seven accounts legibly.
