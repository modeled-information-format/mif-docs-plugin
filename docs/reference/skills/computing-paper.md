---
id: 08e1d463-f6d5-5f7c-83d6-01f61109a39b
type: semantic
created: '2026-07-01T00:00:00Z'
modified: '2026-07-01T00:00:00Z'
namespace: reference/skills
title: 'Skill reference: computing-paper'
tags:
  - reference
  - mif-docs
  - skill
  - computing-paper
  - research
temporal:
  '@type': TemporalMetadata
  validFrom: '2026-07-01T00:00:00Z'
  recordedAt: '2026-07-01T00:00:00Z'
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
    - '@id': urn:mif:skill:computing-paper
      '@type': prov:Entity
citations:
  - '@type': Citation
    citationType: specification
    citationRole: methodology
    title: 'ACM Primary Article Template (acmart)'
    url: https://www.acm.org/publications/proceedings-template
    accessed: '2026-07-01'
  - '@type': Citation
    citationType: tool
    citationRole: source
    title: 'mif-docs — computing-paper skill (SKILL.md)'
    url: https://github.com/modeled-information-format/mif-docs-plugin/tree/main/skills/computing-paper
relationships:
  - type: relates-to
    target: urn:mif:d8972202-0b4d-52ea-89d7-90abe228e820
  - type: relates-to
    target: urn:mif:d60dba7d-ef07-5ed0-a013-1b0b5e9b1ace
ontology:
  '@type': OntologyReference
  id: mif-docs
  version: 1.0.0
  uri: https://mif-spec.dev/ontologies/mif-docs
entity:
  name: 'Skill reference: computing-paper'
  entity_type: reference-document
extensions:
  x-skill: computing-paper
  x-genre-conceptType: semantic
  x-target-level: 3
  x-purpose-group: scholarly-writing
---

# Skill reference: `computing-paper`

The `computing-paper` skill authors one document genre: an **ACM/IEEE
computing conference or journal paper** — a formal systems/engineering
research write-up built around a described approach or system and an
explicit, falsifiable Evaluation section, cited with IEEE numbered bracket
citations. This reference describes what that document type is, how the
skill produces one, when it earns its place, and the provenance behind it.

