---
id: adr-0001-align-adr-to-smadr
type: semantic
created: '2026-06-30T10:00:00Z'
modified: '2026-06-30T10:00:00Z'
namespace: adr/mif-docs
title: 'ADR-0001: Align the adr Genre Fully to Structured MADR'
description: >-
  Align the plugin's flagship adr genre fully to the org's canonical,
  Action-validated Structured MADR format instead of decoupling with an optional
  check, so ADRs never diverge from the ecosystem.
tags:
  - adr
  - structured-madr
  - validation
aliases:
  - ADR-0001
ontology:
  '@type': OntologyReference
  id: mif-docs
  version: 1.0.0
  uri: https://mif-spec.dev/ontologies/mif-docs
temporal:
  '@type': TemporalMetadata
  validFrom: '2026-06-30T00:00:00Z'
  recordedAt: '2026-06-30T10:00:00Z'
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
    - '@id': urn:mif:skill:adr
      '@type': prov:Entity
    - '@id': https://github.com/modeled-information-format/structured-madr
      '@type': prov:Entity
    - '@id': https://adr.github.io/madr/
      '@type': prov:Entity
citations:
  - '@type': Citation
    citationType: repository
    citationRole: source
    title: 'modeled-information-format/structured-madr — the canonical Action this genre aligns to'
    url: https://github.com/modeled-information-format/structured-madr
  - '@type': Citation
    citationType: specification
    citationRole: methodology
    title: 'MADR — Markdown Any Decision Records'
    url: https://adr.github.io/madr/
    accessed: '2026-06-30'
  - '@type': Citation
    citationType: documentation
    citationRole: background
    title: 'adr.github.io — Architectural Decision Records'
    url: https://adr.github.io/
    accessed: '2026-06-30'
relationships:
  - type: relates-to
    target: urn:mif:adr-0002-ontologies-separate-repo
  - type: relates-to
    target: urn:mif:adr-0003-attested-delivery
entity:
  name: Align the adr Genre Fully to Structured MADR
  entity_type: decision-record
summary: >-
  The flagship adr genre aligns fully to Structured MADR; the structured-madr
  Action is the authority for ADR validation in both smadr (strict) and mif
  (conformance) modes, so ADRs authored by the plugin never diverge from the org
  standard.
extensions:
  x-adr-status: accepted
  x-adr-category: documentation-format
  x-superseded-from-smadr: true
  x-decision-drivers:
    - flagship-genre
    - ecosystem-alignment
    - action-validation
  x-genre: adr
---

# ADR-0001: Align the adr Genre Fully to Structured MADR

## Status

Accepted

## Context

### Background and Problem Statement

The `mif-docs` plugin ships an `adr` genre skill — its flagship documentation
genre. An earlier working direction was to decouple the genre from
Structured MADR (`structured-madr`) and have the suite carry an MIF-only ADR
shape with, at most, an optional smadr check. Structured MADR is the
`modeled-information-format` org's canonical ADR format, and it is validated by
the `modeled-information-format/structured-madr` GitHub Action in both `smadr`
(structural) and `mif` (conformance, levels 1-3) modes. We had to settle
whether the genre owns its own ADR schema or reuses the org's Action-validated
one before publishing v0.1.0.

### Current Limitations

1. **Ecosystem divergence**: an MIF-only ADR shape would drift from the org's
   canonical format, so ADRs authored by the plugin would not validate with the
   same Action every other org repo uses.
2. **Duplicated validation**: keying ADRs into the suite's own `mif-validate`
   would re-implement ADR validation the `structured-madr` Action already owns.
3. **Flagship risk**: the `adr` genre is the most visible genre in the plugin;
   shipping it on a bespoke shape sets the wrong precedent for the other genres.

## Decision Drivers

### Primary Decision Drivers

The following factors are weighted most heavily in this decision:

1. **Flagship genre**: the `adr` genre shall be the reference example for the
   plugin, so it shall use the format the org already treats as canonical.
2. **Canonical, Action-validated format**: the genre shall validate against the
   `structured-madr` Action that the org maintains, not a parallel schema.
3. **No ecosystem divergence**: an ADR authored by the plugin shall be
   indistinguishable, to the validator, from one authored anywhere else in the
   org.

### Secondary Decision Drivers

The following factors influenced the decision but were not individually decisive:

1. **Single source of truth**: reusing the Action avoids maintaining a second
   ADR validator inside the suite.
2. **Author ergonomics**: contributors who already know Structured MADR write
   conformant ADRs with no plugin-specific relearning.

## Considered Options

### Option 1: Decouple with an optional smadr check

**Description**: Keep an MIF-only ADR shape inside the suite and offer the
`structured-madr` check as an opt-in extra rather than the authority.

**Technical Characteristics**:

