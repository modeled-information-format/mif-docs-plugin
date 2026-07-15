---
id: reference-skill-mif-to-pdf
type: semantic
created: '2026-07-15T18:00:00Z'
modified: '2026-07-15T19:47:22.600Z'
namespace: reference/skills
title: 'Skill reference: mif-to-pdf'
tags:
  - reference
  - mif-docs
  - skill
  - pdf
  - metadata
temporal:
  '@type': TemporalMetadata
  validFrom: '2026-07-15T00:00:00Z'
  recordedAt: '2026-07-15T18:00:00Z'
  ttl: P1Y
provenance:
  '@type': Provenance
  sourceType: agent_inferred
  trustLevel: user_stated
  agent: claude-code/claude-sonnet-5
  wasAttributedTo:
    '@id': https://github.com/modeled-information-format
    '@type': prov:Agent
  wasGeneratedBy:
    '@id': urn:mif:activity:claude-code-session:08717ff4-a47e-4c0a-9fa5-59ce2b2db70a
    '@type': prov:Activity
  wasDerivedFrom:
    - '@id': https://github.com/modeled-information-format/mif-docs-plugin
      '@type': prov:Entity
    - '@id': urn:mif:skill:mif-to-pdf
      '@type': prov:Entity
  agentVersion: 2.1.210
citations:
  - '@type': Citation
    citationType: specification
    citationRole: methodology
    title: 'ISO 32000-1:2008 (PDF 1.7), §14.3 Metadata Streams'
    url: https://opensource.adobe.com/dc-acrobat-sdk-docs/pdfstandards/PDF32000_2008.pdf
    accessed: '2026-07-15'
  - '@type': Citation
    citationType: specification
    citationRole: methodology
    title: 'XMP Specification Part 1 — Data Model, Serialization, and Core Properties'
    url: https://developer.adobe.com/xmp/docs/XMPSpecifications/
    accessed: '2026-07-15'
  - '@type': Citation
    citationType: tool
    citationRole: source
    title: 'pdf-lib — Create and modify PDF documents in any JavaScript environment'
    url: https://pdf-lib.js.org/
    accessed: '2026-07-15'
  - '@type': Citation
    citationType: tool
    citationRole: source
    title: 'mif-docs — mif-to-pdf skill (SKILL.md)'
    url: https://github.com/modeled-information-format/mif-docs-plugin/tree/main/skills/mif-to-pdf
relationships:
  - type: relates-to
    target: urn:mif:reference-skills-by-purpose
  - type: relates-to
    target: urn:mif:reference-skill-mif-frontmatter
  - type: relates-to
    target: urn:mif:reference-skill-mif-validate
ontology:
  '@type': OntologyReference
  id: mif-docs
  version: 1.0.0
  uri: https://mif-spec.dev/ontologies/mif-docs
entity:
  name: 'Skill reference: mif-to-pdf'
  entity_type: reference-document
extensions:
  x-skill: mif-to-pdf
  x-genre-conceptType: substrate
  x-target-level: 3
  x-purpose-group: authoring-helpers
---

# Skill reference: `mif-to-pdf`

The `mif-to-pdf` skill is a **substrate helper**: it converts a MIF JSON-LD
document into a PDF, embedding every frontmatter field the source carries
into the produced PDF's own metadata rather than only rendering the body
text. This reference describes its single input surface, how it produces
the two layers of metadata, when it earns its place, and its sources.

