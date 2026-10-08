---
id: 9e3c36be-da5d-5b14-b1f0-d1d58284f9c0
type: procedural
created: '2026-06-30T12:00:00Z'
modified: '2026-06-30T12:00:00Z'
namespace: tutorials/compose-spec-set
title: Compose skills into a feature spec set
tags:
  - tutorial
  - mif-docs
  - feature-spec
  - ears
temporal:
  '@type': TemporalMetadata
  validFrom: '2026-06-30T00:00:00Z'
  ttl: P6M
  recordedAt: '2026-06-30T12:00:00Z'
relationships:
  - type: relates-to
    target: urn:mif:f747abd7-447b-5067-8809-83d9b3b5c22d
  - type: relates-to
    target: urn:mif:138f94bd-3adc-51e0-a23c-fa5ebedb5172
  - type: relates-to
    target: urn:mif:6a9f7095-2d06-51d9-90be-0be973fe887e
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
    citationType: specification
    citationRole: methodology
    title: 'EARS (Easy Approach to Requirements Syntax) — Alistair Mavin'
    url: https://alistairmavin.com/ears/
    accessed: '2026-06-30'
  - '@type': Citation
    citationType: repository
    citationRole: source
    title: 'modeled-information-format/mif-docs-plugin — the genre and substrate skills chained here'
    url: https://github.com/modeled-information-format/mif-docs-plugin
entity:
  name: Compose skills into a feature spec set
  entity_type: tutorial
extensions:
  x-diataxis-quadrant: tutorial
---

# Compose skills into a feature spec set

By the end of this tutorial you will have chained **four skills** on one feature —
turning a rough idea into a build-ready spec a coding agent can act on. You will
see how genre skills and substrate skills compose: `feature-spec` for the spec
body, `ears-acceptance-criteria` for testable criteria inside it,
`ai-architecture-doc` for the design it depends on, and `mif-validate` to prove
each artifact conformant. The running example is **"a CSV export endpoint"**;
substitute your own feature.

This is the `ai-spec` recipe done by hand, so you understand what the
[planner orchestrates](../orchestrate-a-doc-set-with-the-planner/) for you.

## Prerequisites

- The **mif-docs** plugin installed (see the [getting-started tutorial](../getting-started/)).
- Node.js (current LTS) on your `PATH`.

## Step 1 — Write the feature spec

Invoke the `feature-spec` skill on the feature. It produces a lightweight,
AI-ready specification — an Overview, EARS acceptance criteria, a Design section,
and Edge Cases:

```text
/feature-spec a CSV export endpoint for the reports table
```

The result is a single short document (~500–2000 tokens) an implementer can act on
directly. Keep it open — the next step fills in its acceptance criteria.

## Step 2 — Make the criteria testable with EARS

A spec's acceptance criteria are only useful if a human and an agent grade them
identically. The `ears-acceptance-criteria` substrate skill turns each loose
requirement into one of the five EARS patterns:

- **Ubiquitous** — *The export SHALL produce RFC 4180 CSV.*
- **Event-driven** — *WHEN a user requests an export, the system SHALL stream the rows.*
- **State-driven** — *WHILE an export is running, the system SHALL reject a second request.*
- **Unwanted behaviour** — *IF the table exceeds 1M rows, THEN the system SHALL paginate.*
- **Optional feature** — *WHERE compression is enabled, the system SHALL gzip the stream.*

Rewrite each criterion in your `feature-spec` using these forms. Now every line is
gradeable.

## Step 3 — Add the architecture the spec depends on

A feature spec says *what*; the `ai-architecture-doc` skill says *how* in a form a
coding agent consumes — an arc42/C4-style structure plus testable non-functional
requirements and an ADR-style decision log, all in one spec-channel artifact:

```text
/ai-architecture-doc the export subsystem behind the CSV export endpoint
```

In the feature spec's frontmatter, record the dependency as a typed edge so the
two documents form a graph:

```yaml
relationships:
  - type: depends-on
    target: urn:mif:ai-architecture-export-subsystem
```

This is the `ai-spec` recipe's cross-link contract: the feature spec
`depends-on` the architecture doc.

## Step 4 — Validate the whole set

Prove each artifact is conformant and that the round-trip is lossless:

```bash
node scripts/mif-validate.mjs feature-spec.md --level 2
node scripts/mif-validate.mjs ai-architecture-doc.md --level 3
```

Both should report `VALID`. The feature spec validates at L2 (its target level);
the architecture doc at L3.

## Conclusion

You composed two genre skills (`feature-spec`, `ai-architecture-doc`) with two
substrate concerns (EARS criteria, MIF validation) into one connected spec set,
and recorded the dependency between them as a typed relationship. That is exactly
what the `ai-spec` recipe automates — to have the planner build and reconcile a set
like this for you, follow the
[planner orchestration tutorial](../orchestrate-a-doc-set-with-the-planner/). To
look up any skill used here in depth, start at the
[skills by purpose](../../reference/skills-by-purpose/) catalog.
