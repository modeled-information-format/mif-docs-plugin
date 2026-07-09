---
id: how-to-install-mif-mcp
type: procedural
created: '2026-07-05T12:00:00Z'
modified: '2026-07-09T00:00:00Z'
namespace: how-to/tooling
title: How to Install the Optional mif-rs Tools (mif-mcp and mif-cli)
tags:
  - how-to
  - mif-docs
  - mcp
  - mif-cli
  - mif-rs
temporal:
  '@type': TemporalMetadata
  validFrom: '2026-07-05T00:00:00Z'
  recordedAt: '2026-07-09T00:00:00Z'
  ttl: P1Y
relationships:
  - type: relates-to
    target: urn:mif:how-to-validate-and-author
  - type: relates-to
    target: urn:mif:how-to-ingest-and-search
  - type: relates-to
    target: urn:mif:reference-corpus-layer
  - type: relates-to
    target: urn:mif:reference-genre-and-cli
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
    title: 'modeled-information-format/mif-rs — the Rust implementation shipping the mif-mcp and mif-cli binaries this guide installs'
    url: https://github.com/modeled-information-format/mif-rs
  - '@type': Citation
    citationType: specification
    citationRole: background
    title: 'Model Context Protocol — the protocol mif-mcp speaks over stdio'
    url: https://modelcontextprotocol.io/
    accessed: '2026-07-05'
entity:
  name: Install the Optional mif-rs Tools
  entity_type: how-to-guide
extensions:
  x-diataxis-quadrant: how-to
  x-optional-dependency: mif-rs
---

# How to Install the Optional mif-rs Tools (mif-mcp and mif-cli)

Install the two optional binaries from the
[mif-rs](https://github.com/modeled-information-format/mif-rs) Rust
implementation. `mif-mcp` brings the plugin's `.mcp.json` registration alive,
giving your session six MCP tools (`validate_mif_document`,
`resolve_ontology_reference`, `ingest_mif_document`, `search_documents`,
`find_similar_documents`, `corpus_stats`). `mif-cli` exposes the same six
operations as a command line (`validate`, `ontology resolve`, `ingest`,
`search`, `find-similar`, `corpus-stats`) and is the fallback the
`mif-corpus` skill uses when no MCP server is connected. Install either or
both; the corpus how-to works with `mif-cli` alone.

## The optionality contract

Both binaries are an **optional enhancement**. The plugin's gates, hooks, and
skills run entirely on the Node engine; nothing in `hooks/mif-guard.mjs` or
CI depends on either binary (ADR-0004 keeps the Node engine authoritative).
With them absent, the registered MCP server simply fails to start and the
plugin behaves exactly as before — install them only when you want the
semantic-search layer or Rust-native validation.

## Prerequisites

- The mif-docs plugin installed.
- One of: the `gh` CLI (to download and verify release binaries), or a Rust
  toolchain (to build from crates.io).

## Install from an attested release (recommended)

Download the binaries for your platform from the mif-rs releases and verify
their SLSA build provenance before trusting them:

```bash
gh release download --repo modeled-information-format/mif-rs \
  --pattern 'mif-mcp-*-macos-arm64' --pattern 'mif-cli-*-macos-arm64'

gh attestation verify mif-mcp-0.3.1-macos-arm64 \
  --repo modeled-information-format/mif-rs \
  --signer-workflow modeled-information-format/mif-rs/.github/workflows/release.yml
gh attestation verify mif-cli-0.3.1-macos-arm64 \
  --repo modeled-information-format/mif-rs \
  --signer-workflow modeled-information-format/mif-rs/.github/workflows/release.yml

install -m 0755 mif-mcp-0.3.1-macos-arm64 ~/.local/bin/mif-mcp
install -m 0755 mif-cli-0.3.1-macos-arm64 ~/.local/bin/mif-cli
```

Substitute your platform (`linux-amd64`, `linux-arm64`, `macos-amd64`,
`macos-arm64`, `windows-amd64.exe`) and the current release version.

The verify step is fail-closed and pins the signer: the attestation must have
been produced by the mif-rs release workflow itself, not merely by some
workflow in the repository. If verification fails for an artifact, do not
install it.

## Install with cargo

```bash
cargo install mif-cli mif-mcp
```

Either route places the binaries on your `PATH`, which is all that is
required: the plugin's `.mcp.json` entry launches `mif-mcp` over stdio by
bare command name, and the `mif-corpus` skill invokes `mif-cli` the same way.

## Confirm the tools work

For `mif-cli`, run it directly:

```bash
mif-cli --version
mkdir -p .mif && mif-cli corpus-stats
```

An empty store reports `count=0` — that is success. The `mkdir` matters on a
first run: the default store path is `.mif/vectors.db` relative to the
working directory, and `corpus-stats` reports a `missing-parent-dir` problem
envelope rather than creating the directory itself (only `ingest` creates
it).

For `mif-mcp`, restart your Claude Code session so the plugin's MCP
registration reconnects, then ask the session to list MCP tools. The six
`mif-mcp` tools appear when the binary resolves. Failures from either tool
render as RFC 9457 `application/problem+json` envelopes with `suggested_fix`
hints.

Or run the plugin's own advisory check, which reports the same PATH
resolution and flags a version behind the latest mif-rs release without
requiring a session restart:

```bash
npm run doctor
```

This never fails: it is a report, not a gate, since both binaries stay
optional (ADR-0004).

## Result

The optional tools are installed and verified, and the plugin's semantic
layer is available over MCP, the command line, or both. To put them to work
over a documentation set, see the ingest-and-search how-to and the
corpus-layer reference linked in this guide's `relationships[]`.
