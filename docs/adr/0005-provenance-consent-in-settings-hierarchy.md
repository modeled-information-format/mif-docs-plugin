---
id: adr-0005-provenance-consent
type: semantic
created: '2026-07-11T12:00:00Z'
modified: '2026-07-11T12:00:00Z'
namespace: adr/mif-docs
title: 'ADR-0005: Provenance Consent Rides the Settings Hierarchy, and Refusal Wins'
summary: The mif-provenance helper's consent surface is one namespaced key (mifProvenance) in Claude Code's own settings hierarchy, with the plugin-local settings file pattern as the documented fallback carrier; precedence orders only non-refusal values, an explicit disable at any scope defeats enablement at every other scope, and configuration errors fail closed to disabled.
tags:
  - adr
  - provenance
  - consent
  - configuration
aliases:
  - ADR-0005
temporal:
  '@type': TemporalMetadata
  validFrom: '2026-07-11T00:00:00Z'
  recordedAt: '2026-07-11T12:00:00Z'
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
    - '@id': https://github.com/modeled-information-format/mif-docs-plugin
      '@type': prov:Entity
relationships:
  - type: relates-to
    target: urn:mif:adr-0004-node-engine-authoritative
  - type: relates-to
    target: urn:mif:reference-skill-mif-provenance
  - type: relates-to
    target: urn:mif:reference-provenance-ledger
citations:
  - '@type': Citation
    citationType: documentation
    citationRole: methodology
    title: Claude Code settings — the file hierarchy and precedence this key rides
    url: https://docs.anthropic.com/en/docs/claude-code/settings
    accessed: '2026-07-11'
  - '@type': Citation
    citationType: documentation
    citationRole: background
    title: Claude Code hooks reference — the capture surface the consent gate guards
    url: https://docs.anthropic.com/en/docs/claude-code/hooks
    accessed: '2026-07-11'
  - '@type': Citation
    citationType: repository
    citationRole: source
    title: 'mif-docs-plugin#63 — the mif-provenance Epic this decision anchors'
    url: https://github.com/modeled-information-format/mif-docs-plugin/issues/63
ontology:
  '@type': OntologyReference
  id: mif-docs
  version: 1.0.0
  uri: https://mif-spec.dev/ontologies/mif-docs
entity:
  name: Provenance Consent in the Settings Hierarchy with Refusal-Wins
  entity_type: decision-record
extensions:
  x-adr-status: accepted
  x-adr-category: architecture
  x-decision-drivers:
    - consent-before-observation
    - fail-closed-misconfiguration
    - no-novel-config-surface
---

# ADR-0005: Provenance Consent Rides the Settings Hierarchy, and Refusal Wins

## Status

Accepted

## Context

### Background and Problem Statement

