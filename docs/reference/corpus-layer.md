---
id: reference-corpus-layer
type: semantic
created: '2026-07-05T12:00:00Z'
modified: '2026-07-05T12:00:00Z'
namespace: reference/corpus
title: The Semantic Corpus Layer
tags:
  - reference
  - mif-docs
  - corpus
  - semantic-search
temporal:
  '@type': TemporalMetadata
  validFrom: '2026-07-05T00:00:00Z'
  recordedAt: '2026-07-05T12:00:00Z'
  ttl: P1Y
relationships:
  - type: relates-to
    target: urn:mif:how-to-ingest-and-search
  - type: relates-to
    target: urn:mif:reference-skill-mif-validate
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
    - '@id': https://github.com/modeled-information-format/mif-rs
      '@type': prov:Entity
citations:
  - '@type': Citation
    citationType: repository
    citationRole: source
    title: 'modeled-information-format/mif-rs — the Rust implementation providing the corpus tools this page describes'
    url: https://github.com/modeled-information-format/mif-rs
entity:
  name: Semantic Corpus Layer
  entity_type: reference-page
extensions:
  x-diataxis-quadrant: reference
  x-optional-dependency: mif-rs
---

# The Semantic Corpus Layer

The corpus layer is the suite's optional semantic index: MIF documents
embedded into a local vector store and queried by meaning. It is provided by
the `mif-corpus` substrate skill backed by the mif-rs tools, and it is an
enhancement — no gate, hook, or genre skill depends on it.

## Store

| Property | Value |
| --- | --- |
| Location | `.mif/vectors.db`, resolved relative to the working directory (run from the repo root, or pin with `--db-path`/`db_path`) |
| Format | SQLite, one embedding row per document |
| Document id | the MIF `@id` (`urn:mif:<frontmatter id>`) |
| Embedding | 384-dimensional sentence embedding of the doc's `content` |
| Versioning | gitignored derived index; delete and re-ingest to rebuild |

## Operations

| Operation | MCP tool (mif-mcp) | CLI (mif-cli) | Result |
| --- | --- | --- | --- |
| Ingest | `ingest_mif_document` | `ingest` | validate, prove round-trip, embed, upsert |
| Search | `search_documents` | `search` | ranked `(score, id)` list for a text query |
| Similar | `find_similar_documents` | `find-similar` | ranked list for an ingested id, anchor excluded |
| Stats | `corpus_stats` | `corpus-stats` | count, embedding dimension, db path |
| Validate | `validate_mif_document` | `validate` | canonical-schema verdict for a JSON-LD file |
| Ontology | `resolve_ontology_reference` | `ontology resolve` | three-tier `extends` chain |

Ingest is fail-closed: a document that fails schema validation or the
lossless round-trip stores nothing. Scores are cosine similarity in
`-1.0..=1.0`; on this suite's own corpus, useful matches typically score
about `0.55` to `0.78`.

## Contracts

- **Optionality** — with neither an `mif-mcp` server nor a `mif-cli` binary
  available, the corpus layer is unavailable and everything else in the
  plugin works unchanged. Skills state the absence; they never fabricate
  results.
- **Suggestion, not verdict** — similarity output feeds discovery
  (cross-link candidates, coverage checks). Conformance remains the
  exclusive business of `mif-validate` and the deterministic gates.
- **ADR exclusion** — documents carrying a top-level `description:`
  frontmatter key currently fail the Rust round-trip inside ingest (the key
  is dropped on re-serialization; tracked in the engine-convergence epic). In
  this corpus those are the ADR documents under `docs/adr/` (whose MIF `type`
  is `semantic`); bulk ingests skip them by key or path and say so.
- **Errors** — failures render as RFC 9457 `application/problem+json`
  envelopes carrying `suggested_fix` and `code_actions[]` with applicability
  markers; only `machine_applicable` fixes are safe to apply unreviewed.

## Consumers

`doc-set-planner`'s corpus-aware update (shipped as its own stacked change)
reads the corpus at Plan time (existing-coverage discovery per proposed
member) and at Reconcile time (candidate `relationships[]` targets from
find-similar). The recipe cross-link contract and `planner-check` stay
authoritative in both places.
