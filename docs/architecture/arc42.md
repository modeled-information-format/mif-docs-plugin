---
id: arch-arc42-mif-docs
type: semantic
created: '2026-06-30T10:00:00Z'
modified: '2026-06-30T10:00:00Z'
namespace: architecture/mif-docs
title: mif-docs Plugin — Architecture Document (arc42)
tags:
  - arc42
  - architecture
  - mif-docs
  - claude-code-plugin
ontology:
  '@type': OntologyReference
  id: mif-docs
  version: 1.0.0
  uri: https://mif-spec.dev/ontologies/mif-docs
temporal:
  '@type': TemporalMetadata
  validFrom: '2026-06-30T00:00:00Z'
  validUntil: '2027-06-30T00:00:00Z'
  recordedAt: '2026-06-30T10:00:00Z'
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
    - '@id': https://arc42.org/
      '@type': prov:Entity
citations:
  - '@type': Citation
    citationType: documentation
    citationRole: methodology
    title: arc42 — Template for Architecture Communication and Documentation
    url: https://arc42.org/
    accessed: '2026-06-30'
  - '@type': Citation
    citationType: repository
    citationRole: source
    title: 'modeled-information-format/mif-docs-plugin — the plugin this document describes'
    url: https://github.com/modeled-information-format/mif-docs-plugin
relationships:
  - type: relates-to
    target: urn:mif:arch-c4-mif-docs
    strength: 0.7
entity:
  name: mif-docs Plugin
  entity_type: architecture-document
extensions:
  x-arc42-sections: 12
  x-c4-companion: arch-c4-mif-docs
---

# mif-docs Plugin — Architecture (arc42)

## 1. Introduction and Goals

mif-docs is a Claude Code plugin (v0.1.0, repo
`modeled-information-format/mif-docs-plugin`, MIT) that ships one authoring skill
per documentation genre and makes every document it produces a MIF (Modeled
Information Format) conformant artifact. The plugin documents itself with its own
skills — this arc42 document is one such artifact.

Top quality goals:

1. **Conformance** — every shipped document validates against the canonical MIF
   schema, deterministically, with no LLM in the conformance path.
2. **Self-consistency** — the plugin's own docs are authored by its own genre
   skills and pass its own gates (dogfooding).
3. **Trustable releases** — what users install is the reproducible, signed,
   SLSA-attested artifact, verified fail-closed before publication.

Stakeholders:

| Role | Concern |
| --- | --- |
| Doc author | Picks a genre skill and gets a conformant, well-shaped document. |
| Coding agent | Consumes the JSON-LD projection as structured, queryable knowledge. |
| Plugin maintainer | Keeps skills, schema cache, and the release pipeline green. |
| Marketplace operator | Admits only releases whose attestation verifies. |

## 2. Architecture Constraints

- **Deterministic conformance** — `mif-validate` must give identical input plus
  identical resolved schema the identical verdict; no model call in that path.
- **SHA-pinned actions** — every GitHub Action is pinned to a commit SHA; CI
  enforces it with `pin-check`.
- **MIT licensed** — the plugin and all bundled tooling ship under MIT.
- **Claude Code host** — the plugin runs inside the Claude Code host and obeys
  its skill, hook, and marketplace contracts.

## 3. Context and Scope

mif-docs is a black box wired to four external parties:

- **Claude Code host** — loads the plugin's skills and runs its PostToolUse hook.
- **`mif-spec.dev` schema** — the canonical, authoritative MIF JSON Schema the
  plugin hydrates and validates against.
- **`modeled-information-format/ontologies` repo** — the sibling ontology source
  the plugin hydrates at dev time and vendors into the release artifact.
- **`claude-code-plugins` marketplace** — the org marketplace that distributes
  the plugin and admits releases whose attestation verifies fail-closed.

In scope: genre authoring skills, the deterministic conformance gate, the
fail-closed write guard, and the attested release pipeline. Out of scope: the MIF
specification itself (owned by `mif-spec.dev`) and the ontology vocabulary (owned
by the `ontologies` repo).

## 4. Solution Strategy

| Goal | Strategy |
| --- | --- |
| Conformance | Project markdown to JSON-LD and validate with `ajv` + `ajv-formats` against the canonical schema; no LLM in the path. |
| Self-consistency | Ship `good.md` exemplars per genre and validate every one in CI (`check-exemplars`). |
| Trustable releases | Build a reproducible `git archive` tarball, attest SLSA provenance, and verify it before upload. |
| Safety at authoring time | A PostToolUse hook blocks any genre doc that fails the L1 floor. |

The schema is treated as a refreshable **cache**, never an authority: it
auto-hydrates from `mif-spec.dev/schema` and records the resolved version in
`schema/VENDOR.lock`; offline, the last hydrated copy is used with a warning.

## 5. Building Block View

Level 1 decomposes mif-docs into four black boxes:

- **`skills/`** — 20 genre skills (the four Diataxis quadrants, arc42-arch-doc,
  c4-model-diagram, google-design-doc, engineering, adr, rust-rfc, python-pep,
  changelog, sre-runbook, playbook, prd, feature-spec, ai-architecture-doc, and
  the three Kiro skills) plus 3 substrate skills (mif-frontmatter L1–L3,
  ears-acceptance-criteria, mif-validate) and `doc-set-planner` (engine plus the
  diataxis, ai-spec, kiro, and architecture recipes). Each genre ships
  `good-l1.md`, `good.md`, `bad.md`, and `evals/evals.json`.
