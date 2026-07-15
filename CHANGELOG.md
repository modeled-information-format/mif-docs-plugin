---
id: changelog-mif-docs
type: episodic
created: '2026-06-30T00:00:00Z'
modified: '2026-07-15T22:08:15.648Z'
namespace: changelog/mif-docs
title: Changelog
tags:
  - changelog
  - release-notes
  - mif-docs
temporal:
  '@type': TemporalMetadata
  validFrom: '2026-06-30T00:00:00Z'
  recordedAt: '2026-06-30T00:00:00Z'
ontology:
  '@type': OntologyReference
  id: mif-docs
  version: 1.0.0
  uri: https://mif-spec.dev/ontologies/mif-docs
provenance:
  '@type': Provenance
  sourceType: agent_inferred
  trustLevel: user_stated
  agent: claude-code/claude-sonnet-5
  wasAttributedTo:
    '@id': https://github.com/modeled-information-format
    '@type': prov:Agent
  wasGeneratedBy:
    '@id': urn:mif:activity:claude-code-session:08717ff4-a47e-4c0a-9fa5-59ce2b2db70a
    '@type': prov:Activity
  wasDerivedFrom:
    - '@id': urn:mif:release:mif-docs-v0.1.0
      '@type': prov:Entity
  agentVersion: 2.1.210
citations:
  - '@type': Citation
    citationType: specification
    citationRole: methodology
    title: 'Keep a Changelog 1.1.0 — the changelog format this file follows'
    url: https://keepachangelog.com/en/1.1.0/
    accessed: '2026-06-30'
  - '@type': Citation
    citationType: specification
    citationRole: methodology
    title: 'Semantic Versioning 2.0.0 — the version scheme this project adheres to'
    url: https://semver.org/spec/v2.0.0.html
    accessed: '2026-06-30'
entity:
  name: mif-docs
  entity_type: changelog
extensions:
  x-changelog-format: keep-a-changelog-1.1.0
---

# Changelog

All notable changes to the **mif-docs** Claude Code plugin are documented here.
The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.6.3] - 2026-07-15

### Fixed

- `mif-to-pdf`: every drawn word/line was positioned with its own absolute
  coordinates and no space or newline character in its actual text content
  — visually correct, but a naive text extractor (copy-paste in most PDF
  viewers, `pdftotext` without `-layout`, screen readers, most real-world
  PDF-to-text pipelines) reads the raw content stream in order with no
  geometric reconstruction, so the entire document's text ran together with
  zero separation between every single word and line (confirmed on a real
  document: `mif-to-pdfrich-renderingfixtureSectionOne...`). This affected
  every rendered PDF, not just fenced code blocks. Fixed at the single
  shared text-drawing chokepoint (`drawTextTracked`), which now appends a
  space to every drawn string — free of visual side effects, since position
  is always set absolutely per call, never advanced from the previous one.

## [0.6.2] - 2026-07-15

### Fixed

