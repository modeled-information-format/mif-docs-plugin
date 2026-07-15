---
name: mif-to-pdf
description: Convert a MIF JSON-LD document to a PDF, embedding every MIF frontmatter field (id/type/created, namespace/modified/temporal, provenance/citations/relationships) into the produced PDF's own metadata — both the standard Info dictionary and a custom XMP packet carrying the full document losslessly. Input is JSON-LD only; a Markdown source is converted first with the existing mif-convert/mif-validate tooling. Use when a MIF document needs a portable, metadata-bearing PDF rendering.
argument-hint: "<path to a MIF JSON-LD document> [--output path.pdf]"
---

# mif-to-pdf

Shared helper (not a standalone document genre). Converts a **MIF JSON-LD
document** into a real PDF file, embedding every field the source carries as
PDF metadata rather than only rendering the body text.

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

## Output contract

1. Render the document's `content` body as the PDF's visible text (wrapped
   and paginated — a long body spans multiple pages, never truncated).
2. Set the standard PDF Info dictionary fields (Title/Author/Subject/Keywords/
   Creator/CreationDate/ModDate) from a best-effort mapping of the source
   fields. This mapping is necessarily lossy — the Info dictionary has no slot
   for `citations[]` or `relationships[]` — which is why step 3 exists.
3. Attach a custom XMP metadata stream (`/Metadata` on the PDF's document
   catalog, `xmlns:mif="https://mif-spec.dev/ns#"`) carrying the **entire**
   source JSON-LD document verbatim, so every field — not just the ones with
   a standard Info-dict home — is recoverable from the produced PDF. This is
   the losslessness guarantee: extracting and parsing the XMP payload back
   must deep-equal the source document.
4. Never silently drop a field. If a future change narrows what the XMP
   packet carries, that is a defect, not an acceptable trade-off — the whole
   point of the custom stream is that nothing gets left out the way an
   Info-dict-only mapping would.

## Anti-triggers — do not use this helper for

- **A Markdown source with no JSON-LD projection yet** — run
  `mif-convert emit-jsonld` first; this skill does not read frontmatter.
- **A document that has not been proven MIF-conformant** — pair with
  `mif-validate` first if conformance matters for the use case; this skill
  will still render structurally-valid JSON that fails schema checks, but
  the PDF's metadata is only as trustworthy as its source.
- **Producing a styled, typeset document** — this is a metadata-preserving
  utility conversion (fixed-width single-column body text), not a layout
  engine; it does not support headings, tables, images, or custom styling
  from the source body.

## Example

A `docs/reference/skills/mif-to-pdf.md` reference doc needs to be handed to a
reviewer who wants a single portable file with the document's provenance and
citations still attached as inspectable metadata, not just prose in the body.
Running `node scripts/mif-to-pdf.mjs docs/reference/skills/mif-to-pdf.md.json
--output mif-to-pdf-reference.pdf` (after `mif-convert emit-jsonld`) produces
a PDF whose Info dictionary shows the title/author/keywords at a glance, and
whose XMP packet — inspectable with `pdfinfo -meta mif-to-pdf-reference.pdf`
or any XMP-aware tool — carries the full `provenance`/`citations`/
`relationships` blocks the source document had.
