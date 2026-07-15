---
id: reference-genre-and-cli
type: semantic
created: '2026-06-30T10:00:00Z'
modified: '2026-07-15T19:31:02.093Z'
namespace: reference/catalog
title: mif-docs genre and CLI catalog
tags:
  - reference
  - mif-docs
  - catalog
temporal:
  '@type': TemporalMetadata
  validFrom: '2026-06-30T00:00:00Z'
  recordedAt: '2026-06-30T10:00:00Z'
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
    '@id': urn:mif:activity:claude-code-session:08717ff4-a47e-4c0a-9fa5-59ce2b2db70a
    '@type': prov:Activity
  wasDerivedFrom:
    - '@id': https://github.com/modeled-information-format/mif-docs-plugin
      '@type': prov:Entity
    - '@id': urn:mif:skill-set:mif-docs-genres
      '@type': prov:Entity
  agentVersion: 2.1.210
citations:
  - '@type': Citation
    citationType: tool
    citationRole: source
    title: mif-docs — MIF documentation plugin for Claude Code
    url: https://github.com/modeled-information-format/mif-docs-plugin
  - '@type': Citation
    citationType: specification
    citationRole: methodology
    title: Diátaxis — Reference
    url: https://diataxis.fr/reference/
    accessed: '2026-06-30'
relationships:
  - type: relates-to
    target: urn:mif:reference-skills-by-purpose
  - type: relates-to
    target: urn:mif:tutorial-getting-started
  - type: relates-to
    target: urn:mif:how-to-validate-and-author
  - type: relates-to
    target: urn:mif:explanation-one-artifact-two-readers
ontology:
  '@type': OntologyReference
  id: mif-docs
  version: 1.0.0
  uri: https://mif-spec.dev/ontologies/mif-docs
entity:
  name: mif-docs genre and CLI catalog
  entity_type: reference-document
extensions:
  x-genre-count: 38
  x-substrate-count: 7
  x-recipe-count: 4
---

# mif-docs genre and CLI catalog

An exhaustive lookup for the **mif-docs v0.5.0** plugin: every skill it ships,
every doc-set recipe, and every script in `scripts/` with its arguments and exit
behavior. Consult an entry; do not read this end to end.

## Genre skills (38)

Each genre ships `good-l1.md` (L1 floor), `good.md` (target level), `bad.md`, and
`evals/evals.json`.