- `mif-to-pdf`: fenced code blocks had no handling at all and fell through
  to the paragraph renderer, flattening into one unreadable line with
  literal ` ``` ` markers — this broke every `mermaid` fence, the default
  embedded-chart convention most genres use. Now renders as a legible
  monospace block labeled with its language tag, preserving each line's
  exact spacing as long as it fits the page width (an overlong line falls
  back to word-wrapping, which loses that alignment). Mermaid source still
  renders as text, not a graphic. Blockquotes leaked their literal `>`
  marker as visible text; now render with it stripped (indented, with a
  left rule) — including a fenced code block immediately inside a
  blockquote, which is unwrapped into its own code block rather than left
  as literal quoted text with the fence markers still leaking.
- `mif-to-pdf`: the frontmatter title was drawn twice — once as a synthetic
  heading, and again wherever the body's own leading H1 restated it, which
  every genre this suite produces does by convention. Now suppressed when
  the body's first block is a level-1 heading that actually restates the
  title (an exact match, or a short prefix followed by the title verbatim —
  so a genre-prefixed heading like `ADR-0007: <title>` is still recognized);
  an unrelated leading H1 no longer suppresses the real title. An earlier
  version of this fix used a plain substring match in either direction,
  which silently dropped any short/acronym title that happened to be a
  substring of an unrelated leading H1 (e.g. title "API" swallowed by a
  heading "Rapid Deployment") — caught in review before merge.

## [0.6.1] - 2026-07-15

### Fixed

- `mif-to-pdf` (#137): the converter shipped in 0.6.0 word-wrapped `content`
  as an undifferentiated text blob (headings/bold/lists/tables/links all
  rendered as literal markdown syntax), silently dropped every referenced
  figure, and carried metadata as one opaque JSON blob in the XMP packet.
  Now renders real markdown formatting (headings, bold, inline code, flat
  bullet lists, tables, clickable link annotations), embeds PNG/JPG/SVG
  figures (SVG via a minimal vector renderer scoped to `svg-charts`'s own
  output shape), and emits real Dublin Core properties plus a fully typed
  `mif:` RDF/XML tree in the XMP packet, alongside the retained raw-JSON
  `mif:rawDocument` losslessness guarantee. Also fixes a table-row-loss
  regression, a font-resource-duplication issue (~80 duplicate entries for
  3 real fonts), a CodeQL-flagged incomplete-sanitization pattern, and an
  SVG parser quote-style desync between its two parsing passes.

## [0.6.0] - 2026-07-15

### Added

- `mif-to-pdf` (#122): a substrate helper that converts a MIF JSON-LD
  document to PDF, embedding every frontmatter field (`id`/`type`/`created`,
  `namespace`/`modified`/`temporal`, `provenance`/`citations`/
  `relationships`) into the produced PDF's own metadata — the standard Info
  dictionary (best-effort mapped) plus a custom XMP packet carrying the full
  document losslessly. Input is JSON-LD only; a Markdown source is converted
  first with the existing `mif-convert`/`mif-validate` tooling rather than a
  second, duplicate frontmatter parser. Built on `pdf-lib`.

## [0.5.0] - 2026-07-15

### Added

- `business-plan` (#120): a full investor- and lender-ready business plan
  genre — Executive Summary through Appendix, SBA/SCORE convention plus
  Lean Canvas problem-solution framing, a mandatory Financial Plan &
  Projections section (3-statement projection with disclosed assumptions).
- `svg-charts` (#120): a substrate helper that generates a standalone
  `.svg` chart file (and its `<img>` embed line) for chart needs beyond
  Mermaid's documented range — more than roughly five pie/bar segments,
  custom per-series colors, log scales, or multi-series combo charts.
  Never emits inline `<svg>` markup, since GitHub strips it from rendered
  markdown.

## [0.4.3] - 2026-07-12

### Fixed

- The mediated auto-stamp path in the `PostToolUse` hook (#108) no longer
  silently swallows a stamp decline (`unwitnessed`, `not-conformant`,
  `would-regress`, `unwritable`) or a thrown error — both now surface via
  `additionalContext`, the same fail-loud-never-fail-closed posture the #90
  `session_start`-missing warning already established. Previously a decline
  or error inside `stamp === "auto"` was indistinguishable, from inside the
  session, from capture being broken outright.

## [0.4.2] - 2026-07-12

### Added

- `mif-provenance status` (#90/#92): a self-check verb answering "is capture
  actually active for THIS session right now" — reports the resolved
  `mifProvenance.capture`/`stamp` config and, when capture is on, whether the
  session ledger has witnessed a `session_start` line for this session.
  Enabling capture mid-session, or updating this plugin mid-session, is not
  guaranteed to wire hooks into an already-running session's dispatch, and
  both the config resolver and the capture hooks are deliberately silent
  either way; `status` is the fail-loud check.
- A fail-loud warning surfaced via the `PostToolUse` hook's `additionalContext`
  (#90/#93) when a capture/stamp event fires for a session with no witnessed
  `session_start` line — never blocking the write, only saying so.
- `status` now also hashes this plugin's own `hooks.json` at every
  `session_start` and compares it against the current on-disk copy (#90/#104).
  Confirmed by direct repro: a hook command appended to an already-registered
  `PostToolUse` matcher is never dispatched until the session restarts, with
  no `/reload-plugins` needed to observe the gap — exactly what happens when
  this plugin itself is updated mid-session. A mismatch means the running
  session may still be dispatching a stale hook set.
- `docs/how-to/witness-document-provenance.md` (#90/#94) documents the
  restart-required caveat after enabling capture or updating this plugin.

### Fixed

- A test-isolation leak in `provenance-capture.test.mjs`'s 50ms-budget test
  (#102): it resolved provenance config without an `env` override, which fell
  through to the real `process.env` and could leak real personal
  `mifProvenance` settings past the isolated fixture on any machine with
  `$CLAUDE_CONFIG_DIR` set.
- `status` treats an unreadable `hooks.json` (when a hash was recorded at
  `session_start` but the current file can't be read at all) as an
  environment error, never a false-healthy verdict.

## [0.4.1] - 2026-07-11

### Fixed

- `loadValidator()` (#88) let a raw `ENOENT` bubble out when `schema/.cache/<version>/mif.schema.json`
  was never hydrated locally (a freshly installed plugin instance, or a
  partial/interrupted hydrate that left the directory but not the file),
  which `mif-validate.mjs` folded into the same failures list as a genuine
  schema-conformance violation. The fail-closed guard then told the model
  to fix its frontmatter, with a fallback suggestion of `npm ci` that does
  not fix a missing hydrated cache, leaving no way to self-serve past the
  block. `mif-validate` now exits `3` for this specific case (documented in
  the CLI exit-code reference table), and `hooks/mif-guard.mjs` gives the
  actual remedy (`npm run hydrate-schema`) while still keeping a general
  `npm ci` fallback hint for unrelated tooling failures.

## [0.4.0] - 2026-07-11

### Added

- **`mif-provenance`**, the fifth authoring helper: witnessed provenance —
  frontmatter built from a private, hook-observed session log rather than
  from what the model claims about itself. Off by default; an explicit
  refusal at any settings scope always wins, and a broken configuration can
  only ever disable, never enable.
- Three capture hooks (`hooks/provenance-{session-start,post-tool-use,
  session-end}.mjs`) writing an append-only, never-committed local ledger.
- The `stamp` and `verify` verbs (`scripts/mif-provenance.mjs`): `stamp`
  writes only witnessed fields with a fixed `trustLevel: user_stated`
  ceiling (never `confidence`), declining any document the ledger didn't
  witness; `verify` deterministically reports match or drift and never
  restamps.
- A witnessed-vs-asserted coverage report
  (`scripts/provenance-corpus-check.mjs`) that runs idempotently in CI.
- Two new user-facing docs: a how-to walking the full journey — opt in, watch
  witnessed provenance appear, approve a stamp, check a document you don't
  trust — and an explanation of why a witness beats a claim, what the honest
  trust ceiling means, and the privacy guarantees (nothing leaves your
  machine, document content and credentials are never recorded).

## [0.3.2] - 2026-07-10

### Added

- Registered the mif-rs `mif-mcp` server in `.mcp.json` as an optional
  enhancement: six semantic MCP tools when the binary is on `PATH`, full plugin
  function without it. `validate-plugin` now checks the `.mcp.json` shape, and a
  how-to documents attested install and verification.
- New `mif-corpus` substrate skill: semantic ingest, free-text search,
  find-similar cross-link candidates, and corpus statistics over a gitignored
  `.mif/vectors.db` store, backed by the optional mif-rs tools (mif-mcp MCP
  server or mif-cli), with a corpus-layer reference page and an
  ingest-and-search how-to.
- Engine-convergence groundwork (ADR-0004): the node engine is authoritative;
  a non-required nightly `engine-parity` workflow compares it against a
  pinned, attestation-verified mif-rs `mif-cli` release over the CI-gated
  corpus, with a committed expected-disagreement ledger (currently one entry
  class, mif-rs#38; the remaining capability gaps mif-rs#39-#41 are tracked
  separately, not yet ledger entries) and a fail-closed
  stale/orphaned-expectation check.

### Changed

- `doc-set-planner` is now corpus-aware when the optional mif-rs tooling is
  present: the Plan step searches the corpus per planned member and surfaces
  existing-coverage decisions, and the Reconcile step offers find-similar
  results as candidate `relationships[]` targets. Recipe decomposition, the
  cross-link contract, and the deterministic `planner-check` gate are
  unchanged with or without the corpus.
- Broadened the install how-to to cover both optional mif-rs binaries:
  `mif-cli` (the mif-corpus skill's CLI fallback) now gets the same attested
  download-verify-install walkthrough as `mif-mcp`, the getting-started
  tutorial points at the semantic layer as a next step, and the corpus how-to
  links the install guide from its prerequisites.

### Fixed

- `mif-validate`'s `toJsonld()` projection only recognized the bare `id`/`type`
  frontmatter alias pair, rejecting documents authored with the equally
  canonical JSON-LD-native `@id`/`conceptType` keys directly in frontmatter.
  `mif-guard.mjs`'s genre-signal regex already accepted these documents, so
  the guard blocked them with a misleading "frontmatter missing required
  field: id" instead of validating them — this affected every document
  produced by a consumer's own native MIF pipeline (rather than a mif-docs
  genre template) that used `@id`/`conceptType` directly, most visibly the
  research-harness's own canonical Level-3 reports. `toJsonld()` now falls
  back to `conceptType`, never `@type`, for the semantic subtype (`@type` is
  always the fixed literal `Concept`); both keys present and disagreeing is
  now a fail-closed error rather than a silent last-write-wins pick. (#49,
  #51)
- `mif-guard.mjs`'s genre-signal regex and `projection.mjs`'s key-recognition
  logic were two independently-maintained lists that could silently drift: a
  future authoring-convention key added to one had no structural guarantee of
  reaching the other. `projection.mjs` now exports
  `MIF_IDENTITY_SIGNAL_KEYS` (`@id`, `conceptType`) from a small,
  dependency-free module, and `mif-guard.mjs` imports and derives its
  bare-key detection regex from it, combined with its own genre-specific keys
  (`diataxis_type`, `x-ontology`, `ontology`). A structural regression test
  asserts the guard's source actually imports and uses the shared list rather
  than a hardcoded copy. (#50, #54)

## [0.3.1] - 2026-07-01

### Changed

- Hardened `evals/evals.json` across all 23 pre-existing doc-genre skills:
  converted LLM-only expectations into `deterministic_checks`, and retargeted
  prompts to write to a named output file instead of `transcript.md`
  (deterministic coverage rose from 0% to roughly 63%).
- Applied 10 skill-instruction fixes verified by the autoresearch improvement
  loop against the hardened evals: `arc42-arch-doc` and `diataxis-tutorial`
  (removed a self-referential banned-word bug), `c4-model-diagram` (mermaid
  outer-fence widening guidance), `diataxis-how-to` (restored a
  relocate-don't-delete rule for genre drift), `ears-acceptance-criteria` and
  `feature-spec` (commit to a plausible component name and flag it as an
  assumption), `mif-frontmatter` (surfaces the `type` enum whenever the L1
  floor is discussed), `mif-validate` (states determinism/lossless-round-trip
  guarantees in its answers), `python-pep` and `rust-rfc` (Status
  single-state clarity; review-must-include-corrected-text rule).
- Fixed 20 further eval-suite defects found by three rounds of GitHub Copilot
  review: fragile shell-command-based counting checks replaced with regex,
  case-sensitive EARS pattern checks made case-insensitive across five
  skills, an overly literal phrase check broadened, seven `Step N` checks
  word-boundaried against `Step N0` false positives, a `Status:` check
  tightened to `Draft`-only for a brand-new-PEP scenario, an unanchored
  "must start with" check anchored to the file start, and a synopsis check
  loosened from requiring a code fence to accepting any form.

## [0.3.0] - 2026-07-01

### Added

- 17 new genre skills completing the genre-consolidation migration from
  `research-harness-template` (research-harness-template#228): `academic`,
  `systematic-review`, `computing-paper`, `humanities-mla`,
  `humanities-chicago`, `clinical-submission`, `nist-sp`,
  `regulatory-disclosure`, `compliance-audit`, `security-pentest`,
  `legal-memo`, `market-research-report`, `sustainability-report`,
  `trend-analysis`, `competitive-quadrant`, `briefing`, `exec-summary`. Each
  ships `good-l1.md` (L1), `good.md` (L3), `bad.md`, `evals/evals.json`, and
  its own `docs/reference/skills/<name>.md` deep-dive page, and is registered
  in `tests/level-targets.json`, `docs/reference/genre-and-cli-catalog.md`,
  `docs/reference/skills-by-purpose.md` (four new purpose groups: Scholarly &
  scientific writing, Regulated & compliance reports, Research & market
  intelligence, Business communication), `README.md`, `docs/architecture/`
  counts, and `doc-set-planner`'s standalone-genre list. The suite now ships
  37 genre skills (up from 20).

## [0.2.0] - 2026-06-30

### Added

- New `engineering` genre skill: an engineering decision / evaluation report
  (Problem/Context, Options Considered, a mandatory Trade-offs comparison
  table, Decision, Implementation Notes, Consequences), with an additive
  optional ANSI/NISO Z39.18 technical-report front/back-matter overlay. Ships
  `good-l1.md` (L1), `good.md` (L3), `bad.md`, and `evals/evals.json`,
  registered in `tests/level-targets.json`. First genre migrated as part of the
  `research-harness-template` genre-consolidation pilot
  (research-harness-template#228): the harness's `packs/reports/engineering`
  pack retires in favor of this skill.

## [0.1.2] - 2026-06-30

### Fixed

- The fail-closed `mif-guard` hook no longer blocks a markdown file whose only
  `type:` is nested under another key. The genre-signal detection now anchors
  `type`, `ontology`, and `diataxis_type` to the top level of the frontmatter, so
  an auto-memory file carrying `metadata.type: reference` is left alone while real
  MIF genre documents are still validated and non-conformant ones are still
  blocked. Adds a regression test and fixture.

## [0.1.1] - 2026-06-30

### Added

- Fail-closed `PostToolUse` MIF guard hook (`hooks/mif-guard.mjs`) on Write,
  Edit, and MultiEdit: runs `mif-validate --level 1` on genre-doc outputs and
  exits 2 to block the write when the file is non-conformant. Skips plain
  markdown and structured-MADR `adr` docs. Ships with `tests/mif-guard.test.mjs`
  and corresponding fixtures wired as `npm run test:hook` in CI.
- Comprehensive self-documentation: the suite now documents itself as a MIF
  L1-L3 doc set — tutorial, how-tos, reference, explanation, arc42 + C4
  architecture docs, three ADRs, two SRE runbooks, and this CHANGELOG — all
  validated by `mif-validate` and `lint:md` in CI. Adds a brand social-preview
  image (`.github/social-preview.svg` / `.png`) and a documentation index in
  `README.md`.

### Changed

- License switched from Apache-2.0 to MIT; `plugin.json`, `marketplace.json`,
  `package.json`, and `README.md` updated accordingly.

## [0.1.0] - 2026-06-30

### Added

- Initial public release of the mif-docs plugin
  (`modeled-information-format/mif-docs-plugin`), distributed under the Apache-2.0
  license through the org marketplace `claude-code-plugins` (relicensed to MIT in
  0.1.1).
- **19 genre skills**, one per document genre: `diataxis-tutorial`,
  `diataxis-how-to`, `diataxis-reference`, `diataxis-explanation`,
  `arc42-arch-doc`, `c4-model-diagram`, `google-design-doc`, `adr`, `rust-rfc`,
  `python-pep`, `changelog`, `sre-runbook`, `playbook`, `prd`, `feature-spec`,
  `ai-architecture-doc`, `kiro-requirements`, `kiro-design`, and `kiro-tasks`.
- **3 shared substrate skills**: `mif-frontmatter` (authors MIF Level 1-3
  frontmatter), `ears-acceptance-criteria` (EARS-notation acceptance criteria),
  and `mif-validate` (the deterministic conformance gate).
- **`doc-set-planner`** engine that decomposes a broad subject into a
  coordinated set of MIF documents and reconciles the cross-document
  relationship graph, shipping with 4 recipes: `diataxis`, `ai-spec`, `kiro`,
  and `architecture`.
- Deterministic MIF conformance via `mif-validate`: it projects YAML
  frontmatter to JSON-LD and validates with `ajv` + `ajv-formats` against the
  canonical schema at `https://mif-spec.dev/schema/`, enforces the L1/L2/L3
  required-field floor, and verifies the markdown to JSON-LD round-trip is
  lossless. No LLM sits in the conformance path, so identical input plus an
  identical resolved schema yields an identical verdict.
- Fail-closed PostToolUse MIF guard hook: `hooks/hooks.json` registers
  `hooks/mif-guard.mjs` on Write, Edit, and MultiEdit; a genre document that
  fails `mif-validate --level 1` makes the hook exit 2 and blocks the write.
- Attested release pipeline producing a reproducible `git archive` tarball
  (`mif-docs-plugin-v0.1.0.tar.gz`), SLSA build provenance via
  `actions/attest-build-provenance`, and a fail-closed
  `gh attestation verify --signer-workflow` check run before upload.
- Registration in the `claude-code-plugins` marketplace with fail-closed catalog
  admission that verifies the release attestation before the plugin is listed.