The mif-provenance helper observes sessions: hooks record which files a
session touches so provenance can be **witnessed** instead of asserted
(mif-docs-plugin#63). Observation demands a consent surface, and that surface
had two open questions: **where the configuration lives** (a plugin-invented
file? environment variables? Claude Code's settings?) and **how conflicting
scopes resolve** (a project that wants capture on versus a person who wants
it off, and the reverse).

### Current Limitations

1. The plugin previously had no configuration surface at all — hooks were
   either shipped-on or absent, with no per-user or per-project say.
2. Claude Code's settings precedence is designed for *preferences*, where the
   most specific scope wins. Applied naively to consent, a project-local file
   could re-enable observation a person had explicitly refused — precedence
   semantics are the wrong shape for refusal.
3. A malformed settings file resolves to "no value" in most config systems,
   which under a default-on design (or a carelessly merged default) could
   enable observation nobody agreed to.

## Decision Drivers

### Primary Decision Drivers

1. **Consent before observation**: nothing may be captured or stamped without
   an explicit, inspectable opt-in; refusal must be absolute from any scope.
2. **Fail-closed misconfiguration**: a configuration error must only ever
   produce *less* observation, never more.
3. **No novel config surface**: users should express consent where they
   already express Claude Code configuration, inspectable with the tools they
   already have.

### Secondary Decision Drivers

1. **Determinism**: identical file contents must resolve to an identical
   effective config (the suite's mif-validate precedent, applied to config).
2. **Auditability**: one grep-able key name across all scopes.

## Considered Options

### Option 1: One namespaced key in Claude Code's settings hierarchy, with a refusal-wins carve-out

**Description**: A single `mifProvenance` key (`capture`: bool, `stamp`:
`auto`/`ask`/`off`, both defaulting to off) read from the user scope
(`settings.json` and `settings.local.json` under `$CLAUDE_CONFIG_DIR`,
defaulting to `~/.claude/`) and the project scope (`.claude/settings.json`
and `.claude/settings.local.json`), following Claude Code's own precedence
for non-refusal values only. The carve-out: an explicit `capture: false` or
`stamp: "off"` at ANY scope defeats enablement at every other scope. Any
parse error or wrong-shaped value resolves the affected scope to explicit
refusal. The plugin-local settings file pattern
(`.claude/mif-docs.local.md`-style carriers) is the documented fallback for
hosts where the settings hierarchy is unavailable.

**Advantages**:

- Consent lives where users already look; no new file format, no env-var
  side channel.
- Refusal semantics match consent's real shape: revocation from anywhere,
  no scope that can overrule a "no".
- Fail-closed by construction — an unreadable consent surface disables the
  whole feature rather than riding over it.

**Disadvantages**:

- Diverges from vanilla settings-precedence intuition (a project-local
  enable does NOT beat a user disable); must be documented plainly.
- Four file reads on every hook invocation (measured: well under the 50 ms
  disabled-path budget).

**Risk Assessment**:

- **Technical Risk**: Low. A ~100-line dependency-free resolver with the
  carve-out pinned by unit tests in both directions.
- **Ecosystem Risk**: Low. The key is namespaced; collisions with Claude
  Code's own settings vocabulary are structurally avoided.

### Option 2: Plugin-owned config file (e.g. `.mif-provenance.json`)

**Description**: A dedicated file at the repository root, owned and parsed
solely by this plugin.

**Advantages**:

- Full control of semantics; no interaction with host precedence rules.

**Disadvantages**:

- A novel surface users must discover; consent hidden from the place they
  configure everything else.
- No natural user-scope story (a personal "never observe me" would need a
  second invented file in `$HOME`).
- Encourages committing the file, making one contributor's consent look like
  everyone's.

**Disqualifying Factor**: fails the no-novel-surface driver and has no clean
per-user refusal, the exact case consent exists for.

**Risk Assessment**:

- **Technical Risk**: Low mechanically, but the consent-model gap is a
  design defect, not an implementation one.
- **Ecosystem Risk**: Medium. Two config surfaces for one plugin family.

### Option 3: Environment variables

**Description**: `MIF_PROVENANCE_CAPTURE=1`-style toggles read by each hook.

**Advantages**:

- Trivial to implement; naturally per-invocation.

**Disadvantages**:

- Invisible and unauditable: nothing on disk records what was consented to,
  and a stray export in a shell profile becomes silent standing consent.
- No scope model at all — no way to express "this project yes, this user
  no", let alone refusal-wins between them.

**Disqualifying Factor**: unauditable standing consent contradicts the
consent-before-observation driver.

**Risk Assessment**:

- **Technical Risk**: Low to build, high to operate — the misconfiguration
  surface is every shell profile on the machine.

## Decision

We adopt Option 1. Consent rides Claude Code's own settings hierarchy under
one namespaced `mifProvenance` key; **precedence orders only non-refusal
values**, and an explicit disable at any scope is absolute. Configuration
errors fail closed: a malformed or unreadable settings file, or a
wrong-shaped value, contributes an explicit refusal for its scope — the whole
feature disables rather than riding over a consent surface it cannot read.
The resolver (`scripts/lib/provenance-config.mjs`) is the single reader; no
hook or verb consults the settings files directly.

## Consequences

### Positive

1. **Refusal is absolute and auditable**: one grep for `mifProvenance` shows
   every scope's word, and any "no" anywhere is the final answer.
2. **Misconfiguration only ever de-escalates**: every malformed-input path
   resolves toward off, pinned by tests in both carve-out directions.

### Negative

1. **Surprising precedence for enables**: users accustomed to "most specific
   wins" must learn that refusal is scope-less; mitigated by stating it in
   the SKILL.md, the reference page, and this ADR.
2. **A corrupt but irrelevant settings file disables the feature entirely**
   (strictest reading of fail-closed); accepted — silent partial consent is
   the worse failure.

### Neutral

1. Hosts without the settings hierarchy fall back to the documented
   plugin-local settings file pattern; the resolver's semantics are carrier
   independent.

## Decision Outcome

The decision achieves its objective — observation strictly gated on
inspectable, revocable consent — measured by: the resolver's unit tests
pinning both refusal directions and the malformed-input postures; the capture
hooks' disabled path writing nothing and emitting nothing; and no code path
outside the resolver reading the `mifProvenance` key.

## Related Decisions

- [ADR-0004: Node Engine Stays Authoritative, Convergence Proven by a Parity
  Gate][adr-0004] — the same no-model-in-the-path determinism discipline this
  decision applies to configuration resolution.

## Links

- [The session ledger: format contract][ledger] — the artifact capture
  produces once consent is given.
- [Skill reference: mif-provenance][skill-ref] — the consumer-facing
  statement of the consent model and trust ceiling.

## More Information

- **Date:** 2026-07-11
- **Source:** the mif-provenance Epic (mif-docs-plugin#63, Story #64)
- **Related ADRs:** ADR-0004

## Audit

### 2026-07-11

**Status:** Compliant

**Findings:**

| Finding                                               | Files | Lines | Assessment |
| ----------------------------------------------------- | ----- | ----- | ---------- |
| Resolver + refusal-wins carve-out + fail-closed tests | -     | -     | accepted   |

**Summary:** Decision accepted with the resolver, both carve-out directions
and all malformed-input postures pinned by unit tests, and the capture hooks
consulting the resolver before any observation I/O.

**Action Required:** Re-audit if Claude Code's settings hierarchy gains new
scopes (an enterprise layer would need an explicit place in the refusal
ordering — which, per this decision, is "refusal wins from there too").

[adr-0004]: 0004-node-engine-authoritative-with-parity-gate.md
[ledger]: ../reference/provenance-ledger.md
[skill-ref]: ../reference/skills/mif-provenance.md
