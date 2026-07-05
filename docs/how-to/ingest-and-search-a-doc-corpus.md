---
id: how-to-ingest-and-search
type: procedural
created: '2026-07-05T12:00:00Z'
modified: '2026-07-05T12:00:00Z'
namespace: how-to/corpus
title: How to Ingest and Search a MIF Doc Corpus
tags:
  - how-to
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
    target: urn:mif:reference-corpus-layer
  - type: relates-to
    target: urn:mif:how-to-validate-and-author
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
    title: 'modeled-information-format/mif-rs — the tools this guide drives'
    url: https://github.com/modeled-information-format/mif-rs
entity:
  name: Ingest and Search a MIF Doc Corpus
  entity_type: how-to-guide
extensions:
  x-diataxis-quadrant: how-to
  x-optional-dependency: mif-rs
---

# How to Ingest and Search a MIF Doc Corpus

Build a local semantic index over a tree of MIF documents and query it by
meaning. This guide assumes MIF-conformant docs exist (see the authoring
how-to) and that you want discovery over them — coverage checks, cross-link
candidates, "which doc covers X?".

## Prerequisites

- The optional mif-rs tooling: either the `mif-mcp` MCP server connected in
  your session, or the `mif-cli` binary on `PATH`. Install from the attested
  release binaries on `modeled-information-format/mif-rs` (verify with `gh
  attestation verify` before trusting), or `cargo install mif-cli mif-mcp`.
- Network access for the first run only — the embedding model downloads into
  the local hf-hub cache once.

## Ingest the documents

Ingest each document; the store `.mif/vectors.db` (gitignored) is created on
first use:

```bash
find docs -name '*.md' | while read -r f; do
  mif-cli ingest "$f" || echo "SKIPPED: $f"
done
```

Each successful line reports `lint=ok validate=ok roundtrip=lossless` plus
the stored id. Ingest is fail-closed — a doc that fails validation or the
round-trip stores nothing and renders a problem+json envelope explaining why.
Expect `type: adr` documents to fail for now (round-trip drift: the
`description:` frontmatter key is dropped on re-serialization, tracked in the
engine-convergence epic); skip them deliberately rather than treating those
failures as new.

## Search by meaning

```bash
mif-cli search "how do I validate a document against the MIF schema" --limit 5
```

The output is ranked `(score, id)` pairs, most similar first. Useful matches
on this suite's corpus typically score about 0.55-0.78. An empty store
returns `(no matches)`.

## Find cross-link candidates

```bash
mif-cli find-similar "urn:mif:reference-corpus-layer" --limit 5
```

The anchor id must already be ingested (a 404 problem envelope tells you it
is not). The anchor itself is excluded from results. Offer the top matches as
candidate `relationships[]` targets — the author, or the doc-set-planner
reconcile step, decides which to accept.

## Check corpus health

```bash
mif-cli corpus-stats
```

Reports `count`, embedding `dim` (384), and the db path. To rebuild from
scratch, delete `.mif/vectors.db` and re-ingest — the store is a derived
index, never an authority.

## Result

You have a queryable semantic index over your MIF docs and a repeatable way
to refresh it. For the full operation-by-operation contract (MCP tool names,
error envelopes, the ADR exclusion), see the corpus-layer reference linked in
this guide's `relationships[]`.
