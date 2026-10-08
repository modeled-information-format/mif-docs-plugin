---
id: f89cda87-65ec-566d-840a-7edeea11316c
type: semantic
created: '2026-07-01T00:00:00Z'
modified: '2026-07-01T00:00:00Z'
namespace: reference/skills
title: 'Skill reference: briefing'
tags:
  - reference
  - mif-docs
  - skill
  - briefing
  - status-update
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
    - '@id': urn:mif:skill:briefing
      '@type': prov:Entity
citations:
  - '@type': Citation
    citationType: tool
    citationRole: source
    title: 'mif-docs — briefing skill (SKILL.md)'
    url: https://github.com/modeled-information-format/mif-docs-plugin/tree/main/skills/briefing
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
  name: 'Skill reference: briefing'
  entity_type: reference-document
extensions:
  x-skill: briefing
  x-genre-conceptType: episodic
  x-target-level: 3
  x-purpose-group: business-communication
---

# Skill reference: `briefing`

The `briefing` skill authors one document genre: a **one-page briefing or
standup update** — Headline, What's New, Why It Matters, What's Next / Asks —
for a recurring audience that already holds context and needs the delta fast.
This reference describes what that document type is, how the skill produces
one, when it earns its place, and the provenance behind it.

| Property | Value |
| --- | --- |
| Authors | A one-page briefing / standup update |
| Purpose group | Business communication |
| MIF `conceptType` | `episodic` |
| Target MIF level | 3 |
| Primary source | Harness-native pattern (no external body prescribes a "briefing" format) |

## What this document type is

A briefing is a terse status update anchored to a specific coverage period —
"since the last update" — not a durable statement of fact. It carries a
Headline (the single most important thing to know right now), a compressed
"What's New" of 2 to 4 delta items, a paired "Why It Matters" line for each,
and a "What's Next / Asks" naming concrete next actions and owners. No named
external standard (ISO/NISO/ANSI/APA) governs this shape; it is harness-native.

That coverage-bound nature is exactly why the genre's `conceptType` is
`episodic` rather than `semantic`. A briefing does not assert a standing fact
about the world the way an ADR or an engineering report does — it reports what
happened in a bounded window, addressed to a reader who already holds the
backdrop and will read the next one next week. Its truth value is scoped to
that window (`temporal.validFrom` / `validUntil`), and it is superseded, not
amended, by the next period's briefing. That is the same time-bound logic that
puts `changelog` in an episodic-adjacent posture, though a changelog is
anchored to release versions rather than a standup cadence.

## How the skill produces one

`briefing` is a genre skill: it carries the one-page-briefing pattern as
durable instructions plus exemplars, and writes the artifact over a MIF floor
so the result is at once a scannable status update and a machine-conformant
unit.

- **Pattern, made operational.** The skill encodes the four-part structure —
  Headline, What's New, Why It Matters, What's Next / Asks — and enforces that
  every "What's New" bullet is paired with a "Why It Matters" line; an update
  with no stated implication is treated as incomplete.
- **A hard ceiling, not a suggestion.** The one-page limit is enforced by
  cutting to the delta — the freshest, most decision-relevant items win over
  restated background — while still accounting for everything the briefing
  draws from rather than silently dropping thin or uncertain items.
- **Exemplars set the bar.** Like every genre in the suite it ships
  `templates/good-l1.md` (the MIF Level-1 floor), `templates/good.md` (the
  Level-3 target), and `templates/bad.md` (a counter-example: "What's New"
  bullets with no paired "Why It Matters" — orphan updates the reader has no
  way to weigh).
- **MIF projection.** The document is authored with MIF frontmatter (via the
  shared `mif-frontmatter` substrate) and a `conceptType` of `episodic`, with
  `temporal` validity carrying the coverage period. `mif-validate` proves the
  Markdown to JSON-LD round-trip is lossless.

## When it is beneficial

Reach for `briefing` for a standup, a sync, or a regular stakeholder update
where the audience already holds the backdrop and needs the delta and the next
action, fast — not a re-explanation of standing context.

Per the skill's own anti-triggers, do **not** use it for:

- **A longer, standalone summary of a larger document for a reader who does
  not already hold context** — that re-establishes background rather than
  assuming it, and isn't bound to a recurring cadence or a "since last update"
  delta.
- **A curated, versioned history of released changes** — that is
  [changelog](../changelog/): entries are anchored to release versions, not to
  a standup cadence.
- **A single already-made technical decision with its rationale on record** —
  that is [adr](../adr/): immutable and driver-and-outcome shaped, not a
  status delta.

## Example

A weekly briefing titled *"Payments Platform Migration — Weekly Briefing"*
covers 2026-06-23 to 2026-06-30. Its Headline states the cutover is still on
track for July 14 with one legacy batch job as the sole open blocker. What's
New reports a staging load test passing at 2x peak volume, the EU Stripe
webhook migration completing, and the legacy nightly reconciliation batch job
still failing intermittently. Why It Matters pairs each: the load test
confirms no capacity add is needed before cutover, the EU migration de-risks
the highest-volume merchant segment, and the batch job is the only item that
can still slip the date. What's Next / Asks names concrete owners and dates:
the platform team root-causing the batch failure by Thursday, a Finance
go/no-go call by Friday, and the US merchant migration starting the following
Monday contingent on EU staying stable for a full week.

## Provenance & citations

- **Genre source — harness-native pattern:** no external standards body
  prescribes a "briefing" format; the pattern is the skill's own encoded
  structure (Headline / What's New / Why It Matters / What's Next / Asks) with
  no domain standard to conform to beyond common practice.
- **Skill provenance:** authored by the `briefing` skill in the mif-docs
  plugin, <https://github.com/modeled-information-format/mif-docs-plugin>; the
  skill's exemplars define and verify the pattern.
- **MIF conformance:** the document projects to canonical JSON-LD under the MIF
  specification, <https://mif-spec.dev>, and is proven lossless by `mif-validate`.
- **Index:** this skill is one entry in the [skills by purpose](../../skills-by-purpose/)
  catalog, in the business-communication purpose group.
