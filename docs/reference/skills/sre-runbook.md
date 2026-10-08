---
id: 3fd7e825-3ebb-524e-a04d-3405076d2c0e
type: semantic
created: '2026-06-30T12:00:00Z'
modified: '2026-06-30T12:00:00Z'
namespace: reference/skills
title: 'Skill reference: sre-runbook'
tags:
  - reference
  - mif-docs
  - skill
  - sre
  - runbook
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
    - '@id': urn:mif:skill:sre-runbook
      '@type': prov:Entity
citations:
  - '@type': Citation
    citationType: book
    citationRole: methodology
    title: 'Google SRE Book — Table of Contents (Ch. 11, Being On-Call)'
    url: https://sre.google/sre-book/table-of-contents/
    accessed: '2026-06-30'
  - '@type': Citation
    citationType: tool
    citationRole: source
    title: 'mif-docs — sre-runbook skill (SKILL.md)'
    url: https://github.com/modeled-information-format/mif-docs-plugin/tree/main/skills/sre-runbook
relationships:
  - type: relates-to
    target: urn:mif:d8972202-0b4d-52ea-89d7-90abe228e820
  - type: relates-to
    target: urn:mif:372f597f-531c-532b-903f-a0b886d70d6c
ontology:
  '@type': OntologyReference
  id: mif-docs
  version: 1.0.0
  uri: https://mif-spec.dev/ontologies/mif-docs
entity:
  name: 'Skill reference: sre-runbook'
  entity_type: reference-document
extensions:
  x-skill: sre-runbook
  x-genre-conceptType: procedural
  x-target-level: 2
  x-purpose-group: operations
---

# Skill reference: `sre-runbook`

The `sre-runbook` skill authors one document genre: an **SRE operational
runbook** — a tactical, step-by-step procedure for one specific alert. This
reference describes what that document type is, how the skill produces one, when
it earns its place, and the provenance and sources behind it.

| Property | Value |
| --- | --- |
| Authors | A tactical step-by-step runbook for one alert |
| Purpose group | Operations |
| MIF `conceptType` | `procedural` |
| Target MIF level | 2 |
| Primary source | [Google SRE Book — Table of Contents](https://sre.google/sre-book/table-of-contents/) |

## What this document type is

A runbook is the document an on-call responder opens **while the pager is going
off**. Its scope is deliberately narrow: ONE named alert or failure condition —
a latency SLO burn, a queue backlog, replica lag — and the concrete steps to
detect, diagnose, and remediate it under pressure. The Google SRE practice of
on-call response (described in the chapter on Being On-Call) is built on exactly
this idea: a responder under stress should follow a known, low-judgement procedure
rather than improvise, because reliable recovery comes from rehearsed steps, not
heroics. A good runbook therefore names the alert and its symptoms, states the
triage checks in order, gives the remediation actions, and says when to escalate.

A runbook is *not* a strategic incident plan — coordinating a class of incidents
across roles and phases is the job of a [playbook](../playbook/). It is *not* a
teaching lesson; a learner who needs to understand the system wants a tutorial,
not a procedure to execute at 3am. Its value is precisely that it assumes
competence and optimises for speed under load.

## How the skill produces one

`sre-runbook` is a genre skill: it carries the runbook pattern as durable
instructions plus exemplars, and writes the artifact over a MIF floor so the
result is at once an actionable procedure and a machine-conformant unit.

- **Pattern, made operational.** The skill encodes the tactical shape — one
  alert, ordered detect/diagnose/remediate steps, explicit escalation criteria —
  and refuses anti-triggered work (a class of incidents belongs in a `playbook`;
  a learning lesson belongs in a tutorial).
- **Written for the worst moment.** Steps are concrete and verifiable so a tired
  responder can follow them exactly; each diagnostic step leads to a decision and
  the next action rather than open-ended investigation.
- **Exemplars set the bar.** Like every genre in the suite it ships `good-l1.md`
  (the MIF Level-1 floor), `good.md` (the target level — Level 2 here),
  `bad.md` (a counter-example), and `evals/evals.json`. The `check-exemplars`
  gate proves `good-l1.md` validates at L1 and `good.md` at its target level.
- **MIF projection.** The document is authored with MIF frontmatter (via the
  shared `mif-frontmatter` substrate) and a `conceptType` of `procedural`,
  reflecting that a runbook is a sequence of performed steps. `mif-validate`
  proves the Markdown to JSON-LD round-trip is lossless before the document is
  considered done.

## When it is beneficial

Reach for `sre-runbook` when you have a **specific alert** that pages humans and
you want the response to be fast, consistent, and independent of who happens to be
on call. Its value compounds over time: every incident is a chance to refine the
runbook so the next responder is faster, which is the core of the on-call
discipline.

Do **not** use it for cross-team coordination of a major incident — that is a
[playbook](../playbook/), which works at a higher altitude across roles and
phases. Do not use it to teach the system or to record a decision. The cost of a
runbook is freshness: a procedure that drifts from reality is worse than none, so
it must be revised whenever the system or the alert changes.

## Example

A runbook titled *"Checkout latency SLO burn"* names the alert and its firing
threshold, then walks ordered steps — confirm the burn on the dashboard, check the
dependency health panel, identify whether the cause is the database or a
downstream service, apply the matching remediation (shed load, fail over the
replica), and verify the SLO recovers — closing with the condition that escalates
to a playbook-coordinated incident if remediation does not hold.

## Provenance & citations

- **Genre source — Google SRE on-call practice:** the runbook genre follows the
  on-call response discipline described in the Google SRE Book,
  <https://sre.google/sre-book/table-of-contents/> (see the chapter on Being
  On-Call).
- **Skill provenance:** authored by the `sre-runbook` skill in the mif-docs
  plugin, <https://github.com/modeled-information-format/mif-docs-plugin>; the
  skill's exemplars and `evals/` define and verify the pattern.
- **MIF conformance:** the document projects to canonical JSON-LD under the MIF
  specification, <https://mif-spec.dev>, and is proven lossless by `mif-validate`.
- **Index:** this skill is one entry in the [skills by purpose](../../skills-by-purpose/)
  catalog; its sibling operations genre is the strategic [playbook](../playbook/).
