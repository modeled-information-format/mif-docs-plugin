---
id: 66b00ecb-d782-5541-9b56-d7f5bb4c24ef
type: semantic
created: '2026-07-01T00:00:00Z'
modified: '2026-07-01T00:00:00Z'
namespace: reference/skills
title: 'Skill reference: humanities-mla'
tags:
  - reference
  - mif-docs
  - skill
  - humanities-mla
  - scholarly-writing
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
    - '@id': urn:mif:skill:humanities-mla
      '@type': prov:Entity
citations:
  - '@type': Citation
    citationType: book
    citationRole: methodology
    title: 'MLA Handbook'
    author: Modern Language Association of America
    url: https://style.mla.org/
    accessed: '2026-07-01'
  - '@type': Citation
    citationType: tool
    citationRole: source
    title: 'mif-docs — humanities-mla skill (SKILL.md)'
    url: https://github.com/modeled-information-format/mif-docs-plugin/tree/main/skills/humanities-mla
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
  name: 'Skill reference: humanities-mla'
  entity_type: reference-document
extensions:
  x-skill: humanities-mla
  x-genre-conceptType: semantic
  x-target-level: 3
  x-purpose-group: scholarly-writing
---

# Skill reference: `humanities-mla`

The `humanities-mla` skill authors one document genre: an **argumentative
humanities essay in MLA style** — a thesis-driven argument built through close
reading and interpretation, cited with MLA author-page in-text citations and a
Works Cited list. This reference describes what that document type is, how the
skill produces one, when it earns its place, and the provenance behind it.

| Property | Value |
| --- | --- |
| Authors | An argumentative humanities essay in MLA style |
| Purpose group | Scholarly writing |
| MIF `conceptType` | `semantic` |
| Target MIF level | 3 |
| Primary source | [MLA Handbook, 9th edition](https://style.mla.org/) |

## What this document type is

An MLA humanities essay is a **thesis-driven argument** built through close
reading and interpretation, not an empirical report. Its center of gravity is
the thesis stated in the Introduction — every body section exists to advance
that thesis through evidence and interpretation, never to report a method or
results. Citations use MLA's **author-page** in-text convention, e.g.
`(Author 42)`, resolving to an alphabetized **Works Cited** list; there is no
author-date parenthetical and no numbered footnote apparatus. The essay closes
with a Conclusion that states what the argument establishes without
introducing new evidence.

This is distinct from an empirical report with a Method and Results section
(that is `academic`), from a humanities argument cited Chicago
note-bibliography style rather than MLA author-page (that is
`humanities-chicago`), and from a practitioner decision report built around a
mandatory options-vs-criteria comparison table (that is
[engineering](../engineering/)).

## How the skill produces one

`humanities-mla` is a genre skill: it carries the MLA argumentative-essay
pattern as durable instructions plus exemplars, and writes the artifact over a
MIF floor so the result is at once a human-readable essay and a
machine-conformant unit.

- **Pattern, made operational.** The skill encodes Introduction-with-thesis,
  cumulative body argument sections, a Conclusion that introduces no new
  evidence, and a required Works Cited list, and requires every claim to trace
  to a cited source via its author-page citation — no orphan facts.
- **Honesty about the reading's limits.** The skill requires the essay to
  engage counter-interpretations and to hedge uncertain interpretations rather
  than over-attribute when sources are contested; an unaddressed strong
  counter-reading is treated as a defect.
- **Exemplars set the bar.** Like every genre in the suite it ships
  `good-l1.md` (the MIF Level-1 floor), `good.md` (the Level-3 target),
  `bad.md` (a counter-example missing the Works Cited list), and
  `evals/evals.json`. The `check-exemplars` gate proves `good-l1.md` validates
  at L1 and `good.md` at Level 3.
- **MIF projection.** The document is authored with MIF frontmatter (via the
  shared `mif-frontmatter` substrate) and a `conceptType` of `semantic`,
  reflecting that the essay is declarative argumentative knowledge rather than
  a time-bound event or step sequence. `mif-validate` proves the Markdown ↔
  JSON-LD round-trip is lossless before the document is considered done.

## When it is beneficial

Reach for `humanities-mla` when the deliverable is a **humanities argument
built on interpretation** — close reading, textual or cultural analysis, a
claim about meaning rather than a measured result — and MLA's author-page
citation convention is the expected form.

Do **not** use it for an empirical report with a Method and Results section —
that is `academic`: IMRaD structure, a testable method, reported findings, not
an interpretive argument. Do not use it for a humanities argument cited
Chicago note-bibliography style (superscript notes plus a Bibliography) rather
than MLA author-page parentheticals and a Works Cited list — that is
`humanities-chicago`. Do not use it for a practitioner decision report built
around a mandatory options-vs-criteria comparison table — that is
[engineering](../engineering/).

## Example

An essay titled *"The Dash as Argument: Hesitation and Withheld Meaning in
Emily Dickinson's Lyrics"* opens with a thesis that Dickinson's dash is a
deliberate structural device rather than a printer's-era accident, then
develops that claim across two body sections — the dash as enacted hesitation,
drawing on Sharon Cameron's account of Dickinson's fascicles (Cameron 15), and
the dash as a grammar of withholding, drawing on Cristanne Miller's account of
Dickinson's syntax (Miller 22). A dedicated Counter-Reading section engages the
strongest objection — that the dash is merely a period transcription habit,
not authorial argument — before a further section, grounded in Virginia
Jackson's account of lyric reading (Jackson 8), argues that the dash marks
where the reader must complete the poem's meaning. The Conclusion draws the
three sources together without introducing new evidence, and a Works Cited
list alphabetized by author surname backs every author-page citation in the
essay.

## Provenance & citations

- **Genre source — MLA Handbook, 9th edition:** the Modern Language
  Association's citation and Works Cited convention this genre follows,
  <https://style.mla.org/>.
- **Skill provenance:** authored by the `humanities-mla` skill in the mif-docs
  plugin, <https://github.com/modeled-information-format/mif-docs-plugin>; the
  skill's exemplars and `evals/` define and verify the pattern.
- **MIF conformance:** the document projects to canonical JSON-LD under the MIF
  specification, <https://mif-spec.dev>, and is proven lossless by `mif-validate`.
- **Index:** this skill is one entry in the [skills by purpose](../../skills-by-purpose/)
  catalog.
