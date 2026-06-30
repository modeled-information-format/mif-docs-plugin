---
id: adr-0002-ontologies-separate-repo
type: semantic
created: '2026-06-30T10:00:00Z'
modified: '2026-06-30T10:00:00Z'
namespace: adr/mif-docs
title: 'ADR-0002: Host Ontologies in a Separate Repository'
description: >-
  Host the MIF ontology in the org-shared ontologies repo and have the plugin
  hydrate it at dev and vendor it into the release artifact, rather than
  committing a copy here that would drift.
tags:
  - adr
  - ontology
  - vendoring
aliases:
  - ADR-0002
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
    - '@id': https://github.com/modeled-information-format/ontologies
      '@type': prov:Entity
    - '@id': urn:mif:ontology:mif-docs
      '@type': prov:Entity
citations:
  - '@type': Citation
    citationType: repository
    citationRole: source
    title: 'modeled-information-format/ontologies — the authoritative home of the ontology this plugin hydrates and vendors'
    url: https://github.com/modeled-information-format/ontologies
  - '@type': Citation
    citationType: documentation
    citationRole: methodology
    title: 'MIF Ontology Corpus — the knowledge-discovery model the genres validate namespaces against'
    url: https://github.com/modeled-information-format/ontologies
  - '@type': Citation
    citationType: specification
    citationRole: background
    title: 'MIF — Modeled Information Format Specification'
    url: https://mif-spec.dev/
    accessed: '2026-06-30'
relationships:
  - type: relates-to
    target: urn:mif:adr-0001-align-adr-to-smadr
  - type: relates-to
    target: urn:mif:adr-0003-attested-delivery
entity:
  name: Host Ontologies in a Separate Repository
  entity_type: decision-record
summary: >-
  The MIF ontology stays in the org-shared ontologies repo; the plugin hydrates
  it from a raw URL at dev time and vendors a fixed copy into the release
  artifact, so there is one authoritative ontology with no committed duplicate to
  drift.
extensions:
  x-adr-status: accepted
  x-adr-category: architecture
  x-superseded-from-smadr: true
  x-decision-drivers:
    - shared-corpus
    - drift-avoidance
    - vendor-at-release
  x-hydration:
    - dev-sibling
    - release-vendored
---

# ADR-0002: Host Ontologies in a Separate Repository

## Status

Accepted

## Context

### Background and Problem Statement

The `mif-docs` plugin validates the namespaces of the documents it produces
against an MIF ontology — a knowledge-discovery layer that names the entity
types, namespaces, and relationship vocabulary the genres draw on. That same
ontology is consumed beyond this plugin: it is an org-shared asset used across
`modeled-information-format` repos. We had to decide where the ontology lives
and how the plugin obtains it, because the obvious shortcut — committing a copy
of the ontology into this repo — makes the plugin a second, independently
edited home for a shared artifact.

### Current Limitations

1. **Shared asset, single consumer view**: the ontology serves multiple repos,
   but committing it here would frame it as this plugin's private file.
2. **Drift risk**: two committed copies of the same ontology drift the moment
   either side is edited without the other.
3. **No single authority**: with a local copy, there is no one place that is
   unambiguously the source of truth for the ontology.

## Decision Drivers

### Primary Decision Drivers

The following factors are weighted most heavily in this decision:

1. **Org-shared source of truth**: the ontology shall have exactly one
   authoritative home that every consumer resolves from.
2. **No duplication-driven drift**: the plugin shall not carry a committed copy
   of the ontology that can diverge from the authoritative one.
3. **Reproducible releases**: a released artifact shall contain a fixed ontology
   so a published plugin validates identically offline.

### Secondary Decision Drivers

The following factors influenced the decision but were not individually decisive:

1. **Fast local iteration**: a developer with the sibling repo checked out
   should validate against the live ontology without a publish step.
2. **CI cost**: routine push CI should not depend on fetching an external repo
   on every run.

## Considered Options

### Option 1: Commit a copy of the ontology in this repo

**Description**: Vendor the ontology as a committed file in `mif-docs` and edit
it here alongside the genres.

**Technical Characteristics**:

- The ontology is a tracked file in this repository.
- Validation reads the local committed copy.

**Advantages**:

- No external dependency to resolve at dev or release.
- Validation works with a single checkout.

**Disadvantages**:

- Creates a second editable home for an org-shared artifact.
- The committed copy drifts from the authoritative ontology over time.

