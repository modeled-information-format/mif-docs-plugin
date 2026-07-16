---
name: mif-to-pdf
description: Convert a MIF JSON-LD document to a typeset PDF with real markdown rendering (headings, bold, inline code, flat bullet lists, tables, clickable links, embedded raster/SVG figures) plus every MIF frontmatter field (id/type/created, namespace/modified/temporal, provenance/citations/relationships) embedded as PDF metadata — the standard Info dictionary, real Dublin Core properties, a fully typed mif-namespaced RDF/XML tree per field, and a retained raw-JSON copy as the machine-checkable losslessness guarantee. Input is JSON-LD only; a Markdown source is converted first with the existing mif-convert/mif-validate tooling. Use when a MIF document needs a portable, richly-formatted, metadata-bearing PDF rendering.
argument-hint: "<path to a MIF JSON-LD document> [--output path.pdf]"
---

# mif-to-pdf

Shared helper (not a standalone document genre). Converts a **MIF JSON-LD
document** into a real, typeset PDF file — not a plain-text dump of the body —
embedding every field the source carries as richly structured PDF metadata.

## One input surface: JSON-LD only

This skill does not parse Markdown or YAML frontmatter itself. If the source
is a Markdown MIF document, convert it to JSON-LD first with this suite's
existing tooling — the same projection `mif-validate` already performs, not a
second, duplicate parser living inside this skill:

```bash
node scripts/mif-convert.mjs emit-jsonld <doc.md> > <doc.json>
node scripts/mif-validate.mjs <doc.md> --level 1   # conformance gate, run before or after
node scripts/mif-to-pdf.mjs <doc.json> --output <doc.pdf>
```

If asked to convert a `.md` file directly, run the `emit-jsonld` step first
rather than attempting to read the Markdown's frontmatter directly — never
hand-parse YAML frontmatter as a shortcut around the existing projection.

## Markdown rendering: this suite's own round-trip-safe subset

The `content` body is real markdown text — this skill actually renders it.
Most of the supported subset is exactly what `mif-validate`'s own
markdown-to-JSON-LD projection (`scripts/lib/projection.mjs`) round-trips
losslessly: h1–h3 headings (distinct sizes, bold), paragraphs, flat bullet
lists, tables (bordered, header row bold), inline `code` (monospace),
**bold**, `[text](url)` links and `<url>` autolinks (rendered as real
clickable PDF link annotations, not just colored text), and figures —
`![alt](path)` or `<img src="path" alt="...">` — for raster images (PNG/JPG,
via `pdf-lib`'s native image embedding) and for `.svg` files (via a minimal
vector renderer scoped to what this suite's own `svg-charts` skill emits:
rect/text/line/circle/path/polyline/polygon with `<style>`-block or
attribute-driven fill/font styling and `<g transform="translate(dx,dy)">`
grouping — only the translate form, not rotate/scale/skew, and not a general
SVG engine).

Two constructs outside that round-trip-safe subset are handled too, since
real documents contain them even though they don't round-trip: fenced code
blocks render as a legible monospace block, labeled with their language tag
when present, preserving each line's exact spacing as long as the line fits
the page width — a line too wide falls back to word-wrapping, which loses
that exact alignment since the line no longer fits. Single-level
blockquotes render with their `>` marker stripped and a left rule, rather
than leaking the literal `>` character as visible text. Nested lists,
footnotes, and raw HTML beyond `<img>` remain out of scope.

**`mermaid` fences are the one exception to "legible text, not a real
diagram."** A ```` ```mermaid ```` block renders as a real diagram image,
produced by an actual Mermaid layout engine running in a headless Chromium
(via `@mermaid-js/mermaid-cli` + Puppeteer, launched once per document and
shared across every diagram in it). This adds a real dependency: Puppeteer
downloads its own Chromium binary at install time (a few hundred MB, one
time, regardless of whether a given document uses mermaid), and each
conversion of a document containing a mermaid fence launches a local
headless browser process — no document content ever leaves the machine
(fully local, no network calls), but the Chromium binary itself is a
real, non-trivial addition to what is otherwise a lightweight tool. If the
diagram fails to render (malformed Mermaid syntax, a rendering-engine
error) the fence falls back to the same legible-source-text rendering as
every other language, rather than aborting the whole document.

