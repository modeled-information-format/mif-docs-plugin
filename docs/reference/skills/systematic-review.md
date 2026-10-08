---
id: c334a7e5-dca2-51ce-97bb-9b6b0a216816
type: semantic
created: '2026-07-01T00:00:00Z'
modified: '2026-07-01T00:00:00Z'
namespace: reference/skills
title: 'Skill reference: systematic-review'
tags:
  - reference
  - mif-docs
  - skill
  - systematic-review
  - prisma
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
    - '@id': urn:mif:skill:systematic-review
      '@type': prov:Entity
citations:
  - '@type': Citation
    citationType: article
    citationRole: methodology
    title: 'The PRISMA 2020 statement: an updated guideline for reporting systematic reviews'
    url: https://doi.org/10.1136/bmj.n71
    accessed: '2026-07-01'
  - '@type': Citation
    citationType: tool
    citationRole: source
    title: 'mif-docs — systematic-review skill (SKILL.md)'
    url: https://github.com/modeled-information-format/mif-docs-plugin/tree/main/skills/systematic-review
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
  name: 'Skill reference: systematic-review'
  entity_type: reference-document
extensions:
  x-skill: systematic-review
  x-genre-conceptType: semantic
  x-target-level: 3
  x-purpose-group: scholarly-writing
---

# Skill reference: `systematic-review`

The `systematic-review` skill authors one document genre: a **PRISMA 2020
systematic review** — a reproducible, auditable account of how a body of
evidence was identified, screened, appraised, and synthesised, centered on a
mandatory Mermaid PRISMA flow diagram that reconciles record counts at every
stage. This reference describes what that document type is, how the skill
produces one, when it earns its place, and the provenance behind it.

| Property | Value |
| --- | --- |
| Authors | A PRISMA 2020 systematic review |
| Purpose group | Scholarly writing |
| MIF `conceptType` | `semantic` |
| Target MIF level | 3 |
| Primary source | [The PRISMA 2020 statement](https://doi.org/10.1136/bmj.n71), Page et al., *BMJ* 2021 |

## What this document type is

A systematic review, in the PRISMA 2020 sense, is a structured account of a
review question answered by exhaustively identifying, screening, appraising,
and synthesising the available evidence — not a narrative summary of whatever
studies the author happened to read. Its defining trait is the **PRISMA flow
diagram**: a reconciling count of records identified, screened, excluded (with
reasons), and studies included, without which the report is not conformant.
The review also carries a structured abstract, a reproducible Methods section
(eligibility criteria, information sources, search strategy, selection
process, data items, and a named risk-of-bias tool), a risk-of-bias table
alongside the flow diagram, and an explicit Registration & Protocol statement
even when none exists.

This is distinct from a general scholarly write-up with no mandatory flow
diagram or registered search protocol (an `academic` report), from a single
already-made technical decision (an [adr](../adr/)), and from a
requirements document scoping what to build (a [prd](../prd/) or
[feature-spec](../feature-spec/)). It is reasoned synthesis of existing
evidence, so it projects to MIF as `semantic` content at Level 3.

## How the skill produces one

`systematic-review` is a genre skill: it carries the PRISMA 2020 pattern as
durable instructions plus exemplars, and writes the artifact over a MIF floor
so the result is at once a human-readable review and a machine-conformant
unit.

- **Pattern, made operational.** The skill encodes the structured abstract,
  the reproducible Methods subsections, and treats the Mermaid `flowchart TD`
  PRISMA diagram as mandatory and reconciling — records identified minus
  removals at each stage must equal studies included, or the diagram is a
  defect. It directs authors to verify the current PRISMA guidance live before
  writing, rather than trusting a fixed item count.
- **Exemplars set the bar.** Like every genre in the suite it ships
  `good-l1.md` (the MIF Level-1 floor), `good.md` (the Level-3 target),
  `bad.md` (a counter-example that reports a study count with no flow
  diagram), and `evals/evals.json`. The `check-exemplars` gate proves
  `good-l1.md` validates at L1 and `good.md` at Level 3.
- **MIF projection.** The document is authored with MIF frontmatter (via the
  shared `mif-frontmatter` substrate) and a `conceptType` of `semantic`.
  `mif-validate` proves the Markdown ↔ JSON-LD round-trip is lossless before
  the document is considered done.

## When it is beneficial

Reach for `systematic-review` when the deliverable must make the
evidence-selection process **legible and reproducible end to end** — another
reviewer must be able to repeat the search and selection from the Methods
prose alone, and every included or excluded record must be traceable through
the flow diagram. It earns its place where the review's credibility rests on
its process, not just its conclusions: clinical, policy, or engineering
questions where cherry-picked evidence would be a defect.

Do **not** use it for a general scholarly write-up with no mandatory flow
diagram or registered search protocol — that is `academic`: a formal research
report with a selectable citation style but no PRISMA-mandated flow diagram or
reproducible multi-stage search protocol. Do not use it for a single
already-made technical decision — that is an [adr](../adr/). Do not use it to
scope what to build and why before design — that is a [prd](../prd/) or
[feature-spec](../feature-spec/). If the alignment is a trade-off narrative
around one proposed design rather than a synthesis of existing evidence, an
[engineering](../engineering/) report or [google-design-doc](../google-design-doc/)
fits better.

## Example

A review titled *"Telehealth-Delivered Cognitive Behavioral Therapy for Adult
Depression"* poses a PICO question — does telehealth CBT produce comparable
depression-symptom outcomes to in-person CBT in adults with major depressive
disorder — and searches MEDLINE, PsycINFO, and CENTRAL through 2026-05-01. The
PRISMA flow diagram reconciles 1,842 records identified down to 12 included
randomized controlled trials, with every exclusion at the full-text stage
tagged with a reason (wrong population, intervention, outcome, or design). A
Cochrane RoB 2 table appraises each included trial across five bias domains,
and the synthesis reports that telehealth CBT was broadly equivalent to
in-person CBT and superior to waitlist/care-as-usual, flagging the one
"High"-risk-of-bias trial as a caution rather than folding it into the
headline finding. The review states plainly that it was not prospectively
registered, per PRISMA's "Other information" reporting requirement.

## Provenance & citations

- **Genre source — PRISMA 2020:** Page MJ, McKenzie JE, Bossuyt PM, et al.
  The PRISMA 2020 statement: an updated guideline for reporting systematic
  reviews. *BMJ*. 2021;372:n71. <https://doi.org/10.1136/bmj.n71>.
- **Skill provenance:** authored by the `systematic-review` skill in the
  mif-docs plugin, <https://github.com/modeled-information-format/mif-docs-plugin>;
  the skill's exemplars and `evals/` define and verify the pattern.
- **MIF conformance:** the document projects to canonical JSON-LD under the
  MIF specification, <https://mif-spec.dev>, and is proven lossless by
  `mif-validate`.
- **Index:** this skill is one entry in the [skills by purpose](../../skills-by-purpose/)
  catalog; its Scholarly writing siblings are documented alongside it as the
  genre-consolidation effort completes.
