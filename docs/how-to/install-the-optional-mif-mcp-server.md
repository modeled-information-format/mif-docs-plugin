---
id: how-to-install-mif-mcp
type: procedural
created: '2026-07-05T12:00:00Z'
modified: '2026-07-05T12:00:00Z'
namespace: how-to/tooling
title: How to Install the Optional mif-mcp Server
tags:
  - how-to
  - mif-docs
  - mcp
  - mif-rs
temporal:
  '@type': TemporalMetadata
  validFrom: '2026-07-05T00:00:00Z'
  recordedAt: '2026-07-05T12:00:00Z'
  ttl: P1Y
relationships:
  - type: relates-to
    target: urn:mif:how-to-validate-and-author
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
    title: 'modeled-information-format/mif-rs — the Rust implementation shipping the mif-mcp binary this guide installs'
    url: https://github.com/modeled-information-format/mif-rs
  - '@type': Citation
    citationType: specification
    citationRole: background
    title: 'Model Context Protocol — the protocol mif-mcp speaks over stdio'
    url: https://modelcontextprotocol.io/
    accessed: '2026-07-05'
entity:
  name: Install the Optional mif-mcp Server
  entity_type: how-to-guide
extensions:
  x-diataxis-quadrant: how-to
  x-optional-dependency: mif-mcp
---

# How to Install the Optional mif-mcp Server

Install the `mif-mcp` binary so the plugin's `.mcp.json` registration comes
alive, giving your session six MCP tools backed by the
[mif-rs](https://github.com/modeled-information-format/mif-rs) Rust
implementation: `validate_mif_document`, `resolve_ontology_reference`,
`ingest_mif_document`, `search_documents`, `find_similar_documents`, and
`corpus_stats`.

## The optionality contract

The server is an **optional enhancement**. The plugin's gates, hooks, and skills
run entirely on the Node engine; nothing in `hooks/mif-guard.mjs` or CI depends
on `mif-mcp`. With the binary absent, the registered server simply fails to
start and the plugin behaves exactly as before — install it only when you want
the semantic-search layer or Rust-native validation.

## Prerequisites

- The mif-docs plugin installed.
- One of: the `gh` CLI (to download and verify a release binary), or a Rust
  toolchain (to build from crates.io).

## Install from an attested release (recommended)

Download the binary for your platform from the mif-rs releases and verify its
SLSA build provenance before trusting it:

```bash
gh release download --repo modeled-information-format/mif-rs \
  --pattern 'mif-mcp-*-macos-arm64'
gh attestation verify mif-mcp-0.3.1-macos-arm64 \
  --repo modeled-information-format/mif-rs \
  --signer-workflow modeled-information-format/mif-rs/.github/workflows/release.yml
install -m 0755 mif-mcp-0.3.1-macos-arm64 ~/.local/bin/mif-mcp
```

Substitute your platform (`linux-amd64`, `linux-arm64`, `macos-amd64`,
`macos-arm64`, `windows-amd64.exe`) and the current release version.

The verify step is fail-closed and pins the signer: the attestation must have
been produced by the mif-rs release workflow itself, not merely by some
workflow in the repository. If verification fails, do not install the
artifact.

## Install with cargo

```bash
cargo install mif-mcp
```

Either route places `mif-mcp` on your `PATH`, which is all the plugin's
`.mcp.json` entry requires (it launches the server over stdio by bare command
name).

## Confirm the server is live

Restart your Claude Code session so the plugin's MCP registration reconnects,
then ask the session to list MCP tools. The six `mif-mcp` tools appear when the
binary resolves. Failures from the tools render as RFC 9457
`application/problem+json` envelopes with `suggested_fix` hints.

## Result

The optional server is installed and verified, and the plugin's semantic
tooling is available. To put the corpus tools to work over a documentation set,
see the validation how-to and the genre catalog linked in this guide's
`relationships[]`.
