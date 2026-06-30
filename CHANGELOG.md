---
id: changelog-mif-docs
type: episodic
created: '2026-06-30T00:00:00Z'
modified: '2026-06-30T00:00:00Z'
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

_No unreleased changes yet._

## [0.1.0] - 2026-06-30

### Added

- Initial public release of the mif-docs plugin
  (`modeled-information-format/mif-docs-plugin`), distributed under the MIT
  license through the org marketplace `claude-code-plugins`.
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
