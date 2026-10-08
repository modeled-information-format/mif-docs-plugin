---
id: 04f2e11f-67d6-567e-8ddd-871d812c7df5
type: semantic
created: '2026-06-30T12:00:00Z'
modified: '2026-06-30T12:00:00Z'
namespace: reference/skills
title: 'Skill reference: python-pep'
tags:
  - reference
  - mif-docs
  - skill
  - python
  - pep
temporal:
  '@type': TemporalMetadata
  validFrom: '2026-06-30T00:00:00Z'
  recordedAt: '2026-06-30T12:00:00Z'
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
    - '@id': urn:mif:skill:python-pep
      '@type': prov:Entity
citations:
  - '@type': Citation
    citationType: specification
    citationRole: methodology
    title: 'PEP 1 — PEP Purpose and Guidelines'
    url: https://peps.python.org/pep-0001/
    accessed: '2026-06-30'
  - '@type': Citation
    citationType: specification
    citationRole: source
    title: 'PEP 12 — Sample reStructuredText PEP Template'
    url: https://peps.python.org/pep-0012/
    accessed: '2026-06-30'
  - '@type': Citation
    citationType: tool
    citationRole: source
    title: 'mif-docs — python-pep skill (SKILL.md)'
    url: https://github.com/modeled-information-format/mif-docs-plugin/tree/main/skills/python-pep
relationships:
  - type: relates-to
    target: urn:mif:d8972202-0b4d-52ea-89d7-90abe228e820
  - type: relates-to
    target: urn:mif:9308c842-4ad0-522d-b247-ba65030c9eb4
  - type: relates-to
    target: urn:mif:3abcc98b-23f7-5857-b2e3-7598013b89ac
ontology:
  '@type': OntologyReference
  id: mif-docs
  version: 1.0.0
  uri: https://mif-spec.dev/ontologies/mif-docs
entity:
  name: 'Skill reference: python-pep'
  entity_type: reference-document
extensions:
  x-skill: python-pep
  x-genre-conceptType: semantic
  x-target-level: 3
  x-purpose-group: decisions-proposals
---

# Skill reference: `python-pep`

The `python-pep` skill authors one document genre: a **Python Enhancement
Proposal** — the formal design document by which a change to the Python language,
its standard library, or its processes is proposed, debated, and decided. This
reference describes what that document type is, how the skill produces one, when it
earns its place, and the provenance and sources behind it.

| Property | Value |
| --- | --- |
| Authors | A Python Enhancement Proposal (PEP) |
| Purpose group | Decisions & proposals |
| MIF `conceptType` | `semantic` |
| Target MIF level | 3 |
| Primary source | [PEP 1](https://peps.python.org/pep-0001/) |

## What this document type is

A PEP is Python's primary mechanism for proposing a significant new feature,
collecting community input, and documenting the decision and its rationale. The
skill follows the canonical template, which opens with an **RFC822-style header
preamble** (PEP number, title, author, status, type, created date and more) and then
proceeds through **Abstract**, **Motivation**, **Rationale**, **Specification**,
**Backwards Compatibility**, **Security Implications**, **How to Teach This**,
**Reference Implementation**, **Rejected Ideas**, and **Open Issues**. The header is
the genre's signature — it makes a PEP a tracked, addressable record with a defined
status lifecycle — and sections like *How to Teach This* and *Rejected Ideas* force
the author to consider adoption and to record the alternatives weighed and dropped.

A PEP is therefore *not* an [adr](../adr/): a PEP proposes a change to the Python
language or process and is debated openly before acceptance, whereas an ADR records a
project's own already-made architectural decision. Nor is it end-user task
instruction — those belong in a [how-to](../diataxis-how-to/). Its nearest sibling is
the [rust-rfc](../rust-rfc/): both are consensus-before-implementation proposals, but
each carries its own community's house format and header conventions.

## How the skill produces one

`python-pep` is a genre skill: it carries the PEP pattern as durable instructions
plus exemplars, and writes the artifact over a MIF floor so the result is at once a
human-readable proposal and a machine-conformant unit.

- **Pattern, made operational.** The skill encodes the RFC822 header preamble and the
  full section sequence — including the easily-forgotten *Security Implications*,
  *How to Teach This*, and *Rejected Ideas* — and refuses anti-triggered work,
  redirecting a project's own decision to an ADR.
- **Exemplars set the bar.** Like every genre in the suite it ships `good-l1.md`
  (the MIF Level-1 floor), `good.md` (the Level-3 target), `bad.md` (a
  counter-example), and `evals/evals.json`. The `check-exemplars` gate proves
  `good-l1.md` validates at L1 and `good.md` at L3, so the pattern the skill teaches
  is itself continuously verified.
- **MIF projection.** The PEP is authored with MIF frontmatter (via the shared
  `mif-frontmatter` substrate) and a `conceptType` of `semantic`, reflecting that a
  proposal is declarative design knowledge rather than a sequence of steps.
  `mif-validate` proves the Markdown ↔ JSON-LD round-trip is lossless before the
  document is considered done.

## When it is beneficial

Reach for `python-pep` when proposing or drafting a **change to the Python language,
standard library, or process** in the form the Python community expects — a new
syntax, a stdlib addition, a deprecation policy, or a governance change. The format's
discipline ensures the proposal carries everything reviewers need: motivation, exact
specification, compatibility and security analysis, and an honest record of the ideas
already rejected.

Do **not** use it for a decision your own project has already made (record that as an
ADR), or for end-user instructions on using an existing feature (write a how-to). The
cost of a PEP is the rigor it demands — a complete specification plus compatibility,
security, and teaching analysis — which is justified only for changes consequential
enough to warrant community-wide review.

## Example

A PEP titled *"Structural Pattern Matching: Specification"* begins with its header
preamble (number, status `Draft`, type `Standards Track`), an Abstract summarizing
the feature in a paragraph, and a Motivation grounded in real code that the feature
simplifies. The Specification defines the grammar and matching semantics precisely;
Backwards Compatibility and Security Implications assess the blast radius; How to
Teach This sketches the learning path; and Rejected Ideas records the alternative
syntaxes considered and why each was set aside.

## Provenance & citations

- **Genre source — PEPs:** the purpose and process defined in PEP 1,
  <https://peps.python.org/pep-0001/>, with the section structure given by the sample
  template, PEP 12, <https://peps.python.org/pep-0012/>.
- **Skill provenance:** authored by the `python-pep` skill in the mif-docs plugin,
  <https://github.com/modeled-information-format/mif-docs-plugin>; the skill's
  exemplars and `evals/` define and verify the pattern.
- **MIF conformance:** the document projects to canonical JSON-LD under the MIF
  specification, <https://mif-spec.dev>, and is proven lossless by `mif-validate`.
- **Index:** this skill is one entry in the [skills by purpose](../../skills-by-purpose/)
  catalog; its sibling decisions-and-proposals genres are [adr](../adr/) and
  [rust-rfc](../rust-rfc/).
