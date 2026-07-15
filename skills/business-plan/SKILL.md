---
name: business-plan
description: Write a full investor- and lender-ready business plan — Executive Summary, Company Description, Products & Services, Market Analysis, Competitive Analysis, Marketing & Sales Strategy, Operations Plan, Management & Organization, Financial Plan & Projections, Funding Request, and Appendix — grounded in SBA/SCORE convention and Lean Canvas problem-solution framing. Use when the deliverable is a comprehensive plan for business development, financing, market planning, market research synthesis, or strategic planning that must stand alone for a lender, investor, or partner. Anti-trigger; for a single feature's build scope use prd, for a fieldwork-sampled market study use market-research-report, for a pure technical trade-off evaluation use engineering.
argument-hint: "<the business or venture to plan>"
---

# business-plan

Produces a full **business plan**: a comprehensive, standalone planning
document that states what the business is, who it serves, how it competes,
how it operates, and how it makes and spends money — written so a lender,
investor, or partner can decide whether to fund or work with it from this
document alone. Its center of gravity is the **Financial Plan &
Projections section's disclosed assumptions** — a plan that presents
projected revenue or profitability without disclosing the assumptions behind
them (pricing, unit volume, cost basis, growth rate) is not a conformant
business plan, no matter how polished the narrative reads.

This genre follows the widely-used SBA/SCORE-style business-plan structure —
**conventional practice among lenders and business counselors, not a single
codified format standard** — supplemented by Lean Canvas's problem-solution
framing for early-stage ventures. State this plainly rather than claiming
"SBA-approved" or "SBA-required" format; the SBA publishes guidance and a
checklist, not a certifying format standard.

## Pattern (industry: SBA/SCORE-style business plan, Lean Canvas problem framing)

1. **Executive Summary** — a one-to-two page snapshot: what the business
   does, who it serves, how it makes money, its traction to date, and (if
   seeking financing) how much and why. Written last, placed first.
2. **Company Description** — legal entity, structure, formation date and
   state, ownership, mission, and the problem the company exists to solve
   (Lean Canvas's **Problem** block: the target customer's top 1-3 pain
   points) and its **Solution**.
3. **Products & Services** — what is offered, pricing, and the **Unique
   Value Proposition**: the single, clear message that states why the
   business is different and worth buying from.
4. **Market Analysis** — target market size and segments, customer profile,
   and buying criteria, supported by cited research, not assertion.
5. **Competitive Analysis** — named competitors, their strengths and
   weaknesses, and this business's **Unfair Advantage** (something a
   competitor cannot easily copy or buy).
6. **Marketing & Sales Strategy** — positioning, channels to reach
   customers, pricing/distribution strategy, and the sales process.
7. **Operations Plan** — how the business runs day to day: location,
   suppliers, facilities/equipment, and key operational milestones.
8. **Management & Organization** — legal structure, the management team and
   their relevant qualifications, org chart, and staffing plan.
9. **Financial Plan & Projections** — see *Rules*, below; this section is
   the genre's mandatory core.
10. **Funding Request** *(only when financing is sought)* — amount
    requested, use of funds, and terms sought. Omitted cleanly (not stubbed
    with placeholder numbers) for a self-funded or internal-strategy plan.
11. **Appendix** — supporting detail: resumes, permits/licenses, leases,
    letters of intent, detailed financial schedules.

## Rules that keep it a business plan

- **The Financial Plan & Projections section's disclosed assumptions are
  mandatory, not optional matter.** At minimum: a 3-statement projection
  (income statement, cash flow statement, balance sheet) covering a 3-year
  horizon — monthly detail for year 1, quarterly for year 2, annual for
  year 3 is the investor-ready convention — plus a break-even analysis, and
  every material assumption stated explicitly (unit pricing, volume/growth
  rate, cost basis, hiring plan). An unlabeled number with no stated
  assumption behind it is a defect, not a simplification.
- **Every external market, competitive, or industry claim traces to a cited
  source or an explicitly labeled assumption** — never a bare, unsourced
  statistic. Where the drafting context and any available research (e.g. a
  prior `market-research-report` or `mif-corpus` search hit) leave a gap,
  gather it live (web research) or elicit it from the author; if neither
  resolves it, state the gap and the assumption used to bridge it in the
  same sentence as the figure it supports. This is how the genre earns
  reader confidence without asserting false precision.
- **The Funding Request section is genre-conditional**: include it, fully
  specified (amount, use of funds, terms), only when the plan seeks
  financing. Do not stub it with invented numbers for an internal or
  self-funded plan — omit the section and say why in the Executive Summary
  instead.
- Render every financial or market chart within Mermaid's range as a
  fenced `mermaid` code block — `xychart-beta` for revenue/cash-flow
  trajectories, `pie` for market segmentation or use-of-funds breakdown of
  five or fewer segments, `quadrantChart` for competitive positioning if
  used — never ASCII art, or Graphviz/DOT. This follows the same
  convention `market-research-report`, `competitive-quadrant`,
  `trend-analysis`, and `c4-model-diagram` already use in this suite. When
  a chart exceeds that range (more than roughly five segments, or a
  specific brand color palette), invoke the `svg-charts` skill instead
  (see below) rather than forcing it into a Mermaid block that would
  render illegibly.
- Hedge projections honestly: state the confidence basis for a projection
  (historical actuals, comparable-company benchmark, or a stated assumption)
  rather than presenting every number with uniform certainty.

