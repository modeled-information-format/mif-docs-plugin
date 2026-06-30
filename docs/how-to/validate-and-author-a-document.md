---
id: how-to-validate-and-author
type: procedural
created: '2026-06-30T10:00:00Z'
modified: '2026-06-30T10:00:00Z'
namespace: how-to/authoring
title: How to Validate and Author a MIF Document
tags:
  - how-to
  - mif-docs
  - validation
temporal:
  '@type': TemporalMetadata
  validFrom: '2026-06-30T00:00:00Z'
  recordedAt: '2026-06-30T10:00:00Z'
  ttl: P1Y
relationships:
  - type: relates-to
    target: urn:mif:tutorial-getting-started
  - type: relates-to
    target: urn:mif:reference-genre-and-cli
  - type: relates-to
    target: urn:mif:explanation-one-artifact-two-readers
ontology:
  '@type': OntologyReference
  id: mif-docs
  version: 1.0.0
  uri: https://mif-spec.dev/ontologies/mif-docs
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
    - '@id': https://diataxis.fr/how-to-guides/
      '@type': prov:Entity
citations:
  - '@type': Citation
    citationType: documentation
    citationRole: methodology
    title: 'Diátaxis — How-to Guides: the task-oriented quadrant this guide follows'
    url: https://diataxis.fr/how-to-guides/
    accessed: '2026-06-30'
  - '@type': Citation
    citationType: repository
    citationRole: source
    title: 'modeled-information-format/mif-docs-plugin — the validator and convert scripts this guide drives'
    url: https://github.com/modeled-information-format/mif-docs-plugin
entity:
  name: Validate and Author a MIF Document
  entity_type: how-to-guide
extensions:
  x-diataxis-quadrant: how-to
---

# How to Validate and Author a MIF Document

Validate any document for MIF conformance, author a genre document that passes
the fail-closed guard, and convert a document to JSON-LD. This guide assumes you
already have the **mif-docs** plugin installed and know what kind of document you
want to produce.

## Prerequisites

- The mif-docs plugin installed (`claude plugin install
  mif-docs@modeled-information-format`).
- The canonical schema hydrated locally — run `npm run hydrate-schema` once if
  `schema/VENDOR.lock` is absent.
- Node.js 20+ on your `PATH`.

## Validate any document

Run the validator against the file, choosing the level floor you want to enforce:

```bash
node scripts/mif-validate.mjs <file> --level N
```

`N` is `1`, `2`, or `3`. Level 1 is the core floor (`id`, `type`, `created`);
level 2 adds `namespace`, `modified`, and `temporal`; level 3 adds `provenance`
and `temporal.validFrom`. A passing run ends in `RESULT: VALID at MIF L<N>`;
exit code 0. Any schema, level, or round-trip failure exits non-zero and lists
each problem. Pass `--no-roundtrip` only when you deliberately want to skip the
losslessness check.

## Author a genre document that passes the guard

1. Pick the genre skill that matches your document (for example
   `diataxis-how-to`, `adr`, or `feature-spec`) and read its `templates/good.md`
   exemplar. The exemplar is the reference for conformant frontmatter — mirror
   its field names and nesting rather than inventing them.
2. Write your document at the target path, carrying the MIF frontmatter floor
   (`id`, `type`, `created`) and climbing to the level the genre targets.
3. Save the file. The plugin's PostToolUse guard (`hooks/mif-guard.mjs`) runs on
   Write, Edit, and MultiEdit. If your document fails `mif-validate --level 1`
   the guard exits 2 and **blocks** the write; fix the reported failure and write
   again. A conformant document is saved silently. (`type: adr` documents are
   skipped by this guard — they are validated by the structured-madr action
   instead.)
4. Confirm with an explicit validation run at your target level, as shown above.

## Convert a document with mif-convert

Project a document to JSON-LD, or verify the round-trip, with `mif-convert`:

```bash
# Emit the canonical JSON-LD projection to a directory.
node scripts/mif-convert.mjs emit-jsonld <file> --out-dir dist/jsonld

# Verify the markdown <-> JSON-LD round-trip is lossless.
node scripts/mif-convert.mjs roundtrip <file>
```

`emit-jsonld` writes the machine-readable view that the schema checks;
`roundtrip` confirms that converting to JSON-LD and back loses nothing. Use
`emit-markdown` to go the other way, from a JSON-LD object to the human view.

## Result

You can now validate a document at any level, author a genre document the guard
accepts, and convert between the two MIF views. For a guided first pass, see the
getting-started tutorial; for an exhaustive list of genres, recipes, and scripts,
see the catalog reference; for the rationale behind the two views, see the
explanation. Each is linked from this guide's `relationships[]`.
