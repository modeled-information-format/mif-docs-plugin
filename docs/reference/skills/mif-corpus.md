---
id: reference-skill-mif-corpus
type: semantic
created: '2026-07-05T12:00:00Z'
modified: '2026-07-05T12:00:00Z'
namespace: reference/skills
title: 'Skill reference: mif-corpus'
tags:
  - reference
  - mif-docs
  - skill
  - corpus
  - semantic-search
temporal:
  '@type': TemporalMetadata
  validFrom: '2026-07-05T00:00:00Z'
  recordedAt: '2026-07-05T12:00:00Z'
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
    - '@id': urn:mif:skill:mif-corpus
      '@type': prov:Entity
citations:
  - '@type': Citation
    citationType: repository
    citationRole: methodology
    title: 'modeled-information-format/mif-rs — the Rust tools backing this skill'
    url: https://github.com/modeled-information-format/mif-rs
  - '@type': Citation
    citationType: tool
    citationRole: source
    title: 'mif-docs — mif-corpus skill (SKILL.md)'
    url: https://github.com/modeled-information-format/mif-docs-plugin/tree/main/skills/mif-corpus
relationships:
  - type: relates-to
    target: urn:mif:reference-skills-by-purpose
  - type: relates-to
    target: urn:mif:reference-corpus-layer
  - type: relates-to
    target: urn:mif:reference-skill-mif-validate
  - type: relates-to
    target: urn:mif:reference-skill-doc-set-planner
ontology:
  '@type': OntologyReference
  id: mif-docs
  version: 1.0.0
  uri: https://mif-spec.dev/ontologies/mif-docs
entity:
  name: 'Skill reference: mif-corpus'
  entity_type: reference-document
extensions:
  x-skill: mif-corpus
  x-genre-conceptType: substrate
  x-target-level: 3
  x-purpose-group: authoring-helpers
  x-optional-dependency: mif-rs
---

# Skill reference: `mif-corpus`

The `mif-corpus` skill is a **substrate helper**: it gives the suite semantic
discovery over the MIF documents it produces — an embedding index queried by
meaning. Where `mif-validate` proves what a document is, `mif-corpus` finds
what a document is about. This reference describes what the skill produces,
the store it manages, and the contracts it operates under.

| Property | Value |
| --- | --- |
| Authors | Ranked discovery results and an ingest/stats report — never a verdict |
| Purpose group | Authoring helpers |
| MIF `conceptType` | `substrate` |
| Backing tools | [mif-rs](https://github.com/modeled-information-format/mif-rs) `mif-mcp` (MCP) or `mif-cli`, both optional |
| Store | `.mif/vectors.db`, gitignored, derived |

## What this skill produces

Four operations over a local vector store: **ingest** (validate a MIF doc,
prove its round-trip, embed its content, upsert the vector), **search**
(rank stored docs against a free-text query), **find-similar** (rank docs
against an already-ingested one, anchor excluded), and **corpus-stats**
(count, embedding dimension, db path). Results are `(score, id)` pairs in
cosine similarity, most similar first, keyed by the documents' `urn:mif:`
ids.

The output is always a *candidate list* for a person or a genre skill to act
on — cross-link suggestions, coverage checks, corpus navigation. It is never
a conformance verdict; that remains the exclusive business of
`mif-validate`.

## The optionality contract

The backing tools are an optional enhancement. The skill prefers a connected
`mif-mcp` MCP server, falls back to a `mif-cli` binary on `PATH`, and — when
neither exists — states plainly that the corpus layer is unavailable and
points at the install route. It never fabricates scores or substitutes
string search presented as semantic search. No gate, hook, or genre skill in
the suite depends on this skill's availability.

## Behaviors that matter

- **Fail-closed ingest** — a document that fails schema validation or the
  lossless round-trip stores nothing; the failure renders as an RFC 9457
  problem envelope naming the cause.
- **ADR exclusion** — documents carrying a top-level `description:` key
  currently fail the Rust round-trip inside ingest; in this repo those are
  the ADR documents under `docs/adr/` (MIF `type: semantic`), skipped in bulk
  ingests by key or path with the skip stated (tracked in the
  engine-convergence epic).
- **First-run cost** — the first ingest or search downloads the embedding
  model once; subsequent runs are local.
- **Consumed by the planner** — `doc-set-planner`'s corpus-aware update
  (shipped as its own stacked change) reads the corpus at Plan time
  (existing-coverage discovery) and Reconcile time (candidate
  `relationships[]` targets); the recipe contract and `planner-check` stay
  authoritative.

## Related pages

The corpus-layer reference carries the full operation-by-operation contract
(tool names, store schema, error envelopes); the ingest-and-search how-to
walks the task end to end. Both are linked from this page's
`relationships[]`.
