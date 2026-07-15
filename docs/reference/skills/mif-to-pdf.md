---
id: reference-skill-mif-to-pdf
type: semantic
created: '2026-07-15T18:00:00Z'
modified: '2026-07-15T20:56:02.627Z'
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
    citationType: specification
    citationRole: methodology
    title: 'Dublin Core Metadata Element Set, Version 1.1'
    url: https://www.dublincore.org/specifications/dublin-core/dces/
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
document into a real, typeset PDF — headings, lists, tables, links, and
figures actually rendered, not a plain-text dump of the body — while
embedding every frontmatter field the source carries into the produced
PDF's own metadata. This reference describes its single input surface, how
it renders markdown and produces metadata, when it earns its place, and its
sources.

| Property | Value |
| --- | --- |
| Authors | One typeset PDF file carrying the source document's complete frontmatter as richly structured metadata |
| Purpose group | Authoring helpers |
| MIF `conceptType` | `substrate` |
| Target MIF level | 3 (round-trips a document's provenance/citations/relationships blocks) |
| Primary constraint | The PDF Info dictionary has no slot for non-standard fields; the SVG renderer covers only this suite's own `svg-charts` output shape |

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

`mif-to-pdf` renders the body and writes its metadata in one pass, via
`scripts/mif-to-pdf.mjs` (`pdf-lib`, pure JavaScript, no native binary and no
headless-browser dependency):

- **Markdown rendering.** The `content` field is real markdown text, parsed
  and typeset — not wrapped as an undifferentiated blob. Scope is exactly
  what `mif-validate`'s own markdown-to-JSON-LD projection
  (`scripts/lib/projection.mjs`) round-trips losslessly:
  h1–h3 headings (bold, sized by level), paragraphs, flat bullet lists,
  bordered tables with a bold header row, inline `code` (monospace), **bold**
  text, and `[text](url)`/`<url>` links rendered as real clickable PDF link
  annotations (per [ISO 32000-1 §12.5.6.5](https://opensource.adobe.com/dc-acrobat-sdk-docs/pdfstandards/PDF32000_2008.pdf),
  the Link annotation subtype), not just colored text. Long bodies paginate
  rather than truncate.
- **Figures.** `![alt](path)` and `<img src="path" alt="...">` are resolved
  relative to the source JSON file's directory and embedded, not skipped:
  PNG/JPG via `pdf-lib`'s native image embedding, and `.svg` via a minimal
  vector renderer scoped to what this suite's own `svg-charts` skill
  produces (`rect`/`text`/`line`/`circle`/`path`/`polyline`/`polygon`,
  `<style>`-block or attribute-driven fill/font styling, `<g transform>`
  grouping) — using `pdf-lib`'s `drawSvgPath` for raw path data and manual
  coordinate mapping for the rest, since `pdf-lib` has no built-in SVG
  rasterizer. A missing figure file draws a visible placeholder rather than
  silently vanishing.
- **Standard Info dictionary.** Title/Author/Subject/Keywords/Creator/
  CreationDate/ModDate are set from a best-effort mapping of the source
  fields ([ISO 32000-1 §14.3](https://opensource.adobe.com/dc-acrobat-sdk-docs/pdfstandards/PDF32000_2008.pdf)
  defines the Info dictionary's fixed key set). This mapping is necessarily
  lossy: the Info dictionary has no key for `citations[]` or
  `relationships[]`, which is exactly why the next two layers exist.
- **Structured XMP: real Dublin Core plus a typed `mif:` tree.** A
  `/Metadata` stream on the PDF's document catalog carries actual Dublin
  Core properties (`dc:title`, `dc:creator`, `dc:subject`, `dc:description`,
  `dc:identifier`, `xmp:CreateDate`/`xmp:ModifyDate` —
  [Dublin Core Metadata Element Set 1.1](https://www.dublincore.org/specifications/dublin-core/dces/))
  plus a full `mif:`-namespaced RDF/XML tree with one real, individually
  inspectable property per top-level MIF field: nested objects
  (`provenance`, `entity`, …) become nested `rdf:Description`s, arrays
  (`citations[]`, `relationships[]`, `tags[]`) become `rdf:Seq` — generically,
  via one recursive JS-value-to-RDF serializer, so a future extension field
  needs no new code to appear structurally. This is what makes the metadata
  genuinely readable by an XMP-aware tool without parsing JSON — the
  opposite of one opaque blob.
- **`mif:rawDocument`: the losslessness guarantee.** The complete source
  JSON-LD document is additionally embedded verbatim under this one
  property, per the XMP packet format
  ([XMP Specification Part 1](https://developer.adobe.com/xmp/docs/XMPSpecifications/)).
  Extracting and parsing just this property back must deep-equal the source
  document, field for field — proven by the skill's own test suite
  (`tests/mif-to-pdf.test.mjs`), which converts a fully-populated L1–L3
  fixture and asserts every source key survives, independent of whatever the
  typed Dublin-Core-plus-`mif:` tree above does or doesn't yet special-case.
- **Input guard.** Input missing a required MIF L1 field (`@id`/
  `conceptType`/`created`) is rejected rather than silently converted into a
  garbage PDF — the skill has no undefined behavior for non-MIF JSON.

## When it is beneficial

Reach for `mif-to-pdf` whenever a MIF document needs a portable, readable,
single-file rendering that keeps its provenance, citations, and
relationships inspectable as real metadata, not only as prose in the body —
for example, handing a reviewer a document whose sourcing can be checked
with a metadata tool (`pdfinfo -meta`, or any XMP-aware reader) rather than
by re-reading the frontmatter, with its headings/tables/figures still
legible on the page.

Do **not** reach for it when the source is still Markdown — convert with
`mif-convert emit-jsonld` first, since this skill does not read frontmatter
— when the body uses markdown constructs outside this suite's round-trip-safe
subset (nested/numbered lists, blockquotes, footnotes, raw HTML beyond
`<img>`), which render as literal text rather than being interpreted — or
when a figure is a general-purpose SVG rather than this suite's own
`svg-charts` output shape, which may render partially or not at all.

## Example

A reviewer needs `docs/reference/skills/mif-to-pdf.md` — headings, tables,
and all — as one portable file with its citations and provenance still
attached as inspectable metadata.

```bash
node scripts/mif-convert.mjs emit-jsonld docs/reference/skills/mif-to-pdf.md > mif-to-pdf.json
node scripts/mif-to-pdf.mjs mif-to-pdf.json --output mif-to-pdf-reference.pdf
```

The result is a PDF with the document's headings and tables actually
rendered, whose Info dictionary shows the title and keywords at a glance,
and whose XMP packet — inspectable with `pdfinfo -meta
mif-to-pdf-reference.pdf` — shows real `dc:title`/`dc:creator`/
`mif:provenance` properties individually, while still carrying the full
provenance, citations, and relationships blocks losslessly under
`mif:rawDocument`.

## Provenance & citations

- **PDF metadata streams and link annotations (the Info dictionary, the
  `/Metadata` object, and the Link annotation subtype):**
  [ISO 32000-1:2008, §14.3 and §12.5.6.5](https://opensource.adobe.com/dc-acrobat-sdk-docs/pdfstandards/PDF32000_2008.pdf).
- **XMP packet format (the RDF/XML container for both the Dublin Core
  properties and the `mif:` tree):**
  [XMP Specification Part 1](https://developer.adobe.com/xmp/docs/XMPSpecifications/).
- **Dublin Core property set (`dc:title`/`dc:creator`/`dc:subject`/
  `dc:description`/`dc:identifier`):**
  [Dublin Core Metadata Element Set 1.1](https://www.dublincore.org/specifications/dublin-core/dces/).
- **PDF generation library:** [pdf-lib](https://pdf-lib.js.org/) — pure
  JavaScript, no native binary, used via its low-level context API to
  attach the custom XMP stream and Link annotations (no high-level API for
  either exists in pdf-lib 1.17.1) and its `drawSvgPath` helper for the
  embedded-SVG figure renderer's path data.
- **Skill provenance:** authored by the `mif-to-pdf` skill in the mif-docs
  plugin, <https://github.com/modeled-information-format/mif-docs-plugin>.
- **MIF conformance:** projects to canonical JSON-LD under the MIF
  specification, <https://mif-spec.dev>, proven lossless by
  [mif-validate](../mif-validate/).
- **Index:** one entry in the [skills by purpose](../../skills-by-purpose/)
  catalog, in the Authoring helpers group alongside
  [mif-frontmatter](../mif-frontmatter/) and [mif-validate](../mif-validate/).