**Disqualifying Factor**: a committed copy is a second source of truth, which
fails the org-shared-source-of-truth and no-drift drivers directly.

**Risk Assessment**:

- **Technical Risk**: Low to obtain, High to keep correct. Drift is the failure.
- **Schedule Risk**: Medium. Manual reconciliation between copies.
- **Ecosystem Risk**: High. Consumers see divergent ontologies.

### Option 2: Host in a separate repo; hydrate at dev, vendor at release

**Description**: Keep the ontology in the sibling `modeled-information-format/ontologies`
repo. The plugin hydrates it from a raw URL at dev time and vendors a fixed copy
into the release artifact.

**Technical Characteristics**:

- The authoritative ontology lives in the `ontologies` repo.
- `hydrate-ontology` fetches it; `validate-ontology` is the gate; the release
  bundles a vendored copy.

**Advantages**:

- One authoritative ontology; no committed duplicate to drift.
- Releases stay reproducible because the vendored copy is fixed at build time.

**Disadvantages**:

- `validate-ontology` needs either a sibling checkout (dev) or the vendored copy
  (release); it is intentionally not run in routine push CI.

**Risk Assessment**:

- **Technical Risk**: Low. Hydration and vendoring are scripted.
- **Schedule Risk**: Low. No manual copy reconciliation.
- **Ecosystem Risk**: Low. A single authoritative ontology for all consumers.

## Decision

We host the ontology in the separate `modeled-information-format/ontologies`
repository. The plugin does **not** commit the ontology here. Instead:

- At **dev** time, `hydrate-ontology` resolves the ontology from the sibling
  repo's raw URL, and `validate-ontology` checks it against a sibling checkout.
- At **release** time, the ontology is **vendored** into the release artifact so
  the published plugin validates against a fixed copy.

`validate-ontology` therefore runs at dev (sibling checkout) and at release
(vendored copy), and **not** in routine push CI, because push CI has neither the
sibling checkout nor a reason to fetch the external repo on every run.

## Consequences

### Positive

1. **Single source of truth**: one authoritative ontology serves every consumer,
   satisfying the no-drift driver by construction.
2. **Reproducible releases**: the vendored copy fixes the ontology at build time,
   so a published plugin validates identically offline.

### Negative

1. **No push-CI ontology gate**: `validate-ontology` is not in push CI, so an
   ontology mismatch is caught at dev or release, not on every push; mitigated by
   running it as the release gate before any artifact is built.
2. **Dev setup step**: validating locally needs the sibling repo checked out;
   mitigated because `hydrate-ontology` automates the fetch.

### Neutral

1. **Two obtain paths**: dev hydrates, release vendors — one ontology reached two
   ways, a deliberate split rather than an inconsistency.

## Decision Outcome

The decision achieves its primary objective — one authoritative ontology with no
committed duplicate — measured by: no ontology copy tracked in this repo, and
`validate-ontology` passing against the sibling checkout at dev and the vendored
copy at release.

Mitigations:

- `hydrate-ontology` automates resolving the sibling ontology at dev.
- `validate-ontology` is wired as the release gate, covering the absence of a
  push-CI ontology check.

## Related Decisions

- [ADR-0001: Align the adr Genre Fully to Structured MADR][adr-0001] - another
  reuse of an org-maintained, separately validated source.
- [ADR-0003: Attested-Delivery Release Pattern][adr-0003] - the release that
  vendors the ontology into the verified artifact.

## Links

- [modeled-information-format/ontologies][ontologies] - the authoritative home of
  the ontology this plugin hydrates and vendors.

## More Information

- **Date:** 2026-06-30
- **Source:** mif-docs v0.1.0 ontology-sourcing review
- **Related ADRs:** ADR-0001, ADR-0003

## Audit

### 2026-06-30

**Status:** Compliant

**Findings:**

| Finding                                          | Files | Lines | Assessment |
| ------------------------------------------------ | ----- | ----- | ---------- |
| No ontology copy committed; hydrate plus vendor  | -     | -     | accepted   |

**Summary:** Decision accepted after the v0.1.0 ontology-sourcing review; the
ontology stays in the sibling repo, hydrated at dev and vendored at release.

**Action Required:** Keep `validate-ontology` wired as the release gate and out
of routine push CI.

[adr-0001]: 0001-align-adr-genre-to-structured-madr.md
[adr-0003]: 0003-attested-delivery-release-pattern.md
[ontologies]: https://github.com/modeled-information-format/ontologies
