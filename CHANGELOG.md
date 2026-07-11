---
id: changelog-mif-docs
type: episodic
created: '2026-06-30T00:00:00Z'
modified: '2026-07-11T20:00:00Z'
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
  trustLevel: high_confidence
  agent: anthropic/claude-code
  wasAttributedTo:
    '@id': https://github.com/modeled-information-format
    '@type': prov:Agent
  wasGeneratedBy:
    '@id': urn:mif:activity:mif-docs-self-documentation
    '@type': prov:Activity
  wasDerivedFrom:
    - '@id': urn:mif:release:mif-docs-v0.1.0
      '@type': prov:Entity
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

## [0.4.1] - 2026-07-11

### Fixed

- `loadValidator()` let a raw `ENOENT` bubble out when `schema/.cache/<version>/mif.schema.json`
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
