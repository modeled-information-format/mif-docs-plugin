---
id: 9fcec1f9-e4c1-5f0a-8458-28b95db29c80
type: semantic
created: '2026-07-01T00:00:00Z'
modified: '2026-07-01T00:00:00Z'
namespace: reference/skills
title: 'Skill reference: humanities-chicago'
tags:
  - reference
  - mif-docs
  - skill
  - humanities
  - citation-style
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
    - '@id': urn:mif:skill:humanities-chicago
      '@type': prov:Entity
citations:
  - '@type': Citation
    citationType: book
    citationRole: methodology
    title: The Chicago Manual of Style
    url: https://www.chicagomanualofstyle.org/
  - '@type': Citation
    citationType: tool
    citationRole: source
    title: 'mif-docs — humanities-chicago skill (SKILL.md)'
    url: https://github.com/modeled-information-format/mif-docs-plugin/tree/main/skills/humanities-chicago
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
  name: 'Skill reference: humanities-chicago'
  entity_type: reference-document
extensions:
  x-skill: humanities-chicago
  x-genre-conceptType: semantic
  x-target-level: 3
  x-purpose-group: scholarly-writing
---

# Skill reference: `humanities-chicago`

The `humanities-chicago` skill authors one document genre: an **argumentative
humanities essay in Chicago Notes-Bibliography style** — a scholarly argument
advanced through close reading and interpretation, carried by an Introduction
with an explicit thesis, thematic argument sections, a Conclusion, and a full
citation apparatus of numbered footnotes plus an alphabetized Bibliography.
This reference describes what that document type is, how the skill produces
one, when it earns its place, and the provenance behind it.

| Property | Value |
| --- | --- |
| Authors | An argumentative humanities essay in Chicago Notes-Bibliography style |
| Purpose group | Scholarly writing |
| MIF `conceptType` | `semantic` |
| Target MIF level | 3 |
| Primary source | [The Chicago Manual of Style](https://www.chicagomanualofstyle.org/), Notes-Bibliography system |

## What this document type is

A Chicago Notes-Bibliography essay argues a humanities reading rather than
reporting a study. It opens with an Introduction that states the essay's
thesis, develops the argument across thematic sections that each move from
**claim** to **evidence** to **interpretation**, and closes with a Conclusion
that draws out what the argument establishes without introducing new
evidence. Its center of gravity is the citation apparatus: every claim carries
a numbered footnote resolving to a human-readable source citation, and the
back matter carries a full, alphabetized **Bibliography** listing every
source cited. There is no Method and no Results section — this is what
separates it from an empirical study, and from the `academic` genre's IMRaD
structure.

A Chicago essay is therefore not a single immutable decision, not a
requirements document, and not the same argument recast with author-date
in-text citations — that citation convention belongs to a sibling genre
(`humanities-mla`), not this one. It projects to MIF as `semantic` content at
Level 3.

## How the skill produces one

`humanities-chicago` is a genre skill: it carries the argumentative-essay
pattern as durable instructions plus exemplars, and writes the artifact over a
MIF floor so the result is at once a human-readable essay and a
machine-conformant unit.

- **Pattern, made operational.** The skill encodes the Introduction-thesis,
  thematic-sections, Conclusion, Bibliography shape, and treats the citation
  apparatus as mandatory — every claim carries a numbered footnote, and an
  essay with footnotes but no Bibliography, or a Bibliography with no
  footnotes tying claims to it, is not conformant. Uncertain interpretations
  are hedged rather than over-attributed, and a strong counter-reading left
  unaddressed is treated as a defect.
- **Exemplars set the bar.** Like every genre in the suite it ships
  `good-l1.md` (the MIF Level-1 floor), `good.md` (the Level-3 target),
  `bad.md` (a counter-example that asserts claims with no footnotes and no
  Bibliography), and `evals/evals.json`. The `check-exemplars` gate proves
  `good-l1.md` validates at L1 and `good.md` at Level 3.
- **MIF projection.** The document is authored with MIF frontmatter (via the
  shared `mif-frontmatter` substrate) and a `conceptType` of `semantic`,
  reflecting that the essay is declarative argument-and-evidence knowledge.
  Each footnote may resolve internally to a MIF finding `@id` for
  traceability, but that `@id` is never printed in the note or the body text.
  `mif-validate` proves the Markdown ↔ JSON-LD round-trip is lossless before
  the document is considered done.

## When it is beneficial

Reach for `humanities-chicago` when the deliverable is a **humanities
argument advanced through close reading** — history, literature, or the
arts — and the reader needs a scholarly citation apparatus in footnote and
bibliography form, not an empirical study's Method and Results.

Do **not** use it for the same argumentative shape with author-date
parenthetical citations instead of footnotes — that is `humanities-mla`: same
claim-evidence-interpretation structure, a different citation apparatus
(in-text `(Author page)` plus a Works Cited list). Do not use it for an
empirical study reporting a method and results — that is `academic`, which
follows IMRaD rather than arguing a reading. Do not use it for a practitioner
decision built around a mandatory comparison table — that is
[engineering](../engineering/).

## Example

The skill's own exemplar, *"Butler's Restraint: Unreliable Narration in Kazuo
Ishiguro's The Remains of the Day,"* argues that Stevens's unreliability as a
narrator is a disciplined performance of professional dignity rather than a
lapse of honesty. The Introduction states that thesis; "Dignity as Rhetorical
Armor" develops it through Stevens's flattened diction at emotionally charged
moments, drawing its analytic frame from Wayne Booth's account of the
unreliable narrator; "Free Indirect Access and Its Withholding" contrasts
Ishiguro's withholding of first-person feeling with James Wood's account of
free indirect style, and reads the omission itself as evidence. The
Conclusion draws out what this reading establishes without introducing new
material, and the Bibliography lists Ishiguro, Booth, and Wood alphabetically,
each tied to a numbered footnote in the body.

## Provenance & citations

- **Genre source — The Chicago Manual of Style:** the Notes-Bibliography
  system's citation and argument conventions, the standard for history,
  literature, and the arts, <https://www.chicagomanualofstyle.org/>.
- **Skill provenance:** authored by the `humanities-chicago` skill in the
  mif-docs plugin, <https://github.com/modeled-information-format/mif-docs-plugin>;
  the skill's exemplars and `evals/` define and verify the pattern.
- **MIF conformance:** the document projects to canonical JSON-LD under the
  MIF specification, <https://mif-spec.dev>, and is proven lossless by
  `mif-validate`.
- **Index:** this skill is one entry in the [skills by purpose](../../skills-by-purpose/)
  catalog; its scholarly-writing siblings (`academic`, `humanities-mla`,
  `computing-paper`, `systematic-review`) share the purpose group but are
  documented separately.