## Charts/graphics: Mermaid by default, `svg-charts` when it isn't enough

This genre needs revenue, market-segmentation, competitor, and use-of-funds
charts, plus an optional org chart. Two things are true at once, both
grounded in checked evidence rather than assumption:

- **Mermaid covers most of it, and stays the default.** Every
  diagram-bearing genre already in this suite (`market-research-report`,
  `competitive-quadrant`, `trend-analysis`, `c4-model-diagram`) embeds its
  chart guidance directly in its own `SKILL.md` as fenced `mermaid`
  blocks; `business-plan` does the same for anything within Mermaid's
  documented range (see the *Rules* section above).
- **Mermaid has real, documented limits this genre will hit**: pie-chart
  labels collide past roughly five slices, its base syntax has no
  per-segment custom-color override (colors come from a fixed theme), and
  it has no log-scale or multi-series combo support
  (<https://www.mermaidcreator.com/blog/mermaid-pie-bar-chart-metrics-visualization>,
  <https://www.pkgpulse.com/guides/mermaid-vs-d3-vs-chartjs-diagrams-data-visualization-2026>).
  A business plan with more than five named competitors, or one that needs
  to match a company's actual brand colors, will hit these limits in
  practice, not hypothetically.

For those cases this genre invokes the **`svg-charts`** helper skill,
which generates a standalone `.svg` file (never inline markup — GitHub
strips embedded `<svg>` elements from rendered markdown, so inline SVG
would silently fail to render on the primary surface these documents are
viewed on: <https://alexwlchan.net/notes/2024/how-to-render-svgs-on-github/>)
and returns the `<img src="...">` line to embed. See the `svg-charts`
skill for its full decision rule and output contract.

## Anti-triggers — do not use this genre for

- **Scoping a single feature or product's build** — that is `prd` (problem,
  goals, requirements for what to build) or `feature-spec` (the build-ready
  slice), not a whole-company plan for financing or strategy.
- **A fieldwork-and-sampling study of a market at a point in time** — that
  is `market-research-report`: disclosed sample frame, method, and fieldwork
  basis, not a company's own plan with financial projections and (optionally)
  a funding ask.
- **A pure technical trade-off evaluation** — that is `engineering`: a
  mandatory options-vs-criteria comparison table, not a business's
  operating and financial plan.
- **A short, standalone decision brief for a reader with no time for the
  full plan** — that is `exec-summary`. A business plan's own Executive
  Summary section serves this role *within* the plan; it is not a separate
  genre invocation.
- **Tracking how a market is changing and projecting it forward** — that is
  `trend-analysis`, not a single business's own operating plan.

## MIF frontmatter

`type: semantic` — a business plan is declarative planning knowledge (what
the business is, how it competes, its financial plan), not a time-bound
event or a step sequence. Climb to L2 with `namespace`
(`business-plan/<area>`), `modified`, `title`, and `tags` when the drafting
context supplies them. Climb to L3 with `provenance`, `citations[]` tied to
every sourced market/financial claim, and `relationships[]` (e.g.
`relates-to` a companion `market-research-report` or `prd` for the same
venture) when the plan is sourced from real, attributable input. Gate every
output with `mif-validate` at its target level; the floor is `--level 1`.

## Why machine-readable — the point of MIF here

| Question an agent asks | Answered by (frontmatter) |
| --- | --- |
| Is this plan's financial model still current, or has it gone stale? | `temporal.validFrom` / `ttl` |
| Where did a market or competitive claim come from; can it be trusted? | `provenance` (W3C-PROV) + `citations[]` |
| What related plan, PRD, or market study does this connect to? | typed `relationships[]` (`relates-to`, `supersedes`) |
| Which figures were sourced vs. assumed, and by whom? | `citations[]` tied to each claim; unsourced figures are labeled assumptions in prose |

The same document still reads as a fundable business plan and projects
losslessly to JSON-LD and back — one artifact, two readers.

## The L1 -> L3 climb (two exemplars)

This genre ships the **same plan at two MIF levels** so the climb is
explicit:

- `templates/good-l1.md` — **L1 floor**: `id`, `type`, `created` + body. A
  complete, valid business plan, but opaque to a machine consumer.
- `templates/good.md` — **L3 (highest this genre supports)**: adds
  `namespace`, `modified`, `temporal` validity, W3C-PROV `provenance`,
  `citations[]` tied to the market/financial claims, and a typed
  `relationships[]` graph.

Author at the **highest level the drafting context supports** (grade down
rather than fabricate). `templates/bad.md` shows the antipattern: a plan
that presents revenue projections and a funding ask with no disclosed
assumptions anywhere — the genre's single most load-bearing requirement,
missing.

## Sources consulted for this genre's structure

1. U.S. Small Business Administration — Write your business plan, <https://www.sba.gov/business-guide/plan-your-business/write-your-business-plan>
2. SCORE — Business Plan Template for a Startup Business, <https://www.score.org/resource/template/business-plan-template-a-startup-business>
3. Ash Maurya, *Running Lean* / Lean Canvas — Business Model Toolbox, <https://bmtoolbox.net/tools/lean-canvas/>
4. SCORE — Financial Projections Template, <https://www.score.org/resource/template/financial-projections-template>
5. Guy Kawasaki — The Only 10 Slides You Need in Your Pitch (10/20/30 rule,
   investor-facing narrative discipline),
   <https://guykawasaki.com/the-only-10-slides-you-need-in-your-pitch/>
