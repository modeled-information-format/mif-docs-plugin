---
id: 372f597f-531c-532b-903f-a0b886d70d6c
type: semantic
created: '2026-06-30T12:00:00Z'
modified: '2026-06-30T12:00:00Z'
namespace: reference/skills
title: 'Skill reference: playbook'
tags:
  - reference
  - mif-docs
  - skill
  - sre
  - playbook
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
    - '@id': urn:mif:skill:playbook
      '@type': prov:Entity
citations:
  - '@type': Citation
    citationType: book
    citationRole: methodology
    title: 'Google SRE Book — Table of Contents (Ch. 14, Managing Incidents)'
    url: https://sre.google/sre-book/table-of-contents/
    accessed: '2026-06-30'
  - '@type': Citation
    citationType: book
    citationRole: background
    title: 'Google SRE Workbook — Table of Contents'
    url: https://sre.google/workbook/table-of-contents/
    accessed: '2026-06-30'
  - '@type': Citation
    citationType: tool
    citationRole: source
    title: 'mif-docs — playbook skill (SKILL.md)'
    url: https://github.com/modeled-information-format/mif-docs-plugin/tree/main/skills/playbook
relationships:
  - type: relates-to
    target: urn:mif:d8972202-0b4d-52ea-89d7-90abe228e820
  - type: relates-to
    target: urn:mif:3fd7e825-3ebb-524e-a04d-3405076d2c0e
ontology:
  '@type': OntologyReference
  id: mif-docs
  version: 1.0.0
  uri: https://mif-spec.dev/ontologies/mif-docs
entity:
  name: 'Skill reference: playbook'
  entity_type: reference-document
extensions:
  x-skill: playbook
  x-genre-conceptType: procedural
  x-target-level: 3
  x-purpose-group: operations
---

# Skill reference: `playbook`

The `playbook` skill authors one document genre: a **strategic operational
playbook** — the higher-altitude coordination of a class of situations. This
reference describes what that document type is, how the skill produces one, when
it earns its place, and the provenance and sources behind it.

| Property | Value |
| --- | --- |
| Authors | A strategic playbook coordinating a class of incidents |
| Purpose group | Operations |
| MIF `conceptType` | `procedural` |
| Target MIF level | 3 |
| Primary source | [Google SRE Book — Table of Contents](https://sre.google/sre-book/table-of-contents/) |

## What this document type is

A playbook operates one level **above** a runbook. Its subject is not a single
alert but a *class* of situations — a Sev1 outage, a data-integrity incident, a
security event — and its job is to coordinate the people and decisions that resolve
it. The Google SRE practice of incident management (the chapter on Managing
Incidents, extended in the SRE Workbook) is the model: a clear command structure
with separated roles — incident commander, operations lead, communications — clear
decision points, and named phases from detection through mitigation to recovery and
hand-off. A playbook captures that structure so that when a major incident hits,
who-does-what and when-to-escalate are already decided.

A playbook is *not* a tactical procedure for one alert — fixing a specific firing
condition step-by-step is the job of a [sre-runbook](../sre-runbook/), which a
playbook will often invoke. It is the strategic complement: the runbook restores a
service, the playbook coordinates the response when many things are moving at once
and humans must be organised.

## How the skill produces one

`playbook` is a genre skill: it carries the incident-coordination pattern as
durable instructions plus exemplars, and writes the artifact over a MIF floor so
the result is at once an operational coordination guide and a machine-conformant
unit.

- **Pattern, made operational.** The skill encodes the strategic shape — roles
  and their responsibilities, decision points, phased response across a class of
  situations — and refuses anti-triggered work (fixing one specific alert belongs
  in an `sre-runbook`).
- **Roles and phases, not just steps.** Because the subject is a class of
  incidents, the content is organised around who decides what and in which phase,
  rather than a single linear remediation, which is why it targets the higher
  MIF Level 3.
- **Exemplars set the bar.** Like every genre in the suite it ships `good-l1.md`
  (the MIF Level-1 floor), `good.md` (the target level — Level 3 here),
  `bad.md` (a counter-example), and `evals/evals.json`. The `check-exemplars`
  gate proves `good-l1.md` validates at L1 and `good.md` at its target level.
- **MIF projection.** The document is authored with MIF frontmatter (via the
  shared `mif-frontmatter` substrate) and a `conceptType` of `procedural`,
  reflecting that a playbook coordinates a sequence of performed actions across
  roles. `mif-validate` proves the Markdown to JSON-LD round-trip is lossless
  before the document is considered done.

## When it is beneficial

Reach for `playbook` when an incident is **bigger than one alert** — when
resolving it means coordinating several people, making escalation and
communication decisions, and moving through phases. Its value is that it removes
improvisation from the chaotic part of an incident: roles and decision rights are
settled in advance, so the team executes rather than debates.

Do **not** use it to remediate a single firing alert — that is a leaner
[sre-runbook](../sre-runbook/), which the playbook references for the tactical
fix. The cost of a playbook is realism: a coordination plan that has never been
exercised tends to fail under real pressure, so it should be rehearsed and revised
through incident retrospectives.

## Example

A playbook titled *"Sev1 customer-facing outage"* defines the incident-commander,
operations-lead, and communications roles and their hand-offs, then phases the
response — declare and assemble, stabilise and mitigate (invoking the relevant
service runbooks), communicate to stakeholders on a cadence, then recover and
schedule the postmortem — with explicit decision points for when to escalate
severity or page additional teams.

## Provenance & citations

- **Genre source — Google SRE incident management:** the playbook genre follows
  the incident-command and coordination practice in the Google SRE Book,
  <https://sre.google/sre-book/table-of-contents/> (see the chapter on Managing
  Incidents), extended in the SRE Workbook,
  <https://sre.google/workbook/table-of-contents/>.
- **Skill provenance:** authored by the `playbook` skill in the mif-docs
  plugin, <https://github.com/modeled-information-format/mif-docs-plugin>; the
  skill's exemplars and `evals/` define and verify the pattern.
- **MIF conformance:** the document projects to canonical JSON-LD under the MIF
  specification, <https://mif-spec.dev>, and is proven lossless by `mif-validate`.
- **Index:** this skill is one entry in the [skills by purpose](../../skills-by-purpose/)
  catalog; its sibling operations genre is the tactical [sre-runbook](../sre-runbook/).