## Output contract

1. Render the document's `content` body as real typeset PDF content per the
   markdown scope above — never a single undifferentiated text blob, and
   never silently skip a referenced figure.
2. Set the standard PDF Info dictionary fields (Title/Author/Subject/Keywords/
   Creator/CreationDate/ModDate) from a best-effort mapping of the source
   fields. This mapping is necessarily lossy — the Info dictionary has no slot
   for `citations[]` or `relationships[]` — which is why steps 3–4 exist.
3. Attach a custom XMP metadata stream (`/Metadata` on the PDF's document
   catalog) carrying **real, individually typed metadata**, not one opaque
   blob: standard Dublin Core properties (`dc:title`, `dc:creator`,
   `dc:subject`, `dc:description`, `dc:identifier`, `xmp:CreateDate`/
   `xmp:ModifyDate`) plus a full `mif:`-namespaced RDF/XML tree with one real
   property per top-level MIF field — nested objects (`provenance`, `entity`,
   …) become nested `rdf:Description`s, arrays (`citations[]`,
   `relationships[]`, `tags[]`) become `rdf:Seq`, generically, so no
   future/extension field needs new code to appear structurally.
4. Additionally embed the **entire source JSON-LD document verbatim** under
   `mif:rawDocument`, so every field — including ones step 3's typed tree
   might not yet special-case — is provably recoverable: extracting and
   parsing that one property back must deep-equal the source document. This
   is the losslessness guarantee; step 3 is what makes the metadata
   genuinely inspectable by a real XMP-aware tool without parsing JSON.
5. Never silently drop a field. If a future change narrows the metadata
   surface (step 3's typed tree, or step 4's raw copy), that is a defect,
   not an acceptable trade-off.

## Anti-triggers — do not use this helper for

- **A Markdown source with no JSON-LD projection yet** — run
  `mif-convert emit-jsonld` first; this skill does not read frontmatter.
- **A document that has not been proven MIF-conformant** — pair with
  `mif-validate` first if conformance matters for the use case; this skill
  will still render structurally-valid JSON that fails schema checks, but
  the PDF's metadata is only as trustworthy as its source.
- **Markdown constructs outside this suite's supported set** — nested/numbered
  lists, nested blockquotes (a `>` inside another `>`'s text), footnotes, and
  raw HTML beyond `<img>` render as literal text rather than being
  interpreted; if a document needs those, it is already outside what
  `mif-validate`'s own round-trip proof covers, so treat that as a signal to
  simplify the source, not a bug here. A fenced code block immediately
  inside a single-level blockquote is the one nested case handled — it's
  unwrapped into its own code block rather than left as literal quoted text.
- **A general-purpose SVG file** — the embedded SVG renderer only covers the
  shape/text primitives this suite's own `svg-charts` skill produces; an
  arbitrary complex SVG (gradients, filters, clip paths, external fonts) will
  render partially or not at all.

## Example

A `docs/reference/skills/mif-to-pdf.md` reference doc — headings, a table, a
`svg-charts`-generated figure, and all — needs to be handed to a reviewer as
one portable file with its provenance and citations still attached as
inspectable metadata, not just prose in the body.

```bash
node scripts/mif-convert.mjs emit-jsonld docs/reference/skills/mif-to-pdf.md > mif-to-pdf.json
node scripts/mif-to-pdf.mjs mif-to-pdf.json --output mif-to-pdf-reference.pdf
```

The result is a PDF with real rendered headings/tables/figures, whose Info
dictionary shows the title/author/keywords at a glance, and whose XMP packet —
inspectable with `pdfinfo -meta mif-to-pdf-reference.pdf` or any XMP-aware
tool — shows real `dc:title`/`dc:creator`/`mif:provenance` properties, not a
single opaque field, while still carrying the full source verbatim under
`mif:rawDocument` for anything that needs it losslessly.