| Skill | Artifact it authors | MIF conceptType | Target level |
| --- | --- | --- | --- |
| `diataxis-tutorial` | Learning-oriented hands-on lesson | `procedural` | 2 |
| `diataxis-how-to` | Task-oriented recipe | `procedural` | 2 |
| `diataxis-reference` | Information-oriented lookup of one thing | `semantic` | 3 |
| `diataxis-explanation` | Understanding-oriented discussion | `semantic` | 3 |
| `arc42-arch-doc` | arc42 12-section architecture document | `semantic` | 3 |
| `c4-model-diagram` | C4 model document (Context/Container/Component/Code) | `semantic` | 3 |
| `google-design-doc` | Google-style engineering design doc | `semantic` | 3 |
| `engineering` | Engineering decision / evaluation report (options-vs-criteria comparison table) | `semantic` | 3 |
| `adr` | Architectural Decision Record (Structured MADR) | `semantic` | 3 |
| `rust-rfc` | Rust-style RFC / enhancement proposal | `semantic` | 3 |
| `python-pep` | Python Enhancement Proposal | `semantic` | 3 |
| `changelog` | Keep a Changelog 1.x version history | `semantic` | 2 |
| `sre-runbook` | Tactical step-by-step incident runbook | `procedural` | 2 |
| `playbook` | Strategic multi-incident operations playbook | `procedural` | 3 |
| `prd` | Product Requirements Document | `semantic` | 3 |
| `feature-spec` | Lightweight AI-ready feature specification | `semantic` | 2 |
| `ai-architecture-doc` | Composite AI-spec architecture document | `semantic` | 3 |
| `kiro-requirements` | Kiro `requirements.md` (user stories + EARS) | `semantic` | 3 |
| `kiro-design` | Kiro `design.md` (technical design) | `semantic` | 3 |
| `kiro-tasks` | Kiro `tasks.md` (checkbox implementation plan) | `procedural` | 2 |
| `academic` | Peer-review-style IMRaD scholarly paper | `semantic` | 3 |
| `systematic-review` | PRISMA systematic review / meta-analysis | `semantic` | 3 |
| `computing-paper` | ACM/IEEE computing paper (IEEE numbered citations) | `semantic` | 3 |
| `humanities-mla` | MLA-style humanities paper | `semantic` | 3 |
| `humanities-chicago` | Chicago-style humanities paper (notes-bibliography) | `semantic` | 3 |
| `clinical-submission` | Clinical study report (ICH E3 CSR / CTD module frame) | `semantic` | 3 |
| `nist-sp` | NIST Special Publication structure | `semantic` | 3 |
| `regulatory-disclosure` | SEC-style annual disclosure (Reg S-K / Form 10-K item order) | `semantic` | 3 |
| `compliance-audit` | Compliance audit report (SOC 2-style controls + findings) | `semantic` | 3 |
| `security-pentest` | Penetration-test report (PTES/OWASP-style, CVSS findings) | `semantic` | 3 |
| `legal-memo` | Predictive legal memorandum (IRAC, Bluebook citations) | `semantic` | 3 |
| `market-research-report` | Market research report (methodology/fieldwork-grounded) | `semantic` | 3 |
| `business-plan` | Investor/lender-ready business plan (SBA/SCORE structure, Lean Canvas framing) | `semantic` | 3 |
| `sustainability-report` | GRI-Standards sustainability/ESG report | `semantic` | 3 |
| `trend-analysis` | Trajectory report (drivers/inhibitors, scenario diagram) | `semantic` | 3 |
| `competitive-quadrant` | Two-axis competitive-quadrant report (Mermaid quadrant chart) | `semantic` | 3 |
| `briefing` | One-page briefing / standup update | `episodic` | 3 |
| `exec-summary` | 1-2 page BLUF decision-oriented executive summary | `semantic` | 3 |

## Substrate skills (7) and the planner

These do not author a finished genre artifact; they supply or check the MIF layer
that every genre rides on, plus the multi-document engine.

| Skill | Role |
| --- | --- |
| `mif-frontmatter` | Author MIF Level 1–3 frontmatter for any document, climbing L1→L3 as detail allows. |
| `ears-acceptance-criteria` | Turn a requirement or driver into an EARS-notation acceptance criterion. |
| `mif-validate` | Deterministically prove a document is MIF-conformant and convert between forms. |
| `mif-corpus` | Semantically index and query MIF docs via the optional mif-rs tools; suggestion signal, never a gate. |
| `mif-provenance` | Stamp hook-witnessed provenance into frontmatter and verify blocks against the session ledger; witnessed, never asserted. |
| `svg-charts` | Generate a standalone `.svg` chart file (and its `<img>` embed line) for cases beyond Mermaid's documented range. |
| `mif-to-pdf` | Convert a MIF JSON-LD document to PDF, embedding every frontmatter field as PDF metadata (Info dictionary + a custom lossless XMP packet). |
| `doc-set-planner` | Plan a subject into a coordinated SET of documents, fan out to genres, reconcile the relationship graph. |

## Doc-set recipes (4)

`doc-set-planner` decomposes a broad subject using one of four recipes. Each
recipe names its member genres and the cross-document relationship graph that
`planner-check` verifies for link-completeness.

| Recipe | Decomposes into |
| --- | --- |
| `diataxis` | tutorial + how-to + reference + explanation |
| `ai-spec` | AI-ready specification set (feature-spec + ai-architecture-doc + EARS criteria) |
| `kiro` | Kiro three-document set: requirements + design + tasks |
| `architecture` | Architecture set: arc42 + C4 + ADRs |

## Scripts (`scripts/`)

All scripts run on Node.js 20+ and are invoked as `node scripts/<name>.mjs`.
Every script is fail-closed: any failure exits non-zero.

