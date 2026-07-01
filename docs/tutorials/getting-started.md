---
id: tutorial-getting-started
type: procedural
created: '2026-06-30T10:00:00Z'
modified: '2026-06-30T10:00:00Z'
namespace: tutorials/getting-started
title: Get Started with mif-docs
tags:
  - tutorial
  - mif-docs
  - getting-started
temporal:
  '@type': TemporalMetadata
  validFrom: '2026-06-30T00:00:00Z'
  ttl: P6M
  recordedAt: '2026-06-30T10:00:00Z'
relationships:
  - type: relates-to
    target: urn:mif:how-to-validate-and-author
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
    - '@id': https://diataxis.fr/tutorials/
      '@type': prov:Entity
citations:
  - '@type': Citation
    citationType: documentation
    citationRole: methodology
    title: 'Diátaxis — Tutorials: the learning-oriented quadrant this getting-started follows'
    url: https://diataxis.fr/tutorials/
    accessed: '2026-06-30'
  - '@type': Citation
    citationType: repository
    citationRole: source
    title: 'modeled-information-format/mif-docs-plugin — the plugin README and scripts this tutorial walks through'
    url: https://github.com/modeled-information-format/mif-docs-plugin
entity:
  name: Get Started with mif-docs
  entity_type: tutorial
extensions:
  x-diataxis-quadrant: tutorial
---

# Get Started with mif-docs

By the end of this tutorial you will have installed the **mif-docs** plugin,
authored your first MIF document, and watched the plugin's own validator accept
it and its fail-closed guard let it through. No prior MIF knowledge is assumed —
you learn by doing, and you finish with one document that demonstrably passes.

## Prerequisites

- Claude Code installed, with the `claude` command on your `PATH`.
- Node.js 20+ installed (`node --version` prints a version) — the validator runs
  on Node.

## Step 1 — Install the plugin from the org marketplace

Add the marketplace, then install the plugin:

```bash
claude plugin marketplace add modeled-information-format/claude-code-plugins
claude plugin install mif-docs@modeled-information-format
```

You now have **mif-docs v0.2.0** available, which ships 20 genre skills, three
substrate skills, and the `doc-set-planner`. The install also registers the
PostToolUse guard you will meet in Step 4.

## Step 2 — Author your first MIF document

Create a file `my-first-howto.md` with this content. It is a tiny, real how-to —
a genre document with the MIF frontmatter floor on top:

```markdown
---
id: how-to-clear-the-cache
type: procedural
created: 2026-06-30T10:00:00Z
---

# How to Clear the Build Cache

Remove stale build artifacts so the next build starts clean.

## Step 1 — Delete the cache directory

Run `rm -rf ./.cache` from the project root. The directory is recreated on the
next build.
```

The three frontmatter fields — `id`, `type`, and `created` — are the MIF Level 1
floor. `type: procedural` is the conceptType every how-to and tutorial carries.

## Step 3 — Validate it and watch mif-validate pass

Run the plugin's deterministic validator against your file:

```bash
node scripts/mif-validate.mjs my-first-howto.md --level 1
```

You should see a final line reading `RESULT: VALID at MIF L1`, noting that the
document is schema-conformant and its round-trip is lossless. There is no
language model in that verdict — it is the canonical schema plus a lossless
markdown↔JSON-LD round-trip. Identical input yields an identical answer every time.

## Step 4 — See the guard accept it

The plugin registers a PostToolUse hook that re-validates any genre document the
moment it is written or edited. A document that fails `mif-validate --level 1`
makes the guard exit 2 and **blocks** the write. Because the document you just
authored is conformant, the guard lets it through silently — no error, the file
is saved. That silence is the success signal: the gate ran and accepted your work.

## Conclusion

You installed mif-docs, authored a conformant MIF how-to, saw the deterministic
validator pass it, and confirmed the fail-closed guard accepts it. To turn this
into a repeatable workflow — validating any document and converting it to
JSON-LD — follow the how-to guide. To look up every genre, recipe, and script,
consult the catalog reference. To understand *why* each document is both a human
artifact and a machine unit, read the explanation. All three are recorded as
typed `relates-to` edges in this tutorial's `relationships[]`.
