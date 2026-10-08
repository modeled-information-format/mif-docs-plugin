---
id: 6ee94237-a5f3-5545-b720-c2b102e186c9
type: procedural
created: '2026-06-29T10:00:00Z'
modified: '2026-06-29T10:00:00Z'
namespace: tutorials/getting-started
title: Write Your First MIF Document
tags:
  - tutorial
  - mif
  - getting-started
temporal:
  '@type': TemporalMetadata
  validFrom: '2026-06-29T00:00:00Z'
  ttl: P6M
  recordedAt: '2026-06-29T10:00:00Z'
relationships:
  - type: relates-to
    target: /how-to/convert-markdown-to-mif.md
ontology:
  '@type': OntologyReference
  id: mif-docs
  version: 1.0.0
  uri: https://mif-spec.dev/ontologies/mif-docs
entity:
  name: Write Your First MIF Document
  entity_type: tutorial
---

# Write Your First MIF Document

By the end of this tutorial you will have authored a valid MIF document and
watched the validator accept it. No prior MIF knowledge is assumed.

## Prerequisites

- Node.js 20+ installed (`node --version` prints a version).
- This repository checked out, with `npm ci` already run.

## Step 1 — Create the file

Create `hello.md` with this content:

```markdown
---
id: hello-mif
type: semantic
created: 2026-06-29T10:00:00Z
---

# Hello, MIF

My first Modeled Information Format document.
```

You should now have a file `hello.md` in your working directory.

## Step 2 — Hydrate the schema

Run:

```bash
npm run hydrate-schema
```

You should see `hydrated MIF schema 1.0.0`. The validator now has the canonical
schema available.

## Step 3 — Validate your document

Run:

```bash
node scripts/mif-validate.mjs hello.md --level 1
```

You should see `RESULT: VALID at MIF L1`. You just authored a conformant MIF
document.

## Conclusion

You created a MIF document and confirmed it passes the deterministic gate. Next,
read the `mif-frontmatter` reference to learn the L2 and L3 fields, or follow the
how-to for converting an existing markdown file into MIF.