| Script | Invocation | Exit behavior |
| --- | --- | --- |
| `mif-validate.mjs` | `mif-validate <file> [--level 1\|2\|3] [--no-roundtrip]` | `0` valid; `1` schema/level/round-trip failure; `2` usage error (no file); `3` schema cache not hydrated locally (environment gap, not a document failure — run `npm run hydrate-schema`). |
| `mif-convert.mjs` | `mif-convert <emit-jsonld\|emit-markdown\|roundtrip> <file> [--no-check]` | `0` success; `1` schema check / non-lossless round-trip; `2` usage error. |
| `mif-to-pdf.mjs` | `mif-to-pdf <doc.json> [--output out.pdf]` | `0` PDF written; `1` unreadable/unparseable input or missing required MIF L1 field; `2` usage error (no file). |
| `hydrate-schema.mjs` | `hydrate-schema [latest\|<version>]` | `0` schema cached + `VENDOR.lock` written; `1` fetch failure (reports last hydrated version). |
| `hydrate-ontology.mjs` | `hydrate-ontology` | `0` ontology cached from published URI / ontologies repo / local sibling checkout; `1` unresolved. |
| `validate-ontology.mjs` | `validate-ontology` | `0` ontology valid and all `entity_type` / relationship types resolve; `1` not hydrated or dangling reference. |
| `validate-plugin.mjs` | `validate-plugin` | `0` `plugin.json`, `marketplace.json`, and every `SKILL.md` frontmatter valid; `1` any structural violation. |
| `check-exemplars.mjs` | `check-exemplars` | `0` every genre's `good-l1.md` validates at L1 and `good.md` at its target level; `1` otherwise. |
| `planner-check.mjs` | `planner-check [<recipe>]` | `0` recipe(s) decompose to real member skills and the cross-link graph is complete; `1` otherwise. |
| `mif-provenance.mjs` | `mif-provenance <stamp\|verify> <file> [--session <id>] [--ledger <path>]` \| `mif-provenance status [--session <id>] [--ledger <path>]` | `0` stamped / verify match / status healthy; `1` verify drift (including unwitnessed) or status found no `session_start` line for this session yet; `2` usage/environment error (unknown verb, no repo and no `--ledger`, ambiguous session, no session id available); `3` stamp declined (unwitnessed, not conformant, would regress the document's MIF level). |
| `provenance-corpus-check.mjs` | `provenance-corpus-check [--dir <path>] [--ledger <path>]` | `0` report emitted (byte-idempotent over identical inputs — never gates on coverage); `1` empty corpus; `2` usage error. |
| `engine-parity.mjs` | `engine-parity <path-to-mif-cli> [--expected <json>]` | `0` node and Rust verdicts agree everywhere outside the expected-disagreement ledger; `1` unexpected disagreement, stale/orphaned ledger entry, or harness fault (missing/unparseable ledger, schema not hydrated, binary cannot run, gutted corpus); `2` usage error (missing binary path, wrong working directory). |

### Which engine is authoritative

The **node engine is authoritative** for every gate in this suite (ADR-0004):
`mif-validate`, the CI validation jobs, and the fail-closed write guard all
run `scripts/lib/projection.mjs`. The mif-rs Rust engine is compared against
it by the non-required nightly `engine-parity` workflow; a disagreement is
evidence for an upstream mif-rs issue, never a reason to change a document
the node gates accept.

### Argument notes

- `mif-validate --level` defaults to `1`. The level overlay layers required
  fields on top of the canonical schema: L2 requires `namespace`, `modified`,
  `temporal`; L3 additionally requires `provenance` and `temporal.validFrom`.
- `mif-convert emit-markdown` schema-checks the JSON-LD input before projecting,
  unless `--no-check` is given. `roundtrip` reports whether md↔JSON-LD is lossless.
- `hydrate-schema` resolves `latest` by default and records the resolved version
  in `schema/VENDOR.lock`; offline, `mif-validate` falls back to the last
  hydrated copy and warns.
- `planner-check` with no argument checks every recipe under
  `skills/doc-set-planner/recipes/`.

## See also

The [skills by purpose](../skills-by-purpose/) reference gives each skill its own
detailed write-up, grouped by the job it does; this catalog is the terse lookup
for genres, recipes, and scripts. The getting-started tutorial walks through
installing and validating a first document; the how-to gives the
validate/author/convert recipe; the explanation
covers why each document is both a human artifact and a machine unit. All three
are linked from this reference's `relationships[]`, which keeps rationale out of
the catalog per Diátaxis.
