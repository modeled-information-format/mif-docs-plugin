---
id: b2a4b6e0-0db5-5b9c-9b06-bb14ddcec8eb
type: semantic
created: '2026-07-01T00:00:00Z'
modified: '2026-07-01T00:00:00Z'
namespace: reference/skills
title: 'Skill reference: compliance-audit'
tags:
  - reference
  - mif-docs
  - skill
  - compliance-audit
  - controls-report
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
    - '@id': urn:mif:skill:compliance-audit
      '@type': prov:Entity
citations:
  - '@type': Citation
    citationType: specification
    citationRole: methodology
    title: 2017 Trust Services Criteria (With Revised Points of Focus – 2022)
    url: https://www.aicpa-cima.com/resources/download/2017-trust-services-criteria-with-revised-points-of-focus-2022
    accessed: '2026-07-01'
  - '@type': Citation
    citationType: specification
    citationRole: methodology
    title: AICPA Statement on Standards for Attestation Engagements No. 18
    url: https://www.aicpa-cima.com/resources/download/aicpa-statement-on-standards-for-attestation-engagements-no-18
    accessed: '2026-07-01'
  - '@type': Citation
    citationType: tool
    citationRole: source
    title: 'mif-docs — compliance-audit skill (SKILL.md)'
    url: https://github.com/modeled-information-format/mif-docs-plugin/tree/main/skills/compliance-audit
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
  name: 'Skill reference: compliance-audit'
  entity_type: reference-document
extensions:
  x-skill: compliance-audit
  x-genre-conceptType: semantic
  x-target-level: 3
  x-purpose-group: regulated-and-compliance-reports
---

# Skill reference: `compliance-audit`

The `compliance-audit` skill authors one document genre: a **compliance audit
report** shaped like a SOC 2 Type II controls report — auditor's-report
framing, management's assertion, system description, in-scope criteria, a
mandatory tests-of-controls/findings matrix with severity, control gaps, a
remediation plan, and management's response. This reference describes what
that document type is, how the skill produces one, when it earns its place,
and the provenance behind it.

| Property | Value |
| --- | --- |
| Authors | A SOC 2 Type II-shaped compliance audit report draft |
| Purpose group | Regulated & compliance reports |
| MIF `conceptType` | `semantic` |
| Target MIF level | 3 |
| Primary source | AICPA Trust Services Criteria / SSAE 18 (structure only — no attestation) |

## What this document type is

A compliance audit report models the structure of a SOC 2 Type II controls
report: an Independent Service Auditor's Report framing section, Management's
Assertion, a System Description across infrastructure, software, people,
data, and processes, the Trust Services Criteria in scope, and — its center
of gravity — a **tests-of-controls / findings matrix** that traces every
control to a test performed and a result or exception rated by severity. A
Remediation Plan and a Management's Response close the report. Its defining
trait is that the report is not conformant without the findings matrix
rendered as a Markdown table; every control, test, finding, and remediation
item must trace to a cited finding.

The report's single load-bearing constraint is that **it is a draft
structure, never an attestation**: a genuine SOC 2 report is an attestation
engagement performed by a licensed CPA firm under AICPA attestation standards
(SSAE 18), and this genre must never state, imply, or be presented as an
issued opinion, assurance, or certification.

## How the skill produces one

`compliance-audit` is a genre skill: it carries the SOC 2 Type II-shaped
pattern as durable instructions plus exemplars, and writes the artifact over
a MIF floor so the result is at once a human-readable controls report and a
machine-conformant unit.

- **Pattern, made operational.** The skill encodes the seven-section shape —
  auditor's-report framing, management's assertion, system description,
  criteria in scope, the mandatory tests-of-controls/findings matrix, a
  remediation plan, and management's response — and enforces the no-
  attestation caveat as the report's highest-severity constraint.
- **Exemplars set the bar.** Like every genre in the suite it ships
  `good-l1.md` (the MIF Level-1 floor), `good.md` (the Level-3 target),
  `bad.md` (a counter-example report that states control results with no
  findings matrix to support them), and `evals/evals.json`. The
  `check-exemplars` gate proves `good-l1.md` validates at L1 and `good.md` at
  Level 3.
- **MIF projection.** The document is authored with MIF frontmatter (via the
  shared `mif-frontmatter` substrate) and a `conceptType` of `semantic`,
  reflecting that a bounded-period controls assessment is declarative
  controls-and-evidence knowledge rather than a step sequence. `mif-validate`
  proves the Markdown ↔ JSON-LD round-trip is lossless before the document is
  considered done.

## When it is beneficial

Reach for `compliance-audit` when a service organization needs to **draft and
model its controls narrative and self-assess** ahead of, or independent of, a
formal audit — the tests-of-controls/findings matrix is the artifact's reason
to exist, and every control gap it surfaces gets an owner and a target date
in the Remediation Plan.

Do **not** use it for a penetration test's technical vulnerability findings —
those are scored by exploitability and CVSS, not mapped to a controls-vs-
criteria matrix. Do not use it for a single already-made, immutable decision
with no controls matrix to show — that is an [adr](../adr/): driver-and-
outcome, no mandatory tests-of-controls table. Do not use it for an
operational step-by-step procedure — that is an [sre-runbook](../sre-runbook/):
tactical incident response, not a periodic controls assessment against a
named framework. When the comparison you need is options against decision
drivers rather than controls against test results, [engineering](../engineering/)
is the closer fit.

## Example

A compliance audit report titled *"Compliance Audit Report: Nimbus Ledger —
Security and Availability Controls (2026 H1)"* opens with a DRAFT-only
Independent Service Auditor's Report section stating plainly that no opinion
is expressed and no CPA firm performed an examination, followed by
Management's Assertion and a System Description across the five components.
Trust Services Criteria scope Security and Availability, excluding Processing
Integrity, Confidentiality, and Privacy. The Tests of Controls & Findings
table covers four controls — MFA on admin access, peer-reviewed CI-gated
deploys, tested encrypted backups, and quarterly access reviews — with the
last flagged as a Medium-severity exception (the Q1 review ran 17 days past
SLA). The Remediation Plan assigns that gap a calendar-reminder-and-escalation
fix owned by the Security & Compliance lead with an August 2026 target date,
and Management's Response records concurrence and notes the Q2 review already
came in within SLA.

## Provenance & citations

- **Genre source — AICPA Trust Services Criteria / SSAE 18:** the SOC 2
  Type II report shape this genre reproduces structurally, without issuing
  any attestation — [2017 Trust Services Criteria (With Revised Points of
  Focus – 2022)](https://www.aicpa-cima.com/resources/download/2017-trust-services-criteria-with-revised-points-of-focus-2022)
  and [SSAE No. 18](https://www.aicpa-cima.com/resources/download/aicpa-statement-on-standards-for-attestation-engagements-no-18).
- **Skill provenance:** authored by the `compliance-audit` skill in the
  mif-docs plugin, <https://github.com/modeled-information-format/mif-docs-plugin>;
  the skill's exemplars and `evals/` define and verify the pattern.
- **MIF conformance:** the document projects to canonical JSON-LD under the
  MIF specification, <https://mif-spec.dev>, and is proven lossless by
  `mif-validate`.
- **Index:** this skill is one entry in the [skills by purpose](../../skills-by-purpose/)
  catalog; its closest comparison-table sibling among Regulated &
  compliance/decision genres is [engineering](../engineering/).
