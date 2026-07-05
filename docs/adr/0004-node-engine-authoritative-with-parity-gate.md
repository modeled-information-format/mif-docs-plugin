---
id: adr-0004-node-engine-authoritative
type: semantic
created: '2026-07-05T12:00:00Z'
modified: '2026-07-05T12:00:00Z'
namespace: adr/mif-docs
title: 'ADR-0004: Node Engine Stays Authoritative, Convergence Proven by a Parity Gate'
summary: The plugin's node validation engine remains the authoritative MIF conformance gate; the mif-rs Rust engine is compared against it by a non-required nightly parity job with an explicit expected-disagreement ledger, and no engine substitution happens until that ledger is empty and the upstream capability gaps are closed.
tags:
  - adr
  - validation
  - parity
  - mif-rs
aliases:
  - ADR-0004
temporal:
  '@type': TemporalMetadata
  validFrom: '2026-07-05T00:00:00Z'
  recordedAt: '2026-07-05T12:00:00Z'
  ttl: P3Y
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
relationships:
  - type: relates-to
    target: urn:mif:adr-0001-align-adr-to-smadr
  - type: relates-to
    target: urn:mif:adr-0003-attested-delivery
citations:
  - '@type': Citation
    citationType: repository
    citationRole: source
    title: 'modeled-information-format/mif-rs — the Rust implementation whose engine this decision scopes'
    url: https://github.com/modeled-information-format/mif-rs
  - '@type': Citation
    citationType: documentation
    citationRole: background
    title: 'mif-rs#38 — description key dropped by jsonld_to_md, the currently known verdict divergence'
    url: https://github.com/modeled-information-format/mif-rs/issues/38
  - '@type': Citation
    citationType: specification
    citationRole: background
    title: MIF — Modeled Information Format Specification
    url: https://mif-spec.dev/
    accessed: '2026-07-05'
ontology:
  '@type': OntologyReference
  id: mif-docs
  version: 1.0.0
  uri: https://mif-spec.dev/ontologies/mif-docs
entity:
  name: Node Engine Authoritative with Parity Gate
  entity_type: decision-record
extensions:
  x-adr-status: accepted
  x-adr-category: architecture
  x-decision-drivers:
    - single-authoritative-verdict
    - fail-closed-determinism
    - convergence-without-blocking
---

# ADR-0004: Node Engine Stays Authoritative, Convergence Proven by a Parity Gate

## Status

Accepted

## Context

### Background and Problem Statement

