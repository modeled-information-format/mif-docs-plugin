---
id: 3abcc98b-23f7-5857-b2e3-7598013b89ac
type: semantic
created: '2026-06-30T12:00:00Z'
modified: '2026-06-30T12:00:00Z'
namespace: reference/skills
title: 'Skill reference: rust-rfc'
tags:
  - reference
  - mif-docs
  - skill
  - rust
  - rfc
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
    - '@id': urn:mif:skill:rust-rfc
      '@type': prov:Entity
citations:
  - '@type': Citation
    citationType: specification
    citationRole: methodology
    title: The Rust RFC Book
    url: https://rust-lang.github.io/rfcs/
    accessed: '2026-06-30'
  - '@type': Citation
    citationType: specification
    citationRole: source
    title: 'Rust RFC template (0000-template.md)'
    url: https://github.com/rust-lang/rfcs/blob/master/0000-template.md
    accessed: '2026-06-30'
  - '@type': Citation
    citationType: tool
    citationRole: source
    title: 'mif-docs — rust-rfc skill (SKILL.md)'
    url: https://github.com/modeled-information-format/mif-docs-plugin/tree/main/skills/rust-rfc
relationships:
  - type: relates-to
    target: urn:mif:d8972202-0b4d-52ea-89d7-90abe228e820
  - type: relates-to
    target: urn:mif:9308c842-4ad0-522d-b247-ba65030c9eb4
  - type: relates-to
    target: urn:mif:04f2e11f-67d6-567e-8ddd-871d812c7df5
ontology:
  '@type': OntologyReference
  id: mif-docs
  version: 1.0.0
  uri: https://mif-spec.dev/ontologies/mif-docs
entity:
  name: 'Skill reference: rust-rfc'
  entity_type: reference-document
extensions:
  x-skill: rust-rfc
  x-genre-conceptType: semantic
  x-target-level: 3
  x-purpose-group: decisions-proposals
---

# Skill reference: `rust-rfc`

The `rust-rfc` skill authors one document genre: a **Rust-style RFC** (request for
comments) — a structured design proposal that argues a substantial change and seeks
written consensus *before* implementation begins. This reference describes what that
document type is, how the skill produces one, when it earns its place, and the
provenance and sources behind it.

| Property | Value |
| --- | --- |
| Authors | A Rust-style RFC design proposal |
| Purpose group | Decisions & proposals |
| MIF `conceptType` | `semantic` |
| Target MIF level | 3 |
| Primary source | [The Rust RFC Book](https://rust-lang.github.io/rfcs/) |

## What this document type is

A Rust RFC is the unit of the Rust project's design process: a substantial change
to the language, libraries, or platform is written up, debated in the open, and
either accepted or rejected before any code lands. The skill follows the canonical
template, whose sections are **Summary**, **Motivation**, **Guide-level
explanation** (the change taught as if it already shipped), **Reference-level
explanation** (the precise, interaction-complete specification), **Drawbacks**,
**Rationale and alternatives**, **Prior art**, **Unresolved questions**, and
**Future possibilities**. The two-tier explanation — accessible first, exhaustive
second — is the genre's signature: it forces an author to make the change both
teachable and rigorously specified in the same document.

A Rust RFC is therefore *not* an [adr](../adr/), which records a decision already
made along with the reasoning that produced it; the RFC argues a design that is
still open for debate. It is also not a bug report or a small change — those belong
in a plain issue. Its closest sibling is the [python-pep](../python-pep/), which
plays the same consensus-before-implementation role for a different community with a
different house format.

## How the skill produces one

`rust-rfc` is a genre skill: it carries the RFC pattern as durable instructions plus
exemplars, and writes the artifact over a MIF floor so the result is at once a
human-readable proposal and a machine-conformant unit.

- **Pattern, made operational.** The skill encodes the template's section sequence
  and its discipline — guide-level before reference-level, drawbacks and
  alternatives argued honestly, unresolved questions named rather than hidden — and
  refuses anti-triggered work, redirecting settled decisions to an ADR.
- **Exemplars set the bar.** Like every genre in the suite it ships `good-l1.md`
  (the MIF Level-1 floor), `good.md` (the Level-3 target), `bad.md` (a
  counter-example), and `evals/evals.json`. The `check-exemplars` gate proves
  `good-l1.md` validates at L1 and `good.md` at L3, so the pattern the skill teaches
  is itself continuously verified.
- **MIF projection.** The RFC is authored with MIF frontmatter (via the shared
  `mif-frontmatter` substrate) and a `conceptType` of `semantic`, reflecting that a
  proposal is declarative design knowledge rather than a sequence of steps.
  `mif-validate` proves the Markdown ↔ JSON-LD round-trip is lossless before the
  document is considered done.

## When it is beneficial

Reach for `rust-rfc` when a **substantial** language, library, or platform change
needs design consensus before anyone writes code — a change large enough that
shipping it wrong would be expensive, and one that benefits from the discipline of
arguing motivation, alternatives, and drawbacks in writing. The format's strength is
that it makes the cost of a design visible up front, when changing course is cheap.

Do **not** use it for a decision already taken (record that as an ADR), or for a bug
fix or small, uncontroversial change (a plain issue is faster and lighter). The cost
of an RFC is the deliberation it demands: writing one is a commitment to think the
design all the way through and to defend it, which is wasted effort when the change
is small or the answer is obvious.

## Example

An RFC titled *"Add a `try` block expression to the language"* opens with a
one-paragraph Summary, motivates it with the awkwardness of the current pattern,
then teaches the feature guide-level with examples a user could follow. The
reference-level section specifies the grammar, type-checking, and interaction with
existing control flow exactly; Drawbacks weighs the added surface area; Rationale and
alternatives argues why this shape beats the rejected ones; and Unresolved questions
flags the corners deferred to implementation.

## Provenance & citations

- **Genre source — Rust RFCs:** the process and accepted proposals in
  <https://rust-lang.github.io/rfcs/>, with the section structure defined by the
  canonical template,
  <https://github.com/rust-lang/rfcs/blob/master/0000-template.md>.
- **Skill provenance:** authored by the `rust-rfc` skill in the mif-docs plugin,
  <https://github.com/modeled-information-format/mif-docs-plugin>; the skill's
  exemplars and `evals/` define and verify the pattern.
- **MIF conformance:** the document projects to canonical JSON-LD under the MIF
  specification, <https://mif-spec.dev>, and is proven lossless by `mif-validate`.
- **Index:** this skill is one entry in the [skills by purpose](../../skills-by-purpose/)
  catalog; its sibling decisions-and-proposals genres are [adr](../adr/) and
  [python-pep](../python-pep/).
