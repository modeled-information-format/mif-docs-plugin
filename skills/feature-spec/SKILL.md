---
name: feature-spec
description: Write a lightweight, AI-ready Feature Specification — a ~500-2000 token spec with Overview, EARS acceptance criteria, Design, and Edge Cases that an implementer or coding agent can act on directly. Use when a single feature needs a concise build-ready spec. Anti-trigger; for org-wide architecture use arc42-arch-doc, for a decision record use adr, for a multi-feature product doc use prd.
argument-hint: "<the feature to specify>"
---

# feature-spec

Produces a **feature specification**: a short, self-contained document that gives
an implementer (human or coding agent) exactly enough to build one feature
correctly — and no more. It is deliberately lightweight (~500-2000 tokens). It is
not a PRD (no market/persona framing), not an architecture doc (no system-wide
views), and not an ADR (it records *what to build*, not *which option won*).

## Pattern (industry: lightweight AI-ready feature spec)

1. **Overview** — what the feature is and why, in a few sentences. State the user
   value and scope boundary. Keep it brief.
2. **Acceptance Criteria** — the testable contract, written in **EARS** notation
   (see `ears-acceptance-criteria`). Each criterion is one verifiable sentence a
   human and an agent grade identically.
3. **Design** — the approach: key components, interfaces, data shapes, and the
   flow between them. Enough for an implementer to start; not a full design doc.
4. **Edge Cases** — explicit boundary and error behavior. Name each case and the
   required response. This is where most specs fail, so make it concrete.

## Rules that keep it build-ready

- Every acceptance criterion uses an EARS template (Ubiquitous / Event-driven /
  State-driven / Unwanted / Optional). Name a concrete component, not "the app".
- Edge Cases is mandatory and specific: empty input, limits, concurrency,
  failures — each with the expected observable behavior, not "handle errors".
- Design names real components and interfaces; no hand-waving, no `TODO`.
- Stay in scope: one feature. Defer rationale to an ADR and breadth to a PRD,
  linking out rather than inlining.
- Complete enough that an implementer needs no follow-up question to start.

## MIF frontmatter

`type: semantic` — a feature spec is declarative knowledge about a target
behavior, not a time-bound record or a how-to procedure. The L1 floor is `id`,
`type`, `created` + body; climb to L2 with `namespace` (e.g. `spec/feature/...`),
`tags`, and `title`, and to L3 with `modified`, `temporal` validity, `provenance`,
and typed `relationships[]`. Gate every output with `mif-validate` (`--level 1`
minimum).

### Why machine-readable

The frontmatter layer lets an agent answer "is this spec still valid? where did it
come from? what does it depend on?" by reading structured metadata instead of
parsing prose. `templates/good-l1.md` is the same spec at the L1 floor — valid,
but opaque to those queries. `templates/good.md` climbs to **MIF Level 3**, adding
`temporal` validity, `provenance`, and typed `relationships[]` (it is
`derived-from` a PRD and `depends-on` an AI-architecture doc), so the answers come
from frontmatter alone and the document still projects losslessly to JSON-LD.

See `templates/good.md` (a conformant L3 feature spec with EARS criteria and a
real Edge Cases section) and `templates/bad.md` (a prose-only spec with no
acceptance criteria and no edge cases — the most common failure).
