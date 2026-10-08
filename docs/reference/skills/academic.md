---
id: 7421a39d-94e1-54f4-9b79-a16751980ba5
type: semantic
created: '2026-07-01T00:00:00Z'
modified: '2026-07-01T00:00:00Z'
namespace: reference/skills
title: 'Skill reference: academic'
tags:
  - reference
  - mif-docs
  - skill
  - academic
  - research-report
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
    - '@id': urn:mif:skill:academic
      '@type': prov:Entity
citations:
  - '@type': Citation
    citationType: specification
    citationRole: methodology
    title: 'Recommendations for the Conduct, Reporting, Editing, and Publication of Scholarly Work in Medical Journals (ICMJE Recommendations)'
    url: https://www.icmje.org/recommendations/
    accessed: '2026-07-01'
  - '@type': Citation
    citationType: tool
    citationRole: source
    title: 'mif-docs — academic skill (SKILL.md)'
    url: https://github.com/modeled-information-format/mif-docs-plugin/tree/main/skills/academic
relationships:
  - type: relates-to
    target: urn:mif:d8972202-0b4d-52ea-89d7-90abe228e820
  - type: relates-to
    target: urn:mif:d60dba7d-ef07-5ed0-a013-1b0b5e9b1ace
  - type: relates-to
    target: urn:mif:b2030d2f-0690-55f3-a64e-de659e0962f0
ontology:
  '@type': OntologyReference
  id: mif-docs
  version: 1.0.0
  uri: https://mif-spec.dev/ontologies/mif-docs
entity:
  name: 'Skill reference: academic'
  entity_type: reference-document
extensions:
  x-skill: academic
  x-genre-conceptType: semantic
  x-target-level: 3
  x-purpose-group: scholarly-writing
---

# Skill reference: `academic`

The `academic` skill authors one document genre: a **formal academic research
report** — a scholarly write-up for a research or technical-expert audience
that will scrutinize method, evidence, and the limits of each claim before
accepting it. This reference describes what that document type is, how the
skill produces one, when it earns its place, and the provenance behind it.

| Property | Value |
| --- | --- |
| Authors | A formal academic research report |
| Purpose group | Scholarly writing |
| MIF `conceptType` | `semantic` |
| Target MIF level | 3 |
| Primary source | [ICMJE Recommendations](https://www.icmje.org/recommendations/) (numbered/Vancouver mode); APA 7th Edition (author-date mode) |

## What this document type is

An academic report follows the general **IMRaD** convention — Introduction/
Background, Methods, Results (here, Findings), and Discussion — used broadly
across scientific and technical scholarship. Its defining trait is **mandatory
citation discipline** applied in one of two selectable modes: author-date
(APA 7th Edition) or numbered (Vancouver/ICMJE), picked once and applied
consistently for the whole document. Every claim in Findings must trace to a
cited, verifiable source; an uncited claim is a defect, not a stylistic
choice. The report also carries an Abstract, states its Method (how evidence
was gathered and verified, with optional APA sub-sections for Participants,
Materials, Procedure, and Analysis), and closes with Discussion — including
honestly stated limitations — and a full References section.

This is distinct from an informal, prose-driven alignment narrative (a
[google-design-doc](../google-design-doc/)), from a practitioner report built
around a mandatory options-vs-criteria comparison table (an
[engineering](../engineering/) report), and from a single already-made,
immutable decision record (an [adr](../adr/)). It reasons from evidence to
interpretation rather than recording a decision or proposing one, so it
projects to MIF as `semantic` content at Level 3.

## How the skill produces one

`academic` is a genre skill: it carries the IMRaD pattern and citation
discipline as durable instructions plus exemplars, and writes the artifact
over a MIF floor so the result is at once a human-readable scholarly report
and a machine-conformant unit.

- **Pattern, made operational.** The skill encodes the six-section IMRaD
  shape, the selectable citation mode (author-date vs. numbered), the
  required tables/figures-as-Mermaid convention, and the rule that hedges
  contested evidence and states limitations rather than laundering them.
  Fabricating a citation, or leaving a claim uncited, breaks conformance
  regardless of citation mode chosen.
- **Exemplars set the bar.** Like every genre in the suite it ships
  `good-l1.md` (the MIF Level-1 floor), `good.md` (the Level-3 target),
  `bad.md` (a counter-example that states findings as fact with no
  citations), and `evals/evals.json`. The `check-exemplars` gate proves
  `good-l1.md` validates at L1 and `good.md` at Level 3.
- **MIF projection.** The document is authored with MIF frontmatter (via the
  shared `mif-frontmatter` substrate) and a `conceptType` of `semantic`,
  reflecting that the doc is a claim set with method and evidence rather than
  a time-bound event or step sequence. `mif-validate` proves the Markdown ↔
  JSON-LD round-trip is lossless before the document is considered done.

## When it is beneficial

Reach for `academic` when the deliverable is a **scholarly write-up for a
research or technical-expert audience that demands traceable evidence and
explicit method** — a literature synthesis, an evaluation study, or any
report whose claims must survive peer scrutiny of both the evidence and how
it was gathered. It rewards teams that need every finding attributable and
every disputed result flagged rather than smoothed over.

Do **not** use it for an informal, pre-build trade-off narrative — that is
[google-design-doc](../google-design-doc/): conversational, alternatives
reasoned in prose, no IMRaD structure or citation-style requirement. Do not
use it for a practitioner decision report built around a mandatory
options-vs-criteria comparison table — that is [engineering](../engineering/):
its center of gravity is the Trade-offs table, not scholarly method and cited
evidence. Do not use it for a single already-made, immutable decision record —
that is an [adr](../adr/).

## Example

A report titled *"Retrieval Strategy and Evaluation in Retrieval-Augmented
Generation: A Synthesis Report"* opens with a 150-250 word Abstract stating
the question, method, and principal findings, then states in Background that
closed-book language models cannot incorporate long-tail or newly changed
facts. Method explains that evidence came from three primary-source papers
verified by reading the originals rather than downstream citations. Findings
then walks three themes each grounded in a real, cited publication — Lewis et
al. (2020) on the RAG architecture itself, Karpukhin et al. (2020) on dense
passage retrieval outperforming sparse lexical retrieval, and Es et al.
(2023) on RAGAS's reference-free evaluation of faithfulness and relevance.
Discussion ties the three findings together (retrieval quality bounds what
the generator can faithfully ground, and evaluation determines whether that
faithfulness is actually measured) and states the report's limitation
honestly: it synthesizes published papers rather than running a new
empirical comparison. References lists the three cited papers in full,
author-date style.

## Provenance & citations

- **Genre source — ICMJE Recommendations:** the current Recommendations for
  the Conduct, Reporting, Editing, and Publication of Scholarly Work in
  Medical Journals, the living reference for numbered (Vancouver) citation
  practice underlying IMRaD-style reporting,
  <https://www.icmje.org/recommendations/>.
- **Skill provenance:** authored by the `academic` skill in the mif-docs
  plugin, <https://github.com/modeled-information-format/mif-docs-plugin>;
  the skill's exemplars and `evals/` define and verify the pattern.
- **MIF conformance:** the document projects to canonical JSON-LD under the
  MIF specification, <https://mif-spec.dev>, and is proven lossless by
  `mif-validate`.
- **Index:** this skill is one entry in the
  [skills by purpose](../../skills-by-purpose/) catalog; its
  decisions-and-proposals-adjacent siblings are
  [engineering](../engineering/) and [google-design-doc](../google-design-doc/).
