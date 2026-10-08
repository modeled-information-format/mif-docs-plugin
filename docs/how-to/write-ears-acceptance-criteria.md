---
id: e8769e7c-6493-5f79-b68a-9965cbef28dc
type: procedural
created: '2026-06-30T12:00:00Z'
modified: '2026-06-30T12:00:00Z'
namespace: how-to/ears
title: How to write EARS acceptance criteria
tags:
  - how-to
  - mif-docs
  - ears
  - requirements
temporal:
  '@type': TemporalMetadata
  validFrom: '2026-06-30T00:00:00Z'
  recordedAt: '2026-06-30T12:00:00Z'
  ttl: P1Y
relationships:
  - type: relates-to
    target: urn:mif:6a9f7095-2d06-51d9-90be-0be973fe887e
  - type: relates-to
    target: urn:mif:9e3c36be-da5d-5b14-b1f0-d1d58284f9c0
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
    - '@id': https://alistairmavin.com/ears/
      '@type': prov:Entity
citations:
  - '@type': Citation
    citationType: specification
    citationRole: methodology
    title: 'EARS (Easy Approach to Requirements Syntax) — Alistair Mavin, the canonical patterns'
    url: https://alistairmavin.com/ears/
    accessed: '2026-06-30'
  - '@type': Citation
    citationType: article
    citationRole: background
    title: 'Mavin, Wilkinson, Harwood, Novak — "EARS", 17th IEEE Requirements Engineering Conf. (RE2009), pp. 317–322'
    url: https://research.manchester.ac.uk/en/publications/easy-approach-to-requirements-syntax-ears/
    accessed: '2026-06-30'
  - '@type': Citation
    citationType: repository
    citationRole: source
    title: 'modeled-information-format/mif-docs-plugin — the ears-acceptance-criteria skill'
    url: https://github.com/modeled-information-format/mif-docs-plugin
entity:
  name: Write EARS acceptance criteria
  entity_type: how-to-guide
extensions:
  x-diataxis-quadrant: how-to
---

# How to write EARS acceptance criteria

This guide turns a loose requirement into an acceptance criterion in EARS notation
— the Easy Approach to Requirements Syntax — so a human and an agent grade it
identically. Use it whenever you are writing criteria for a PRD, feature spec,
architecture doc, ADR decision driver, or Kiro requirements document. For the full
description of the skill, see the
[ears-acceptance-criteria reference](../../reference/skills/ears-acceptance-criteria/).

## Step 1 — Identify the trigger type

Each EARS clause is chosen by *when* the behaviour applies. Classify your
requirement into one of five patterns:

- **Ubiquitous** — always true, no precondition.
- **Event-driven** — triggered by an event (`WHEN`).
- **State-driven** — holds during a state (`WHILE`).
- **Unwanted behaviour** — guards against a condition (`IF` … `THEN`).
- **Optional feature** — applies only where a feature is present (`WHERE`).

## Step 2 — Write the clause in the matching template

Fill the template for your pattern. The system response always uses `SHALL`:

```text
Ubiquitous:        The <system> SHALL <response>.
Event-driven:      WHEN <trigger>, the <system> SHALL <response>.
State-driven:      WHILE <state>, the <system> SHALL <response>.
Unwanted:          IF <condition>, THEN the <system> SHALL <response>.
Optional feature:  WHERE <feature>, the <system> SHALL <response>.
```

For example, *"exports should be rejected while one is already running"* becomes:
*WHILE an export is running, the system SHALL reject a new export request.*

## Step 3 — Make it gradeable

A criterion is only useful if both a person and a parser can decide pass or fail
from it alone. Check each clause has exactly one observable response and no
ambiguity ("fast", "robust", "as needed" fail this test). Split compound clauses
into one EARS statement each.

## Step 4 — Place the criteria in the host document

Drop the finished clauses into the acceptance-criteria section of the host genre.
In a `feature-spec` or `prd` they sit under the requirement they refine; in
`kiro-requirements` they follow each numbered user story. The
[compose-a-spec-set tutorial](../../tutorials/compose-skills-into-a-spec-set/)
shows this in a full worked example.

## Step 5 — Validate the host document

EARS criteria are plain text inside a MIF document, so validation is the host
document's own gate:

```bash
node scripts/mif-validate.mjs feature-spec.md --level 2
```

A `VALID` result confirms the document — criteria included — projects losslessly to
JSON-LD.
