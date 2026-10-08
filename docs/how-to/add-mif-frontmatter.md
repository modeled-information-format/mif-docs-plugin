---
id: 863330a0-a451-5c64-a9d3-1ee1147c06a2
type: procedural
created: '2026-06-30T12:00:00Z'
modified: '2026-06-30T12:00:00Z'
namespace: how-to/frontmatter
title: How to add MIF frontmatter to a document
tags:
  - how-to
  - mif-docs
  - mif-frontmatter
temporal:
  '@type': TemporalMetadata
  validFrom: '2026-06-30T00:00:00Z'
  recordedAt: '2026-06-30T12:00:00Z'
  ttl: P1Y
relationships:
  - type: relates-to
    target: urn:mif:13ddfe21-b287-5589-82d9-d9eb8f954f8a
  - type: relates-to
    target: urn:mif:776e28a8-7fd8-5a5d-b477-efde9b5358cc
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
    - '@id': https://mif-spec.dev
      '@type': prov:Entity
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
    title: 'JSON-LD 1.1 (W3C Recommendation) — the canonical form MIF frontmatter projects to'
    url: https://www.w3.org/TR/json-ld11/
    accessed: '2026-06-30'
  - '@type': Citation
    citationType: repository
    citationRole: source
    title: 'modeled-information-format/mif-docs-plugin — the mif-frontmatter skill'
    url: https://github.com/modeled-information-format/mif-docs-plugin
entity:
  name: Add MIF frontmatter to a document
  entity_type: how-to-guide
extensions:
  x-diataxis-quadrant: how-to
---

# How to add MIF frontmatter to a document

This guide adds MIF-conformant frontmatter to a document you are already writing,
climbing from the Level-1 floor to Level 2 or 3 only as far as your real detail
supports. It assumes you have a document body and want it to project losslessly to
canonical JSON-LD. For the full description of the skill, see the
[mif-frontmatter reference](../../reference/skills/mif-frontmatter/).

## Step 1 — Lay the Level-1 floor

Every MIF document needs three fields. Add them at the top of the file:

```yaml
---
id: how-to-rotate-credentials
type: procedural
created: 2026-06-30T12:00:00Z
---
```

`id` is a stable slug, `type` is the conceptType (`semantic`, `episodic`, or
`procedural`), and `created` is an ISO-8601 timestamp. This is L1 — enough to
validate and to round-trip.

## Step 2 — Climb to Level 2 when you have temporal context

Add `namespace`, `modified`, and a `temporal` block when the document has a place
in a corpus and a record time:

```yaml
namespace: how-to/security
modified: 2026-06-30T12:00:00Z
temporal:
  '@type': TemporalMetadata
  validFrom: 2026-06-30T00:00:00Z
  recordedAt: 2026-06-30T12:00:00Z
  ttl: P1Y
```

## Step 3 — Climb to Level 3 when you can attest provenance

Add a `provenance` block (with `temporal.validFrom` present) when you can state
where the knowledge came from and who attributed it. Do **not** fabricate these to
reach a level — only add provenance you can stand behind:

```yaml
provenance:
  '@type': Provenance
  sourceType: agent_inferred
  trustLevel: high_confidence
  agent: anthropic/claude-code
```

## Step 4 — Add citations and relationships

Record your sources as `citations[]` and your links to other documents as typed
`relationships[]` edges. These are what make the document a node in a graph rather
than an island:

```yaml
relationships:
  - type: relates-to
    target: urn:mif:d8972202-0b4d-52ea-89d7-90abe228e820
```

## Step 5 — Prove it conforms

Validate at the level you climbed to:

```bash
node scripts/mif-validate.mjs your-doc.md --level 2
```

A `VALID` result with a lossless round-trip confirms the frontmatter projects
cleanly. To author the body and convert it between forms, follow the
[validate-and-author how-to](../validate-and-author-a-document/).
