---
id: 01166cf9-b44c-59fb-9d93-f575400dc51b
type: semantic
created: '2026-07-01T00:00:00Z'
modified: '2026-07-01T00:00:00Z'
namespace: reference/skills
title: 'Skill reference: clinical-submission'
tags:
  - reference
  - mif-docs
  - skill
  - clinical-submission
  - regulatory
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
    - '@id': urn:mif:skill:clinical-submission
      '@type': prov:Entity
citations:
  - '@type': Citation
    citationType: documentation
    citationRole: methodology
    title: 'ICH E3: Structure and Content of Clinical Study Reports'
    url: https://database.ich.org/sites/default/files/E3_Guideline.pdf
    accessed: '2026-07-01'
  - '@type': Citation
    citationType: tool
    citationRole: source
    title: 'mif-docs — clinical-submission skill (SKILL.md)'
    url: https://github.com/modeled-information-format/mif-docs-plugin/tree/main/skills/clinical-submission
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
  name: 'Skill reference: clinical-submission'
  entity_type: reference-document
extensions:
  x-skill: clinical-submission
  x-genre-conceptType: semantic
  x-target-level: 3
  x-purpose-group: regulated-and-compliance-reports
---

# Skill reference: `clinical-submission`

The `clinical-submission` skill authors one document genre: a **clinical study
report (CSR)** on the **ICH E3** skeleton — Synopsis through Tables/Figures/
Appendices, in fixed section order — situated in the CTD (Common Technical
Document) five-module frame. This reference describes what that document type
is, how the skill produces one, when it earns its place, and the provenance
behind it.

| Property | Value |
| --- | --- |
| Authors | A clinical study report (CSR) on the ICH E3 skeleton |
| Purpose group | Regulated and compliance reports |
| MIF `conceptType` | `semantic` |
| Target MIF level | 3 |
| Primary source | [ICH E3: Structure and Content of Clinical Study Reports](https://database.ich.org/sites/default/files/E3_Guideline.pdf) |

## What this document type is

A clinical study report reproduces the **ICH E3** structure used across
regulated submissions: Synopsis, Ethics, Investigators & Study Structure,
Objectives, Investigational Plan, Methods (Efficacy & Safety), Results,
Discussion & Conclusions, and Tables/Figures/Appendices, in that fixed order.
Its defining trait is keeping **efficacy and safety distinct throughout** —
in Methods, in Results, and in the Discussion's benefit-risk weighing — with
every claim resolving to a cited finding. The report is also situated in the
five-module CTD frame (M1 regional administrative, M2 summaries, M3 quality,
M4 nonclinical study reports, M5 clinical study reports), stating that an E3
CSR lives in Module 5. The genre reproduces structure only: it never asserts
clinical validity, statistical adequacy, or regulatory acceptance, and the
electronic packaging of a submission (eCTD v4.0) is out of scope.

This is declarative study-and-results knowledge, not a time-bound event or a
step sequence, so it projects to MIF as `semantic` content at Level 3.

## How the skill produces one

`clinical-submission` is a genre skill: it carries the ICH E3 / CTD pattern as
durable instructions plus exemplars, and writes the artifact over a MIF floor
so the result is at once a human-readable report and a machine-conformant
unit.

- **Pattern, made operational.** The skill encodes the nine-section ICH E3
  skeleton in fixed order, the CTD module framing, and the efficacy/safety
  separation as a rule the report must not violate — a CSR that reorders or
  omits a required section, or merges efficacy and safety into one
  undifferentiated narrative, is not conformant.
- **Exemplars set the bar.** Like every genre in the suite it ships
  `good-l1.md` (the MIF Level-1 floor), `good.md` (the Level-3 target),
  `bad.md` (a counter-example that collapses efficacy and safety together),
  and `evals/evals.json`. The `check-exemplars` gate proves `good-l1.md`
  validates at L1 and `good.md` at Level 3.
- **MIF projection.** The document is authored with MIF frontmatter (via the
  shared `mif-frontmatter` substrate) and a `conceptType` of `semantic`.
  `mif-validate` proves the Markdown ↔ JSON-LD round-trip is lossless before
  the document is considered done.

## When it is beneficial

Reach for `clinical-submission` when the deliverable must **reproduce the
clinical-study-report structure of a regulatory submission** — a fixed
section order, efficacy and safety kept distinct, and every result traceable
to a cited source. It suits work that must read as a CSR sitting in CTD
Module 5, with limitations and benefit-risk stated honestly rather than
glossed over.

Do **not** use it for a scientific journal article reporting the same trial
for peer review — that follows discipline-citation-style academic
conventions, not the fixed ICH E3 skeleton or CTD module frame. Do not use it
for a financial or legal disclosure filing — that is a filings genre driven
by securities or contract-law disclosure obligations, not a clinical-trial
write-up. Do not use it for the electronic packaging of a submission (eCTD
v4.0) — that is a serialization/transport concern, not this document genre.
If the mandatory artifact is instead a comparison of concrete options against
decision drivers, use [engineering](../engineering/) instead.

## Example

A CSR titled *"CARDIA-3 — A Phase III Trial of Cortivex in Essential
Hypertension"* opens with a Synopsis describing a randomized, double-blind,
placebo-controlled Phase III trial of once-daily oral Cortivex 20 mg across
42 sites, states its primary objective (superiority in mean seated systolic
blood pressure reduction at Week 12 versus placebo), and carries that
objective through Investigational Plan, Methods, and Results with efficacy
(a 9.4 mmHg between-arm reduction, 95% CI 7.1 to 11.7) and safety (mild
dizziness the most common adverse event, comparable serious-adverse-event
rates) analyzed and reported separately. Discussion & Conclusions weighs the
benefit-risk profile against the trial's limitation to a specific baseline
blood-pressure band, and Tables, Figures & Appendices renders the SeSBP
trend as a Mermaid `xychart-beta` and the adverse-event summary as a Markdown
table, citing ICH E3 and ICH E9 throughout.

## Provenance & citations

- **Genre source — ICH E3:** the ICH Harmonised Guideline governing the
  structure and content of clinical study reports,
  <https://database.ich.org/sites/default/files/E3_Guideline.pdf>.
- **Skill provenance:** authored by the `clinical-submission` skill in the
  mif-docs plugin,
  <https://github.com/modeled-information-format/mif-docs-plugin>; the
  skill's exemplars and `evals/` define and verify the pattern.
- **MIF conformance:** the document projects to canonical JSON-LD under the
  MIF specification, <https://mif-spec.dev>, and is proven lossless by
  `mif-validate`.
- **Index:** this skill is one entry in the
  [skills by purpose](../../skills-by-purpose/) catalog, in the Regulated and
  compliance reports group.
