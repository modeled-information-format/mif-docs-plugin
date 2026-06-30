---
id: adr-0003-attested-delivery
type: semantic
created: '2026-06-30T10:00:00Z'
modified: '2026-06-30T10:00:00Z'
namespace: adr/mif-docs
title: 'ADR-0003: Adopt the Attested-Delivery Release Pattern'
description: >-
  Release the plugin with the self-contained attested-delivery pattern — a
  reproducible git-archive tarball, SLSA build provenance, and fail-closed
  verification before upload — so every release is independently verifiable.
tags:
  - adr
  - release
  - attestation
  - supply-chain
aliases:
  - ADR-0003
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
  trustLevel: verified
  agent: anthropic/claude-code
  wasAttributedTo:
    '@id': https://github.com/modeled-information-format
    '@type': prov:Agent
  wasGeneratedBy:
    '@id': urn:mif:activity:mif-docs-release-architecture-review
    '@type': prov:Activity
  wasDerivedFrom:
    - '@id': urn:mif:skill:attested-delivery
      '@type': prov:Entity
    - '@id': https://github.com/modeled-information-format/research-harness-template
      '@type': prov:Entity
    - '@id': https://github.com/modeled-information-format/.github
      '@type': prov:Entity
citations:
  - '@type': Citation
    citationType: documentation
    citationRole: methodology
    title: 'attested-delivery — the attested release architecture skill (SLSA L3, fail-closed verify)'
    url: https://github.com/modeled-information-format/.github
  - '@type': Citation
    citationType: repository
    citationRole: source
    title: 'modeled-information-format/research-harness-template — the release.yml this pattern is modeled on'
    url: https://github.com/modeled-information-format/research-harness-template
  - '@type': Citation
    citationType: tool
    citationRole: methodology
    title: 'actions/attest-build-provenance — generates the SLSA build provenance'
    url: https://github.com/actions/attest-build-provenance
  - '@type': Citation
    citationType: specification
    citationRole: methodology
    title: 'SLSA — Supply-chain Levels for Software Artifacts'
    url: https://slsa.dev/
    accessed: '2026-06-30'
relationships:
  - type: relates-to
    target: urn:mif:adr-0001-align-adr-to-smadr
  - type: relates-to
    target: urn:mif:adr-0002-ontologies-separate-repo
  - type: realized-by
    target: urn:mif:runbook-cut-attested-release
entity:
  name: Adopt the Attested-Delivery Release Pattern
  entity_type: decision-record
summary: >-
  From v0.1.0, releases are reproducible git-archive tarballs carrying SLSA build
  provenance, fail-closed verified before upload; modeled on
  research-harness-template, every action SHA-pinned via the central pin-check.
extensions:
  x-adr-status: accepted
  x-adr-category: supply-chain-security
  x-superseded-from-smadr: true
  x-decision-drivers:
    - supply-chain-integrity
    - independent-verifiability
    - fail-closed-publication
  x-slsa-build-level: 3
  x-signer-workflow: .github/workflows/release.yml
  x-verify-command: gh attestation verify --signer-workflow
  x-technologies:
    - slsa
    - github-actions
    - sigstore
---

# ADR-0003: Adopt the Attested-Delivery Release Pattern

## Status

Accepted

## Context

### Background and Problem Statement

The `mif-docs` plugin is publicly installable from the org marketplace: anyone
can `claude plugin install mif-docs@modeled-information-format` and run its
scripts and hooks. A publicly installed artifact is a supply-chain surface — an
installer needs to know the bytes they run were built from this repo's source by
this repo's workflow, and they need to be able to check that themselves. We had
to decide how releases are produced and verified before publishing v0.1.0.

### Current Limitations

1. **No provenance**: a plain release tarball carries no evidence of how or from
   what it was built.
2. **No independent verification**: without an attestation, an installer cannot
   confirm the artifact's origin from their own workstation.
3. **Unpinned actions**: floating action tags let a release's build steps change
   underneath the workflow without review.

## Decision Drivers

### Primary Decision Drivers

The following factors are weighted most heavily in this decision:

1. **Supply-chain integrity**: the release shall carry build provenance binding
   the artifact to this repo's source and workflow.
2. **Independent verifiability**: an installer shall be able to verify the
   release attestation from a workstation, without trusting the publisher.
3. **Fail-closed publication**: the release workflow shall verify its own
   attestation before upload and abort if verification fails.

### Secondary Decision Drivers

The following factors influenced the decision but were not individually decisive:

1. **Reproducible artifact**: the tarball should be byte-reproducible from a git
   ref so two builds of the same ref match.
2. **Pinned build steps**: every action should be SHA-pinned and enforced
   centrally, so the build cannot shift without review.

## Considered Options

### Option 1: Plain GitHub release, no provenance

**Description**: Attach a tarball to a GitHub release with no attestation and no
pinning enforcement.

**Technical Characteristics**:

- A release asset with no provenance metadata.
- Build steps may use floating action tags.

**Advantages**:

- Simplest possible release flow.
- No attestation tooling to wire.

**Disadvantages**:

- No evidence of origin; installers cannot verify the artifact.
- Floating tags let build steps change without review.

**Disqualifying Factor**: no provenance and no verification fail the
supply-chain-integrity and independent-verifiability drivers outright.