Two implementations now claim the same MIF conformance semantics: this
plugin's node engine (`scripts/lib/projection.mjs` behind `mif-validate.mjs`,
the CI gates, and the fail-closed write guard) and the mif-rs Rust engine
(`mif-schema`/`mif-frontmatter` behind `mif-cli` and `mif-mcp`). They are
demonstrably not verdict-identical today: every document carrying a
`description:` frontmatter key passes the node round-trip and fails the Rust
one (mif-rs#38 — in this repo, the three project ADRs). We had to decide
which engine's verdict governs, and how divergence gets detected instead of
discovered by accident.

### Current Limitations

1. **Capability gap**: the Rust engine has no L1/L2/L3 level overlay, no
   markdown input to a pure validate, and no standalone round-trip or
   projection commands (mif-rs#39, #40, #41).
2. **Verdict gap**: at least one class of conformant documents is rejected by
   the Rust round-trip (mif-rs#38).
3. **No divergence detection**: nothing compared the engines, so a drift in
   either direction would surface only as a confusing downstream failure.

## Decision Drivers

### Primary Decision Drivers

1. **Single authoritative verdict**: exactly one engine's verdict shall
   decide whether a document is conformant; two half-authorities is how
   contradictory gates happen.
2. **Fail-closed determinism**: the write guard and CI gates shall not depend
   on an optionally-installed binary.
3. **Convergence without blocking**: divergence shall be detected and
   attributed continuously without gating plugin merges on an engine this
   repo does not control.

### Secondary Decision Drivers

1. **Attributable failures**: a parity break should point at a specific
   engine version and a specific upstream issue.
2. **Cheap eventual migration**: when the gaps close, adopting the Rust
   engine as a fast path should be a small, evidence-backed change.

## Considered Options

### Option 1: Substitute the Rust engine into the gates now

**Description**: Replace the node validator inside `mif-validate.mjs`,
`mif-guard.mjs`, and CI with `mif-cli`.

**Advantages**:

- One implementation to maintain eventually; native speed.

**Disadvantages**:

- Rejects currently-conformant documents (mif-rs#38) and cannot express the
  level floors the suite's contract is built on (mif-rs#40).
- Makes the fail-closed guard depend on a binary that most environments do
  not have, violating the determinism driver.

**Disqualifying Factor**: fails two primary drivers outright while the
capability gaps are open.

**Risk Assessment**:

- **Technical Risk**: High. Verdict regressions on day one.
- **Ecosystem Risk**: High. The guard would block valid work or fail open.

### Option 2: Run both engines as required CI gates

**Description**: Keep the node gates and add `mif-cli` as a second required
check on every push and pull request.

**Advantages**:

- Divergence surfaces immediately on the offending change.

**Disadvantages**:

- Every known upstream gap (mif-rs#38 today) blocks every plugin PR until
  fixed upstream — merges gated on a repo this one does not control.
- Requires the binary in the hot CI path, coupling routine merges to an
  external release artifact.

**Risk Assessment**:

- **Technical Risk**: Medium. Mechanically simple, operationally brittle.
- **Schedule Risk**: High. Upstream fix latency becomes merge latency.

### Option 3: Node authoritative, plus a non-required parity job with an expected-disagreement ledger

**Description**: The node engine remains the sole authority for every gate.
A nightly (and on-demand) `engine-parity` workflow downloads a pinned,
attestation-verified `mif-cli` release, runs both engines over the same
corpus CI gates, and compares verdicts against a committed ledger of expected
disagreements, each tied to an upstream issue. The job fails on any
unexpected disagreement and on any stale expectation (a listed file whose
engines now agree), so the ledger cannot rot in either direction.

**Advantages**:

- Divergence is detected within a day, attributed to a pinned engine version
  and a named upstream issue, and never blocks a merge.
- The guard and required CI keep zero binary dependencies.
- The empty-ledger condition is the objective, mechanical trigger for
  revisiting engine substitution.

**Disadvantages**:

- Divergence introduced by a plugin change lands before the nightly catches
  it; acceptable because the node gates still hold the authoritative line on
  every push.
- One more workflow and fixture set to maintain.

**Risk Assessment**:

- **Technical Risk**: Low. Additive; the harness is ~170 lines of node.
- **Schedule Risk**: Low. Upstream latency affects only the ledger's size.
- **Ecosystem Risk**: Low. No consumer-visible behavior change.

## Decision

We adopt Option 3. The node engine is **authoritative**: a disagreement is
evidence for an upstream mif-rs issue, never a reason to alter a document the
node gates accept. The parity job stays **non-required** (schedule and manual
dispatch only — it cannot appear as a PR check). The compared `mif-cli`
release is **pinned and attestation-verified** with the signer workflow
named, and bumped deliberately. `mif-cli` may become an opt-in fast path
inside the gates **only after** the expected-disagreement ledger is empty and
mif-rs#38, #39, #40, and #41 are closed — and that substitution requires its
own ADR superseding this one.

## Consequences

### Positive

1. **Divergence is a signal, not an outage**: parity breaks page nothing and
   block nothing; they produce an attributed, actionable failure.
2. **The authority question is settled**: every gate, hook, and doc can state
   plainly which verdict governs.

### Negative

1. **Up-to-a-day detection latency** for divergence introduced by plugin
   changes; mitigated by the node gates remaining the required line.
2. **Ledger maintenance**: expected disagreements must be pruned when
   upstream fixes land; mitigated by the stale-expectation failure mode,
   which makes forgetting impossible rather than easy.

### Neutral

1. **The Rust engine stays consumer-facing** through the optional mif-mcp and
   mif-cli integrations; this decision scopes gates, not features.

## Decision Outcome

The decision achieves its objective — one authoritative engine with
continuously proven convergence — measured by: the parity job green nightly,
every ledger entry citing an open upstream issue, and zero binary
dependencies in `hooks/` or required CI.

## Related Decisions

- [ADR-0001: Align the adr Genre Fully to Structured MADR][adr-0001] — the
  same pattern of delegating a class of validation to its canonical owner.
- [ADR-0003: Attested-Delivery Release Pattern][adr-0003] — the attestation
  discipline the parity job applies to the binary it downloads.

## Links

- [modeled-information-format/mif-rs][mif-rs] — the Rust implementation and
  the four tracked capability/verdict issues (#38, #39, #40, #41).

## More Information

- **Date:** 2026-07-05
- **Source:** engine-convergence epic review (mif-docs-plugin#30)
- **Related ADRs:** ADR-0001, ADR-0003

## Audit

### 2026-07-05

**Status:** Compliant

**Findings:**

| Finding                                            | Files | Lines | Assessment |
| -------------------------------------------------- | ----- | ----- | ---------- |
| Parity harness + ledger + non-required nightly job | -     | -     | accepted   |

**Summary:** Decision accepted with the engine-parity workflow, harness, and
expected-disagreement ledger landing in the same change; local run shows 98
docs, 94 agreements, 4 expected disagreements (all mif-rs#38), 0 unexpected,
0 stale, 0 orphaned.

**Action Required:** Prune the ledger as upstream fixes land; supersede this
ADR before any engine substitution in the gates.

[adr-0001]: 0001-align-adr-genre-to-structured-madr.md
[adr-0003]: 0003-attested-delivery-release-pattern.md
[mif-rs]: https://github.com/modeled-information-format/mif-rs
