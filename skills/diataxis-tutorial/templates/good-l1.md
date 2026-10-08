---
id: 6ee94237-a5f3-5545-b720-c2b102e186c9
type: procedural
created: 2026-06-29T10:00:00Z
---

# Write Your First MIF Document

By the end of this tutorial you will have authored a valid MIF document and
watched the validator accept it. No prior MIF knowledge is assumed.

## Prerequisites

- Node.js 20+ installed (`node --version` prints a version).
- This repository checked out, with `npm ci` already run.

## Step 1 — Create the file

Create `hello.md`:

```markdown
---
id: f481d5cd-48e2-5cf4-bb85-ea7b06ce1806
type: semantic
created: 2026-06-29T10:00:00Z
---

# Hello, MIF

My first Modeled Information Format document.
```

You should now have `hello.md` in your working directory.

## Step 2 — Hydrate the schema

```bash
npm run hydrate-schema
```

You should see `hydrated MIF schema 1.0.0`.

## Step 3 — Validate

```bash
node scripts/mif-validate.mjs hello.md --level 1
```

You should see `RESULT: VALID at MIF L1`. You just authored a conformant MIF
document.

## Conclusion

Next, read the `mif-frontmatter` reference for the L2 and L3 fields.

<!--
MIF Level 1 (floor): id, type, created + body. good.md climbs to L2 — adding a
namespace, a temporal review cadence (so a machine can tell when the tutorial is
due for review), and a relates-to link to the paired how-to.
-->