- **`scripts/`** — the deterministic tooling: `mif-validate`, `mif-convert`
  (`emit-jsonld` | `emit-markdown` | `roundtrip`), `hydrate-schema`,
  `hydrate-ontology`, `validate-ontology`, `validate-plugin`, `check-exemplars`,
  and `planner-check`.
- **`hooks/`** — `hooks.json` registers the PostToolUse guard `mif-guard.mjs`.
- **`schema/`** — the hydrated schema cache plus `VENDOR.lock`.

The genre skills emit documents; `mif-validate` (shared projection in
`scripts/lib/projection.mjs`) is the one gate the skills, the hook, and CI all
call.

## 6. Runtime View

**Scenario: an author writes a genre document.**

1. **Author** — a genre skill produces a MIF document and writes it via the host.
2. **Guard** — the PostToolUse hook fires on Write/Edit/MultiEdit and runs
   `mif-validate --level 1` on the new file; a failing genre doc makes the hook
   exit 2 and blocks the write. (`type: adr` docs are skipped here — they are
   validated by the structured-madr action instead.)
3. **mif-validate** — projects the markdown to JSON-LD, validates against the
   hydrated canonical schema, enforces the requested level floor, and checks the
   markdown↔JSON-LD round-trip is lossless.
4. **Projection** — `mif-convert` derives the JSON-LD (or re-emits markdown) on
   demand for machine consumers.

The conformance verdict is off any model's judgement: identical input and schema
yield the identical result every time.

## 7. Deployment View

- **CI** (`.github/workflows/ci.yml`) runs three job groups: `pin-check` plus
  `actionlint` (thin callers of the org central `.github` reusables
  `@789b6baf`); `validate` (validate-plugin, hydrate-schema, mif-validate over
  every shipped `good.md`, check-exemplars, planner-check, `test:hook`,
  `lint:md`); and `adr-smadr` (the structured-madr action in both smadr and mif
  modes). All green on `main`.
- **Release** (`.github/workflows/release.yml`) builds a reproducible
  `git archive` tarball, attests SLSA build provenance with
  `actions/attest-build-provenance`, verifies it fail-closed with
  `gh attestation verify --signer-workflow` **before** upload, and uploads only
  on a published release. A `workflow_dispatch` run is a dry run. v0.1.0 is
  released and attested as `mif-docs-plugin-v0.1.0.tar.gz`.
- **Admission** — the `claude-code-plugins` marketplace verifies that release
  attestation fail-closed (`catalog-admission` green) before listing.

## 8. Cross-cutting Concepts

- **MIF levels** — documents climb an L1 → L2 → L3 floor; `mif-validate --level`
  applies a required-field overlay (L3 requires `namespace`, `modified`,
  `temporal.validFrom`, and `provenance`).
- **Fail-closed** — every gate denies by default: the write guard blocks on
  failure (exit 2), and the release verifies the attestation before upload rather
  than after.
- **Determinism** — the conformance path is pure schema validation; no network
  call and no model call decide the verdict.
- **Schema as cache** — authority lives at `mif-spec.dev`; the local copy is a
  hydrated, version-locked cache that degrades to its last copy offline.

## 9. Architecture Decisions

| Decision | Rationale |
| --- | --- |
| No LLM in the conformance path | A verdict must be reproducible and auditable; only schema validation gives that. |
| Schema is a hydrated cache, not vendored authority | Keeps `mif-spec.dev` the single source of truth while allowing offline runs. |
| Verify attestation before upload | Fail-closed: an unverifiable artifact never reaches a release. |
| Skip `type: adr` in the write guard | ADRs are validated by the structured-madr action, avoiding a double gate. |

Each consequential choice is recorded as a full ADR under `docs/adr/`; this table
is the index.

## 10. Quality Requirements

Quality tree (goal → scenario):

- **Conformance**
  - *Deterministic verdict:* given identical document input and an identical
    resolved schema, `mif-validate` returns the identical PASS/FAIL result.
- **Self-consistency**
  - *Exemplar coverage:* when CI runs, every shipped `good.md` validates at its
    declared target level and `check-exemplars` confirms the L1→target climb.
- **Trustable releases**
  - *Fail-closed verification:* when a release artifact's attestation does not
    verify, the workflow stops before upload and publishes nothing.

## 11. Risks and Technical Debt

| Risk / debt | Impact | Mitigation |
| --- | --- | --- |
| Schema drift between cache and `mif-spec.dev` | Stale conformance verdicts | `hydrate-schema` re-resolves and re-locks `VENDOR.lock` on each CI run. |
| Ontology lives in a separate repo | A breaking ontology change can fail validation | `validate-ontology` gates the hydrated copy; the release vendors a pinned copy. |
| Offline schema fallback | Validation may use an outdated copy | The fallback emits a warning so the staleness is visible. |

## 12. Glossary

| Term | Definition |
| --- | --- |
| MIF | Modeled Information Format — the canonical schema documents conform to. |
| Genre skill | A skill that authors one documentation genre (e.g. arc42, ADR). |
| Projection | The lossless markdown↔JSON-LD transform in `scripts/lib/projection.mjs`. |
| Level floor | The minimum required fields for MIF L1, L2, or L3 conformance. |
| Fail-closed | A gate that denies by default when verification does not succeed. |
