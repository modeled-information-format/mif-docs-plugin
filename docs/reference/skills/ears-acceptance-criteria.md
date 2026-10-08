---
id: 6a9f7095-2d06-51d9-90be-0be973fe887e
type: semantic
created: '2026-06-30T12:00:00Z'
modified: '2026-06-30T12:00:00Z'
namespace: reference/skills
title: 'Skill reference: ears-acceptance-criteria'
tags:
  - reference
  - mif-docs
  - skill
  - ears
  - acceptance-criteria
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
    - '@id': urn:mif:skill:ears-acceptance-criteria
      '@type': prov:Entity
citations:
  - '@type': Citation
    citationType: specification
    citationRole: methodology
    title: EARS — the Easy Approach to Requirements Syntax (Alistair Mavin)
    url: https://alistairmavin.com/ears/
    accessed: '2026-06-30'
  - '@type': Citation
    citationType: paper
    citationRole: background
    title: 'Mavin et al., Easy Approach to Requirements Syntax (EARS), RE2009, IEEE pp.317-322'
    url: https://research.manchester.ac.uk/en/publications/easy-approach-to-requirements-syntax-ears/
    accessed: '2026-06-30'
  - '@type': Citation
    citationType: tool
    citationRole: source
    title: 'mif-docs — ears-acceptance-criteria skill (SKILL.md)'
    url: https://github.com/modeled-information-format/mif-docs-plugin/tree/main/skills/ears-acceptance-criteria
relationships:
  - type: relates-to
    target: urn:mif:d8972202-0b4d-52ea-89d7-90abe228e820
  - type: relates-to
    target: urn:mif:776e28a8-7fd8-5a5d-b477-efde9b5358cc
  - type: relates-to
    target: urn:mif:e9c994fc-55a7-56a4-b8b4-9273afbbbc6a
  - type: relates-to
    target: urn:mif:f8d4c638-fac3-5c75-b314-c7a5f047a81d
ontology:
  '@type': OntologyReference
  id: mif-docs
  version: 1.0.0
  uri: https://mif-spec.dev/ontologies/mif-docs
entity:
  name: 'Skill reference: ears-acceptance-criteria'
  entity_type: reference-document
extensions:
  x-skill: ears-acceptance-criteria
  x-genre-conceptType: substrate
  x-target-level: 2
  x-purpose-group: authoring-helpers
---

# Skill reference: `ears-acceptance-criteria`

The `ears-acceptance-criteria` skill is a **substrate helper**: it turns a
requirement, decision driver, or finding into an acceptance criterion written in
EARS notation — the Easy Approach to Requirements Syntax — so a human and an
agent grade it identically. This reference describes the notation, how the skill
produces it, when it earns its place, and its sources.

| Property | Value |
| --- | --- |
| Authors | EARS-notation acceptance criteria |
| Purpose group | Authoring helpers |
| MIF `conceptType` | `substrate` |
| Target MIF level | 2 |
| Primary source | [EARS (Alistair Mavin)](https://alistairmavin.com/ears/) |

## What this document type is

EARS is a constrained natural-language pattern for requirements, introduced by
Alistair Mavin and colleagues at Rolls-Royce and presented at RE2009. Its premise
is that unconstrained prose requirements are ambiguous, while fully formal
notations are unreadable; EARS sits between them, using a small set of keyword
templates that keep a criterion in plain English yet make its trigger, condition,
and required response unambiguous. A criterion written this way is **testable by
construction**: the same sentence yields the same pass/fail verdict whether a
person or a coding agent evaluates it.

EARS defines five patterns, distinguished by their leading clause.

| Pattern | Shape | Use |
| --- | --- | --- |
| Ubiquitous | The `<system>` shall `<response>` | An always-true invariant |
| Event-driven | WHEN `<trigger>` the `<system>` shall `<response>` | A discrete event |
| State-driven | WHILE `<state>` the `<system>` shall `<response>` | A sustained condition |
| Unwanted behaviour | IF `<condition>` THEN the `<system>` shall `<response>` | Error/edge handling |
| Optional feature | WHERE `<feature>` the `<system>` shall `<response>` | A feature-gated case |

A criterion that does not reduce to one of these shapes — that bundles several
responses, or whose trigger is vague — is not a valid EARS statement, and the
skill's job is to refuse it and rewrite it.

## How the skill produces one

`ears-acceptance-criteria` carries the five patterns as durable instructions plus
eval cases and emits criteria other genres embed.

- **Pattern selection.** The skill classifies each requirement by its trigger —
  invariant, event, state, unwanted condition, or feature gate — and casts it in
  the matching template, splitting compound requirements into one criterion each.
- **Eval cases.** The skill ships `evals/evals.json` covering each pattern. As a
  substrate helper it carries no `templates/` exemplars; the `check-exemplars`
  gate applies only to the genre skills.
- **MIF projection.** The criteria are authored over a MIF floor via the shared
  [mif-frontmatter](../mif-frontmatter/) substrate, and
  [mif-validate](../mif-validate/) proves the round-trip is lossless.

## When it is beneficial

Reach for it whenever you are writing acceptance criteria — inside a PRD, a
feature spec, an architecture document's NFRs, an ADR's decision drivers, or a
Kiro requirements document. It is the shared grammar those genres depend on, so
their criteria all grade the same way. The trade-off is discipline: EARS forbids
the loose "the system should be fast" sentence, forcing a measurable response and
an explicit trigger. That friction is the point — it is where ambiguity is caught.

It is not a document genre on its own; do not reach for it to write a whole spec.
The host genre (prd, feature-spec, kiro-requirements, ai-architecture-doc) owns
the document; this helper just shapes the criteria inside it.

## Example

A vague line — "login should handle bad passwords gracefully" — becomes the
unwanted-behaviour criterion *"IF the supplied password is invalid THEN the
authentication service shall reject the attempt and return a 401 within 200 ms."*
The trigger, system, and response are now explicit and a test can assert each.

## Provenance & citations

- **Genre source — EARS:** the canonical pattern set, <https://alistairmavin.com/ears/>,
  with the originating RE2009 paper,
  <https://research.manchester.ac.uk/en/publications/easy-approach-to-requirements-syntax-ears/>.
- **Skill provenance:** authored by the `ears-acceptance-criteria` skill in the
  mif-docs plugin, <https://github.com/modeled-information-format/mif-docs-plugin>.
- **MIF conformance:** projects to canonical JSON-LD under the MIF specification,
  <https://mif-spec.dev>, proven lossless by [mif-validate](../mif-validate/).
- **Index:** one entry in the [skills by purpose](../../skills-by-purpose/)
  catalog; its fellow helpers are [mif-frontmatter](../mif-frontmatter/) and
  [mif-validate](../mif-validate/), orchestrated by
  [doc-set-planner](../doc-set-planner/).