**Risk Assessment**:

- **Technical Risk**: Low to build, High to trust.
- **Schedule Risk**: Low.
- **Ecosystem Risk**: High. A public artifact with no verifiable origin.

### Option 2: Sign with an externally managed key

**Description**: Produce the tarball and sign it with a long-lived signing key
held in external key management.

**Technical Characteristics**:

- A detached signature over the artifact.
- Verification needs the publisher's public key distributed out of band.

**Advantages**:

- Artifacts carry a cryptographic signature.

**Disadvantages**:

- A long-lived key is an operational burden and a theft target.
- No build provenance; a signature proves who signed, not how it was built.

**Risk Assessment**:

- **Technical Risk**: Medium. Key custody and rotation.
- **Schedule Risk**: Medium. Key management to stand up.
- **Ecosystem Risk**: Medium. Out-of-band key distribution and trust.

### Option 3: Self-contained attested-delivery pattern

**Description**: Adopt the attested-delivery pattern modeled on
`research-harness-template`: build a reproducible `git archive` tarball, attest
SLSA build provenance with `actions/attest-build-provenance`, then fail-closed
verify with `gh attestation verify --signer-workflow` before upload, with all
actions SHA-pinned and a central `pin-check`.

**Technical Characteristics**:

- Reproducible `git archive` tarball bound to a tag.
- SLSA build provenance via `actions/attest-build-provenance`.
- `gh attestation verify --signer-workflow` gate before upload; keyless via OIDC.

**Advantages**:

- Every release is independently verifiable from a workstation.
- No long-lived key; identity is the run's ephemeral OIDC workflow identity.

**Disadvantages**:

- More workflow surface than a plain release; mitigated by reusing a proven
  pattern.

**Risk Assessment**:

- **Technical Risk**: Low. A proven pattern reused as-is.
- **Schedule Risk**: Low. Modeled on `research-harness-template`.
- **Ecosystem Risk**: Low. Keyless, standards-based, verifiable by anyone.

## Decision

We adopt the **self-contained attested-delivery pattern**, modeled on
`research-harness-template`. The release workflow:

- Builds a **reproducible `git archive` tarball** (`mif-docs-plugin-v0.1.0.tar.gz`).
- Generates **SLSA build provenance** with `actions/attest-build-provenance`.
- **Fail-closed verifies** the attestation with
  `gh attestation verify --signer-workflow` **before** upload, aborting on any
  failure.
- Uploads only on a **published release**; `workflow_dispatch` is a dry run.

All actions are **SHA-pinned** and enforced by a central `pin-check`. v0.1.0 is
released and attested.

## Consequences

### Positive

1. **Workstation-verifiable releases**: anyone can run `gh attestation verify`
   against a release artifact, satisfying the independent-verifiability driver.
2. **No long-lived key**: keyless OIDC signing removes a standing secret and its
   custody burden.

### Negative

1. **More workflow surface**: the release pipeline is larger than a plain upload;
   mitigated by reusing the proven `research-harness-template` pattern and the
   central `pin-check`.
2. **Verification dependency**: publication depends on the verify step passing;
   this is intentional — fail-closed means a failed verify blocks the release.

### Neutral

1. **Dry-run path**: `workflow_dispatch` runs the pipeline without uploading — a
   deliberate rehearsal mode, not a second release path.

## Decision Outcome

The decision achieves its primary objective — a publicly installable plugin whose
every release is verifiable and fail-closed — measured by: v0.1.0 released with a
verified attestation, and the marketplace `catalog-admission` verifying that
attestation fail-closed before listing the release.

Mitigations:

- The pattern is reused from `research-harness-template` rather than invented.
- `pin-check` centrally enforces SHA-pinning of every action in the pipeline.

## Related Decisions

- [ADR-0001: Align the adr Genre Fully to Structured MADR][adr-0001] - the genre
  whose conformant output this pipeline ships.
- [ADR-0002: Host Ontologies in a Separate Repository][adr-0002] - the ontology
  vendored into the attested artifact.
- [Runbook: Cut an Attested Release][runbook] - the operational procedure that
  executes this pattern.

## Links

- [SLSA build provenance — actions/attest-build-provenance][attest] - the action
  that generates the provenance this pattern verifies.

## More Information

- **Date:** 2026-06-30
- **Source:** mif-docs v0.1.0 release-architecture review
- **Related ADRs:** ADR-0001, ADR-0002

## Audit

### 2026-06-30

**Status:** Compliant

**Findings:**

| Finding                                          | Files | Lines | Assessment |
| ------------------------------------------------ | ----- | ----- | ---------- |
| Fail-closed verify-before-upload gate in place   | -     | -     | accepted   |

**Summary:** Decision accepted after the v0.1.0 release-architecture review;
releases use the attested-delivery pattern with a fail-closed verify gate.

**Action Required:** Keep `pin-check` green and the `gh attestation verify`
gate fail-closed before every upload.

[adr-0001]: 0001-align-adr-genre-to-structured-madr.md
[adr-0002]: 0002-host-ontologies-in-a-separate-repo.md
[runbook]: https://github.com/modeled-information-format/mif-docs-plugin/blob/main/docs/runbooks/cut-an-attested-release.md
[attest]: https://github.com/actions/attest-build-provenance