| Property | Value |
| --- | --- |
| Authors | One PDF file carrying the source document's complete frontmatter as metadata |
| Purpose group | Authoring helpers |
| MIF `conceptType` | `substrate` |
| Target MIF level | 3 (round-trips a document's provenance/citations/relationships blocks) |
| Primary constraint | The PDF Info dictionary has no slot for non-standard fields |

## What this document type is

`mif-to-pdf` does not author a document genre; it converts an already-MIF-
conformant JSON-LD document into a portable, single-file PDF rendering. The
skill has exactly **one input surface** — MIF JSON-LD — and does not parse
Markdown or YAML frontmatter itself. A Markdown source is converted to
JSON-LD first with this suite's own existing tooling
(`mif-convert emit-jsonld`, the same projection `mif-validate` already
performs), so the frontmatter-parsing logic that lives in
`scripts/lib/projection.mjs` is never duplicated inside this skill.

## How the skill produces one

`mif-to-pdf` renders the body and writes two layers of metadata, in one
pass, via `scripts/mif-to-pdf.mjs` (`pdf-lib`, pure JavaScript, no native
binary and no headless-browser dependency):

- **Body.** The document's `content` field is wrapped and paginated as the
  PDF's visible text — a long body spans multiple pages rather than being
  truncated.
- **Standard Info dictionary.** Title/Author/Subject/Keywords/Creator/
  CreationDate/ModDate are set from a best-effort mapping of the source
  fields ([ISO 32000-1 §14.3](https://opensource.adobe.com/dc-acrobat-sdk-docs/pdfstandards/PDF32000_2008.pdf)
  defines the Info dictionary's fixed key set). This mapping is necessarily
  lossy: the Info dictionary has no key for `citations[]` or
  `relationships[]`, which is exactly why the next layer exists.
- **Custom XMP metadata stream.** A `/Metadata` stream is attached to the
  PDF's document catalog carrying a custom `xmlns:mif="https://mif-spec.dev/ns#"`
  namespace whose one property embeds the **entire source JSON-LD document
  verbatim**, per the XMP packet format
  ([XMP Specification Part 1](https://developer.adobe.com/xmp/docs/XMPSpecifications/)).
  This is the losslessness guarantee: extracting and parsing the XMP
  payload back must deep-equal the source document, field for field —
  proven by the skill's own test suite (`tests/mif-to-pdf.test.mjs`), which
  converts a fully-populated L1–L3 fixture and asserts every source key
  survives.
- **Input guard.** Input missing a required MIF L1 field (`@id`/
  `conceptType`/`created`) is rejected rather than silently converted into a
  garbage PDF — the skill has no undefined behavior for non-MIF JSON.

## When it is beneficial

Reach for `mif-to-pdf` whenever a MIF document needs a portable, single-file
rendering that keeps its provenance, citations, and relationships
inspectable as metadata, not only as prose in the body — for example,
handing a reviewer a document whose sourcing can be checked with a metadata
tool (`pdfinfo -meta`, or any XMP-aware reader) rather than by re-reading
the frontmatter.

Do **not** reach for it when the source is still Markdown — convert with
`mif-convert emit-jsonld` first, since this skill does not read frontmatter
— or when a styled, typeset document is wanted: this is a metadata-
preserving utility conversion (a simple, unstyled single-column body in a
proportional font), not a layout engine, and supports no headings, tables,
images, or custom styling from the source body.

## Example

A reviewer needs `docs/reference/skills/mif-to-pdf.md` as one portable file
with its citations and provenance still attached as inspectable metadata.

```bash
node scripts/mif-convert.mjs emit-jsonld docs/reference/skills/mif-to-pdf.md > mif-to-pdf.json
node scripts/mif-to-pdf.mjs mif-to-pdf.json --output mif-to-pdf-reference.pdf
```

The result is a PDF whose Info dictionary shows the title and keywords at a
glance, and whose XMP packet — inspectable with `pdfinfo -meta
mif-to-pdf-reference.pdf` — carries the full provenance, citations, and
relationships blocks this very document has.

## Provenance & citations

- **PDF metadata streams (the Info dictionary and the `/Metadata` object):**
  [ISO 32000-1:2008, §14.3](https://opensource.adobe.com/dc-acrobat-sdk-docs/pdfstandards/PDF32000_2008.pdf).
- **XMP packet format (the custom `mif:document` property's container):**
  [XMP Specification Part 1](https://developer.adobe.com/xmp/docs/XMPSpecifications/).
- **PDF generation library:** [pdf-lib](https://pdf-lib.js.org/) — pure
  JavaScript, no native binary, used via its low-level context API to
  attach the custom XMP stream (no high-level XMP API exists in pdf-lib
  1.17.1, so the stream is constructed and registered directly).
- **Skill provenance:** authored by the `mif-to-pdf` skill in the mif-docs
  plugin, <https://github.com/modeled-information-format/mif-docs-plugin>.
- **MIF conformance:** projects to canonical JSON-LD under the MIF
  specification, <https://mif-spec.dev>, proven lossless by
  [mif-validate](../mif-validate/).
- **Index:** one entry in the [skills by purpose](../../skills-by-purpose/)
  catalog, in the Authoring helpers group alongside
  [mif-frontmatter](../mif-frontmatter/) and [mif-validate](../mif-validate/).