| Property | Value |
| --- | --- |
| Authors | An ACM/IEEE computing conference or journal paper |
| Purpose group | Scholarly writing |
| MIF `conceptType` | `semantic` |
| Target MIF level | 3 |
| Primary source | [ACM Primary Article Template (acmart)](https://www.acm.org/publications/proceedings-template) |

## What this document type is

A computing paper is a formal research write-up aimed at program-committee
reviewers and practitioners, structured around Abstract, Introduction,
Related Work, Approach/System Design, Evaluation, Discussion, Conclusion &
Future Work, and a numbered References list. Its defining trait is that its
**center of gravity is the Evaluation** — the paper earns its Conclusion from
what the Evaluation actually shows (experimental setup, baselines, metrics,
results), not from an asserted claim stated up front. Front matter also
carries CCS Concepts and keywords/index terms, the indexing matter an
ACM/IEEE venue requires. Citations are IEEE numbered brackets (`[1]`, `[2]`),
never author-date, and every factual or measured claim traces to a numbered
reference; an uncited claim is a defect.

This is distinct from the APA/IMRaD empirical-paper structure with
author-date citations (`academic`), from a practitioner decision report whose
mandatory matter is an options-vs-criteria Trade-offs table with no CCS
Concepts and no Evaluation section (an [engineering](../engineering/) report),
and from an informal pre-build alignment narrative (a
[google-design-doc](../google-design-doc/)). It is therefore reasoned,
evidence-backed research knowledge, and projects to MIF as `semantic` content
at Level 3.

## How the skill produces one

`computing-paper` is a genre skill: it carries the ACM/IEEE paper pattern as
durable instructions plus exemplars, and writes the artifact over a MIF floor
so the result is at once a human-readable paper and a machine-conformant
unit.

- **Pattern, made operational.** The skill encodes the eight-section shape
  and treats the Evaluation section as load-bearing — experimental setup,
  baselines, metrics, and results, never collapsed into a paragraph of
  unsupported assertions — plus the CCS Concepts/keywords front matter and
  IEEE numbered citation discipline, anchored to the current ACM `acmart` and
  IEEE `IEEEtran` conventions.
- **Exemplars set the bar.** Like every genre in the suite it ships
  `good-l1.md` (the MIF Level-1 floor), `good.md` (the Level-3 target),
  `bad.md` (a counter-example with no Evaluation section and no citations
  anywhere), and `evals/evals.json`. The `check-exemplars` gate proves
  `good-l1.md` validates at L1 and `good.md` at Level 3.
- **MIF projection.** The document is authored with MIF frontmatter (via the
  shared `mif-frontmatter` substrate) and a `conceptType` of `semantic`, with
  `citations[]` tied to each Evaluation claim and typed `relationships[]` to
  work the paper relates to or that later operationalizes it. `mif-validate`
  proves the Markdown ↔ JSON-LD round-trip is lossless.

## When it is beneficial

Reach for `computing-paper` when the deliverable is a **systems or computing
research paper targeting an ACM or IEEE program committee** — the Evaluation
section is the artifact's reason to exist, and every option, baseline, or
prior system must get a fair, neutral description in Related Work before
Evaluation judges it against the proposed approach. It rewards honesty about
limitations and threats to validity: an undiscussed weakness is a defect, not
an omission.

Do **not** use it for an empirical paper following APA/IMRaD with author-date
citations — that is `academic`. Do not use it for a practitioner
decision/evaluation report whose mandatory matter is an options-vs-criteria
Trade-offs table, with no CCS Concepts and no formal Evaluation section — that
is [engineering](../engineering/). Do not use it for an informal pre-build
alignment narrative — that is `google-design-doc`.

## Example

A computing paper titled *"Adaptive Batching for Low-Latency LLM Inference on
Heterogeneous GPU Clusters"* presents ABS, a request scheduler that resizes
batches per inference step from live queue-depth and sequence-length signals
and routes each batch to the GPU generation whose compute/memory-bandwidth
ratio best fits it. Related Work situates ABS against efficient-attention
kernels (FlashAttention-2 `[1]`), sparse mixture-of-experts routing (Mixtral
`[2]`), and prior single-generation sharding work (`[3]`), crediting each
while showing what it does not address. The Evaluation deploys ABS on a mixed
8×A100/8×H100 cluster serving a Mixtral-class model against a fixed-batch
baseline, reporting p50/p99 latency and throughput in a results table: a 34%
p99 latency reduction and a 21% throughput increase. The Discussion states the
limits honestly — a single workload trace and model family, and no comparison
against continuous-batching schedulers — before Conclusion & Future Work
names the follow-up experiments that would isolate the routing contribution.

## Provenance & citations

- **Genre source — ACM/IEEE authoring conventions:** the ACM Primary Article
  Template (`acmart`) and IEEE `IEEEtran` conventions that define the
  section structure, CCS Concepts/keywords front matter, and numbered
  citation style,
  <https://www.acm.org/publications/proceedings-template>.
- **Skill provenance:** authored by the `computing-paper` skill in the
  mif-docs plugin, <https://github.com/modeled-information-format/mif-docs-plugin>;
  the skill's exemplars and `evals/` define and verify the pattern.
- **MIF conformance:** the document projects to canonical JSON-LD under the
  MIF specification, <https://mif-spec.dev>, and is proven lossless by
  `mif-validate`.
- **Index:** this skill is one entry in the [skills by purpose](../../skills-by-purpose/)
  catalog; its closest sibling by adjacent evidentiary discipline is
  [engineering](../engineering/).
