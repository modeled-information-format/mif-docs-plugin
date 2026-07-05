---
id: reference-skill-doc-set-planner
type: semantic
created: '2026-06-30T12:00:00Z'
modified: '2026-07-05T12:00:00Z'
namespace: reference/skills
title: 'Skill reference: doc-set-planner'
tags:
  - reference
  - mif-docs
  - skill
  - orchestrator
  - doc-set
temporal:
  '@type': TemporalMetadata
  validFrom: '2026-06-30T00:00:00Z'
  recordedAt: '2026-06-30T12:00:00Z'
  ttl: P1Y
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
    - '@id': urn:mif:skill:doc-set-planner
      '@type': prov:Entity
citations:
  - '@type': Citation
    citationType: specification
    citationRole: methodology
    title: MIF — Modeled Information Format specification
    url: https://mif-spec.dev
    accessed: '2026-06-30'
  - '@type': Citation
    citationType: specification
    citationRole: background
    title: Diátaxis — a systematic framework for technical documentation
    url: https://diataxis.fr/
    accessed: '2026-06-30'
  - '@type': Citation
    citationType: tool
    citationRole: source
    title: 'mif-docs — doc-set-planner skill (SKILL.md)'
    url: https://github.com/modeled-information-format/mif-docs-plugin/tree/main/skills/doc-set-planner
relationships:
  - type: relates-to
    target: urn:mif:reference-skills-by-purpose
  - type: relates-to
    target: urn:mif:reference-skill-mif-frontmatter
  - type: relates-to
    target: urn:mif:reference-skill-ears-acceptance-criteria
  - type: relates-to
    target: urn:mif:reference-skill-mif-validate
  - type: relates-to
    target: urn:mif:reference-skill-mif-corpus
ontology:
  '@type': OntologyReference
  id: mif-docs
  version: 1.0.0
  uri: https://mif-spec.dev/ontologies/mif-docs
entity:
  name: 'Skill reference: doc-set-planner'
  entity_type: reference-document
extensions:
  x-skill: doc-set-planner
  x-genre-conceptType: orchestrator
  x-target-level: 3
  x-purpose-group: orchestrator
---

# Skill reference: `doc-set-planner`

The `doc-set-planner` skill is the suite's **orchestrator**: it does not author a
single genre, it decomposes a broad subject into a coordinated SET of MIF
documents, fans out to the member genre skills, and reconciles the cross-document
relationship graph. This reference describes what it produces, how, when, and
from what sources.

| Property | Value |
| --- | --- |
| Authors | A coordinated, cross-linked set of MIF documents |
| Purpose group | Orchestrator |
| MIF `conceptType` | `orchestrator` |
| Target MIF level | 3 |
| Primary source | [MIF specification](https://mif-spec.dev) |

## What this document type is

A single genre skill answers a single-document request. Many real requests —
"document the auth system", "produce the full spec set for feature X" — span
several documents that must agree with one another. `doc-set-planner` is the skill
for that altitude: it plans the *set*, decides which genres compose it, delegates
each member to its genre skill, and then proves the members are wired together
into one MIF relationship graph rather than a pile of disconnected files.

It works from one of four **recipes**, each a named decomposition of a subject
into a coherent set.

| Recipe | Produces |
| --- | --- |
| diataxis | The four Diátaxis quadrants — tutorial, how-to, reference, explanation |
| ai-spec | An AI-ready spec — feature spec plus an AI-architecture doc and EARS criteria |
| kiro | The AWS Kiro three-document set — requirements.md, design.md, tasks.md |
| architecture | An architecture set — arc42 and/or C4 with an ADR decision log |

Singleton genres — an ADR, a changelog, an SRE runbook, a playbook, a Rust RFC, a
Python PEP, a Google design doc — stand alone and are invoked directly, not
through the planner.

## How the skill produces one

`doc-set-planner` carries the recipes and the reconciliation procedure as durable
instructions, and runs a three-phase flow.

- **Fan-out.** The planner selects a recipe, expands it into the list of member
  documents, and delegates each to its genre skill — for example dispatching the
  diataxis recipe to the four quadrant skills. Each member is authored over the
  shared [mif-frontmatter](../mif-frontmatter/) floor, with criteria shaped by
  [ears-acceptance-criteria](../ears-acceptance-criteria/) where the genre uses
  them. When a semantic corpus exists (the optional
  [mif-corpus](../mif-corpus/) layer), the plan first searches it per member
  and surfaces strong hits as existing-coverage decisions — extend the found
  doc or create and cross-link it — with scores and ids shown.
- **Reconcile.** Once the members exist, the planner resolves the cross-document
  `relationships[]` graph — declaring how each document references, supports, or
  derives from the others — so the set reads as one connected body of knowledge.
  With a corpus available, find-similar results per member are offered as
  *candidate* additional targets; candidates are accepted or rejected by the
  author, never written silently, and the recipe's contract stays
  authoritative.
- **Link-completeness.** A `planner-check` gate asserts the graph is complete:
  every intended relationship is present and every target resolves, with no
  dangling references. Each member is then proven conformant by
  [mif-validate](../mif-validate/). The gate is deliberately
  corpus-independent: it checks the declared graph, never similarity, so
  planner verdicts are byte-identical with or without the optional tooling.

## When it is beneficial

Reach for `doc-set-planner` when a request is plural — when the deliverable is a
set whose documents must cross-reference and not contradict each other. The value
is coordination: the planner guarantees coverage of the recipe's quadrants and a
complete, validated relationship graph, which hand-assembling separate documents
rarely achieves.

Do not use it for a single artifact: a lone decision belongs to the
[adr](../adr/) skill, a lone procedure to a runbook, a lone release record to a
changelog. Invoking the orchestrator for one document adds planning overhead with
no set to coordinate. Match the altitude of the skill to the altitude of the
request.

## Example

A request to "document the auth system" runs the architecture recipe: the planner
fans out an arc42 document and a C4 model, delegates the key decisions to ADRs,
reconciles their `relationships[]` so the C4 components reference the arc42
building blocks and the ADRs, and runs `planner-check` to confirm the graph is
complete before the set is published.

## Provenance & citations

- **Genre source — MIF and Diátaxis:** the relationship graph and conformance
  model come from the MIF specification, <https://mif-spec.dev>; the diataxis
  recipe follows the Diátaxis framework, <https://diataxis.fr/>.
- **Skill provenance:** authored by the `doc-set-planner` skill in the mif-docs
  plugin, <https://github.com/modeled-information-format/mif-docs-plugin>; its
  `planner-check` gate proves link-completeness.
- **MIF conformance:** every member set and this document project to canonical
  JSON-LD, proven lossless by [mif-validate](../mif-validate/).
- **Index:** one entry in the [skills by purpose](../../skills-by-purpose/)
  catalog; the helpers it orchestrates are [mif-frontmatter](../mif-frontmatter/),
  [ears-acceptance-criteria](../ears-acceptance-criteria/), and
  [mif-validate](../mif-validate/).
