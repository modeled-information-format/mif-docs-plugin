---
id: how-to-run-mif-validate
type: procedural
created: '2026-06-30T12:00:00Z'
modified: '2026-07-12T02:38:15.311Z'
namespace: how-to/validate
title: How to run mif-validate and convert a document
tags:
  - how-to
  - mif-docs
  - mif-validate
  - validation
temporal:
  '@type': TemporalMetadata
  validFrom: '2026-06-30T00:00:00Z'
  recordedAt: '2026-06-30T12:00:00Z'
  ttl: P1Y
relationships:
  - type: relates-to
    target: urn:mif:how-to-validate-and-author
  - type: relates-to
    target: urn:mif:reference-skill-mif-validate
  - type: relates-to
    target: urn:mif:reference-skills-by-purpose
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
  trustLevel: user_stated
  agent: claude-code/claude-sonnet-5
  wasAttributedTo:
    '@id': https://github.com/modeled-information-format
    '@type': prov:Agent
  wasGeneratedBy:
    '@id': urn:mif:activity:claude-code-session:0baec4b0-123e-4559-a4cb-5342f36006c2
    '@type': prov:Activity
  wasDerivedFrom:
    - '@id': https://github.com/modeled-information-format/mif-docs-plugin
      '@type': prov:Entity
    - '@id': https://mif-spec.dev
      '@type': prov:Entity
  agentVersion: 2.1.207
citations:
  - '@type': Citation
    citationType: documentation
    citationRole: methodology
    title: 'Diátaxis — How-to Guides: the task-oriented quadrant this guide follows'
    url: https://diataxis.fr/how-to-guides/
    accessed: '2026-06-30'
  - '@type': Citation
    citationType: specification
    citationRole: background
    title: 'JSON Schema 2020-12 — the dialect the canonical MIF schema declares'
    url: https://json-schema.org/specification
    accessed: '2026-06-30'
  - '@type': Citation
    citationType: repository
    citationRole: source
    title: 'modeled-information-format/mif-docs-plugin — the mif-validate and mif-convert scripts'
    url: https://github.com/modeled-information-format/mif-docs-plugin
entity:
  name: Run mif-validate and convert a document
  entity_type: how-to-guide
extensions:
  x-diataxis-quadrant: how-to
---

# How to run mif-validate and convert a document

This guide runs the deterministic `mif-validate` gate on a document and converts it
between Markdown and JSON-LD. For the full description of the skill, see the
[mif-validate reference](../../reference/skills/mif-validate/); for why the
projection is deterministic, see
[One Artifact, Two Readers](../../explanation/one-artifact-two-readers/).

## Step 1 — Validate at a level

Pick the MIF level the document targets and run the validator:

```bash
node scripts/mif-validate.mjs your-doc.md --level 1
```

A `RESULT: VALID at MIF L<n>` line means the document is schema-conformant and
its round-trip is lossless. See the
[mif-validate reference](../../reference/skills/mif-validate/) for exactly which
fields each level requires.

## Step 2 — Read the failure when it fails

A non-zero exit names the cause: `1` is a schema, level, or round-trip failure; `2`
is a usage error (no file given). Schema failures print the exact JSON pointer that
broke, for example `/citations/0/citationRole must be equal to one of the allowed
values` — fix that field and re-run.

## Step 3 — Convert to JSON-LD

Project the document to its machine form. The converter schema-checks the input
first unless you pass `--no-check`:

```bash
node scripts/mif-convert.mjs emit-jsonld your-doc.md
```

## Step 4 — Confirm the round-trip is lossless

Check it explicitly:

```bash
node scripts/mif-convert.mjs roundtrip your-doc.md
```

A `round-trip OK (lossless md<->jsonld)` line confirms no information is lost in
either direction.

## Step 5 — Skip the round-trip only when you must

If you are validating a fragment whose round-trip you do not need, pass
`--no-roundtrip` to `mif-validate` to check schema and level alone. Prefer the full
check for any document you ship (see
[One Artifact, Two Readers](../../explanation/one-artifact-two-readers/) for
why). To author a document from scratch and then validate it, follow the
[validate-and-author how-to](../validate-and-author-a-document/).
