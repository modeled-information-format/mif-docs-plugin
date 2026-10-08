---
id: 330a2497-7ec2-5a56-89a0-30bba657443c
type: semantic
created: '2026-07-01T00:00:00Z'
modified: '2026-07-01T00:00:00Z'
namespace: reference/skills
title: 'Skill reference: nist-sp'
tags:
  - reference
  - mif-docs
  - skill
  - nist-sp
  - standards
temporal:
  '@type': TemporalMetadata
  validFrom: '2026-07-01T00:00:00Z'
  recordedAt: '2026-07-01T00:00:00Z'
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
    - '@id': urn:mif:skill:nist-sp
      '@type': prov:Entity
citations:
  - '@type': Citation
    citationType: specification
    citationRole: source
    title: Security and Privacy Controls for Information Systems and Organizations (NIST SP 800-53 Rev. 5)
    url: https://doi.org/10.6028/NIST.SP.800-53r5
    accessed: '2026-07-01'
  - '@type': Citation
    citationType: tool
    citationRole: source
    title: 'mif-docs — nist-sp skill (SKILL.md)'
    url: https://github.com/modeled-information-format/mif-docs-plugin/tree/main/skills/nist-sp
relationships:
  - type: relates-to
    target: urn:mif:d8972202-0b4d-52ea-89d7-90abe228e820
  - type: relates-to
    target: urn:mif:d60dba7d-ef07-5ed0-a013-1b0b5e9b1ace
ontology:
  '@type': OntologyReference
  id: mif-docs
  version: 1.0.0
  uri: https://mif-spec.dev/ontologies/mif-docs
entity:
  name: 'Skill reference: nist-sp'
  entity_type: reference-document
extensions:
  x-skill: nist-sp
  x-genre-conceptType: semantic
  x-target-level: 3
  x-purpose-group: regulated-and-compliance-reports
---

# Skill reference: `nist-sp`

The `nist-sp` skill authors one document genre: a **NIST Special Publication
(SP 800-series style) standards/guidance document** — an authoritative,
standards-track deliverable that states normative requirements, defines terms
of art, and maps to external control frameworks. This reference describes what
that document type is, how the skill produces one, when it earns its place,
and the provenance behind it.

| Property | Value |
| --- | --- |
| Authors | A NIST Special Publication (SP 800-series style) standards/guidance document |
| Purpose group | Regulated & compliance reports |
| MIF `conceptType` | `semantic` |
| Target MIF level | 3 |
| Primary source | [NIST SP 800-53 Rev. 5](https://doi.org/10.6028/NIST.SP.800-53r5) |

## What this document type is

A NIST SP is issued under NIST's statutory mandate as standing standards or
guidance, not a one-time engagement report. Its defining trait is the
**numbered normative section**: every requirement is stated with explicit
normative force — shall / should / may — and traces to a cited finding. The
document opens with a fixed front-matter sequence (Authority, Purpose &
Scope, Audience, Abstract, Keywords), moves through numbered normative body
sections up to four heading levels deep, and closes with a required
Definitions/Glossary, a numbered References list, and lettered appendices
carrying control-mapping crosswalks. Its center of gravity is normative
precision at an `authoritative` altitude: uncertainty is recorded as an
explicit verdict annotation on a finding, never as hedged phrasing inside a
requirement.

This is distinct from a one-time client or internal engagement deliverable
that applies a standard rather than issuing one (a `security-pentest` or
`compliance-audit` report), from a single immutable decision with its drivers
(an [adr](../adr/)), and from an internal system architecture description
with no standards-track authority (an [arc42-arch-doc](../arc42-arch-doc/) or
an ai-architecture-doc).

## How the skill produces one

`nist-sp` is a genre skill: it carries the SP 800-series pattern as durable
instructions plus exemplars, and writes the artifact over a MIF floor so the
result is at once a human-readable standard and a machine-conformant unit.

- **Pattern, made operational.** The skill encodes the fixed front-matter
  order, the numbered normative body with explicit shall/should/may force, the
  required Definitions/Glossary, the numbered `[N]` bracketed reference style,
  and the lettered appendices carrying control-mapping crosswalks. It builds
  the publication from the full surviving findings corpus — no cherry-picked
  subset — and excludes only falsified findings from normative guidance.
- **Exemplars set the bar.** Like every genre in the suite it ships
  `good-l1.md` (the MIF Level-1 floor), `good.md` (the Level-3 target),
  `bad.md` (a counter-example whose normative sections hedge in narrative
  prose with no cited evidence), and `evals/evals.json`. The
  `check-exemplars` gate proves `good-l1.md` validates at L1 and `good.md` at
  Level 3.
- **MIF projection.** The document is authored with MIF frontmatter (via the
  shared `mif-frontmatter` substrate) and a `conceptType` of `semantic`,
  reflecting that a NIST SP is declarative normative knowledge, not a
  time-bound event or a step sequence. `mif-validate` proves the Markdown ↔
  JSON-LD round-trip is lossless before the document is considered done.

## When it is beneficial

Reach for `nist-sp` when the deliverable is **standing standards or guidance
issued under NIST's mandate** — a publication that standards authors, control
owners, security/privacy program leads, auditors, and implementers will apply
as binding guidance, not read as narrative. It earns its place whenever
requirements must trace to cited evidence and map to an external control
framework such as SP 800-53, and every normative claim must survive without
hedging.

Do **not** use it for a one-time client engagement report that applies a
standard rather than issuing one — that is `security-pentest` (a
penetration-test engagement report) or `compliance-audit` (an audit-of-record
engagement report): each performs and reports against a standard's controls,
neither states normative requirements or carries the standing of an issuing
authority. Do not use it for a single immutable decision with its drivers —
that is an [adr](../adr/). Do not use it for an internal system architecture
description with no standards-track authority — use
[arc42-arch-doc](../arc42-arch-doc/) or an ai-architecture-doc instead. When
the report evaluates concrete options against decision drivers in a
comparison table rather than issuing normative guidance, use
[engineering](../engineering/).

## Example

A publication titled *"Guidelines for Secure Configuration of Container
Orchestration Platforms"* opens with the Authority statement, scopes itself to
runtime hardening, orchestrator access control, and network segmentation for
federal container platforms, and names cloud platform engineers, ISSOs/ISSMs,
and auditors as its Audience. Its three numbered normative sections state
requirements such as running workloads under a non-root identity and enforcing
role-based access control at the orchestrator API server, each cited to NIST
SP 800-190 or SP 800-207. A required Definitions/Glossary defines terms like
*Namespace* and *Zero Trust Architecture*, a numbered References list resolves
the `[1]`–`[3]` citations, and Appendix A crosswalks every requirement to its
SP 800-53 Revision 5 control family (e.g. AC-6/CM-7 for root privilege
restriction).

## Provenance & citations

- **Genre source — NIST SP 800-series convention:** the front-matter
  authority statement, numbered normative sections, definitions, references,
  and appendix structure NIST uses for its Special Publications, exemplified
  by [SP 800-53 Rev. 5](https://doi.org/10.6028/NIST.SP.800-53r5).
- **Skill provenance:** authored by the `nist-sp` skill in the mif-docs
  plugin, <https://github.com/modeled-information-format/mif-docs-plugin>; the
  skill's exemplars and `evals/` define and verify the pattern.
- **MIF conformance:** the document projects to canonical JSON-LD under the MIF
  specification, <https://mif-spec.dev>, and is proven lossless by `mif-validate`.
- **Index:** this skill is one entry in the [skills by purpose](../../skills-by-purpose/)
  catalog; its regulated & compliance-reports sibling is
  [engineering](../engineering/).