- ADR validation lives in the suite's own `mif-validate`.
- The `structured-madr` Action is advisory, not the gate.

**Advantages**:

- Full local control over the ADR shape.
- No hard dependency on the external Action.

**Disadvantages**:

- Re-implements ADR validation the org already maintains.
- Lets the plugin's ADRs diverge from the canonical format over time.

**Disqualifying Factor**: an optional check that is not the gate cannot satisfy
the "no ecosystem divergence" driver — divergence becomes possible the moment
the two shapes drift.

**Risk Assessment**:

- **Technical Risk**: Medium. Two ADR validators must be kept in sync by hand.
- **Schedule Risk**: Medium. Ongoing maintenance of a duplicate validator.
- **Ecosystem Risk**: High. The plugin's ADRs can drift from the org standard.

### Option 2: Full Structured MADR alignment

**Description**: Align the `adr` genre fully to Structured MADR and make the
`structured-madr` Action the authority for ADR validation.

**Technical Characteristics**:

- Every ADR carries `type: adr` plus `conceptType: semantic`.
- The genre is exempt from the suite's `mif-validate`, which keys on
  `conceptType`; the `structured-madr` Action validates it instead.

**Advantages**:

- ADRs validate with the org's canonical Action in `smadr` and `mif` modes.
- No duplicate ADR validator to maintain inside the suite.

**Disadvantages**:

- Adds a dependency on the external `structured-madr` Action in CI.

**Risk Assessment**:

- **Technical Risk**: Low. One canonical validator, reused as-is.
- **Schedule Risk**: Low. No bespoke ADR schema to maintain.
- **Ecosystem Risk**: Low. The plugin tracks the org standard by construction.

## Decision

We align the `adr` genre **fully** to Structured MADR, reversing the earlier
decision to decouple from it. The `structured-madr` Action is the authority for
ADR validation.

The implementation is:

- Every ADR carries `type: adr` and `conceptType: semantic` in its frontmatter.
- The `adr` genre is **exempt** from the suite's `mif-validate`, which keys on
  `conceptType`; the fail-closed PostToolUse guard skips `type: adr` documents
  for the same reason.
- CI runs the `structured-madr` Action over the ADRs in both `smadr` (strict)
  and `mif` (conformance) modes via the `adr-smadr` job.

## Consequences

### Positive

1. **Canonical validation**: ADRs validate with the same Action every org repo
   uses, satisfying the no-divergence driver directly.
2. **No duplicate validator**: the suite carries no parallel ADR schema to keep
   in sync.

### Negative

1. **External dependency**: ADR validation now depends on the `structured-madr`
   Action in CI; mitigated because the Action is maintained in the same org and
   pinned by SHA.
2. **Two validation paths**: ADRs follow a different gate from the other genres;
   mitigated by documenting the exemption where `conceptType` is described.

### Neutral

1. **Genre exemption**: the `adr` genre is the one genre outside the
   `mif-validate` suite — a deliberate split, not an inconsistency.

## Decision Outcome

The decision achieves its primary objective — a flagship ADR genre that never
diverges from the org standard — measured by the `adr-smadr` CI job passing in
both `smadr` strict and `mif` conformance modes for every shipped ADR.

Mitigations:

- The external Action is pinned by SHA and maintained in the same org.
- The `mif-validate` exemption is recorded wherever `conceptType` gating is
  documented, so the two-path split is discoverable.

## Related Decisions

- [ADR-0002: Host Ontologies in a Separate Repository][adr-0002] - another reuse
  of an org-shared, separately maintained source.
- [ADR-0003: Attested-Delivery Release Pattern][adr-0003] - the release gate that
  ships the conformant genre.

## Links

- [Structured MADR — modeled-information-format/structured-madr][smadr] - the
  canonical Action this genre aligns to.

## More Information

- **Date:** 2026-06-30
- **Source:** mif-docs v0.1.0 genre alignment review
- **Related ADRs:** ADR-0002, ADR-0003

## Audit

### 2026-06-30

**Status:** Compliant

**Findings:**

| Finding                                         | Files | Lines | Assessment |
| ----------------------------------------------- | ----- | ----- | ---------- |
| Earlier decouple-from-smadr direction reversed  | -     | -     | accepted   |

**Summary:** Decision accepted after the v0.1.0 genre alignment review; the
earlier decouple-from-smadr direction was reversed in favor of full alignment.

**Action Required:** Keep the `adr-smadr` CI job green in both `smadr` and `mif`
modes for every shipped ADR.

[adr-0002]: https://modeled-information-format.github.io/mif-docs-plugin/adr/0002-host-ontologies-in-a-separate-repo/
[adr-0003]: https://modeled-information-format.github.io/mif-docs-plugin/adr/0003-attested-delivery-release-pattern/
[smadr]: https://github.com/modeled-information-format/structured-madr
