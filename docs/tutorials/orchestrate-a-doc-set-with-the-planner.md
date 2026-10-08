---
id: f747abd7-447b-5067-8809-83d9b3b5c22d
type: procedural
created: '2026-06-30T12:00:00Z'
modified: '2026-06-30T12:00:00Z'
namespace: tutorials/orchestrate-doc-set
title: Orchestrate a documentation set with the planner
tags:
  - tutorial
  - mif-docs
  - doc-set-planner
  - orchestration
temporal:
  '@type': TemporalMetadata
  validFrom: '2026-06-30T00:00:00Z'
  ttl: P6M
  recordedAt: '2026-06-30T12:00:00Z'
relationships:
  - type: relates-to
    target: urn:mif:febcf412-08e4-5822-b8a4-00a3e805fa30
  - type: relates-to
    target: urn:mif:9e3c36be-da5d-5b14-b1f0-d1d58284f9c0
  - type: relates-to
    target: urn:mif:f8d4c638-fac3-5c75-b314-c7a5f047a81d
  - type: relates-to
    target: urn:mif:d8972202-0b4d-52ea-89d7-90abe228e820
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
    title: 'Diátaxis — Tutorials: the learning-oriented quadrant this lesson follows'
    url: https://diataxis.fr/tutorials/
    accessed: '2026-06-30'
  - '@type': Citation
    citationType: repository
    citationRole: source
    title: 'modeled-information-format/mif-docs-plugin — the doc-set-planner skill and its recipes'
    url: https://github.com/modeled-information-format/mif-docs-plugin
entity:
  name: Orchestrate a documentation set with the planner
  entity_type: tutorial
extensions:
  x-diataxis-quadrant: tutorial
---

# Orchestrate a documentation set with the planner

By the end of this tutorial you will have used the `doc-set-planner` skill to turn
**one subject** into a **coordinated set** of four linked documents, and proven
the set is link-complete. You will not author each document by hand — you will
watch the planner decompose the subject, fan out to the member genre skills, and
reconcile the cross-document graph. No prior MIF knowledge is assumed beyond the
[getting-started tutorial](../getting-started/).

## Prerequisites

- The **mif-docs** plugin installed (see the [getting-started tutorial](../getting-started/)).
- Node.js (current LTS) on your `PATH` — the validators run on Node.
- A subject to document. This lesson uses **"the project's rate limiter"** as the
  running example; substitute your own.

## Step 1 — Choose a recipe for your subject

The planner does not invent structure; it loads a declarative **recipe** that
names the member documents and the links between them. Four recipes ship:

| Recipe | Members | Use it when the subject is… |
| --- | --- | --- |
| `diataxis` | tutorial, how-to, reference, explanation | a feature users must learn, use, look up, and understand |
| `ai-spec` | feature-spec, ai-architecture-doc | a feature a coding agent will build from a spec |
| `kiro` | kiro-requirements, kiro-design, kiro-tasks | a feature run through the AWS Kiro workflow |
| `architecture` | arc42-arch-doc, c4-model-diagram | a system whose structure must be communicated |

For a user-facing feature like the rate limiter, the `diataxis` recipe is the
right fit: users need to learn it, perform tasks with it, look up its limits, and
understand why it exists.

## Step 2 — Run the planner

Invoke the orchestrator on your subject and recipe:

```text
/doc-set-planner the project's rate limiter --recipe diataxis
```

The planner runs its five-step engine: **scope** (load the `diataxis` recipe),
**plan** (decompose the subject into the four member documents and a shared MIF
namespace), **fan-out** (invoke `diataxis-tutorial`, `diataxis-how-to`,
`diataxis-reference`, and `diataxis-explanation`, each on its slice), and
**reconcile** (wire the cross-document `relationships[]` graph so each mode links
its siblings), and **validate** (every member passes its own acceptance check and
the set is proven link-complete, the subject of steps 4 and 5 below). It emits a
plan first — read it before the members are written.

## Step 3 — Inspect the reconciled relationship graph

Each produced member carries typed `relates-to` edges to the others. Open any
member and look at its frontmatter `relationships[]`: the tutorial points at the
how-to, reference, and explanation; the reference points back; and so on. This is
the planner's reconciliation step made concrete — the set is a graph, not four
unrelated files.

## Step 4 — Prove the set is link-complete

The planner's final guarantee is **link-completeness**: every declared
cross-`relationships[]` target resolves to a document the run actually produced —
no dangling edges. Verify it:

```bash
node scripts/planner-check.mjs diataxis
```

A `0` exit with `link-complete` for the recipe means the graph closes. Run it with
no argument to check every recipe under `skills/doc-set-planner/recipes/`.

## Step 5 — Validate every member

Link-completeness checks the graph; `mif-validate` checks each document. Validate
the members at their target levels (tutorial and how-to at L2, reference and
explanation at L3):

```bash
node scripts/mif-validate.mjs rate-limiter-tutorial.md --level 2   # tutorial, how-to
node scripts/mif-validate.mjs rate-limiter-reference.md --level 3  # reference, explanation
```

Each should report `VALID` with a lossless round-trip. When the set is both
link-complete and per-member valid, the orchestration is done.

## Conclusion

You turned one subject into a coordinated, link-complete Diátaxis set without
hand-assembling it: the planner scoped a recipe, decomposed the subject, fanned
out to the four member skills, and reconciled the graph, and you proved the result
with `planner-check` and `mif-validate`. To chain skills across channels rather
than within one Diátaxis set, follow the
[compose-a-spec-set tutorial](../compose-skills-into-a-spec-set/). For the full
description of the orchestrator, see the
[doc-set-planner reference](../../reference/skills/doc-set-planner/).
