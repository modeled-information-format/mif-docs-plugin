---
id: explanation-documentation-taxonomy
type: semantic
created: '2026-07-28T19:00:00Z'
namespace: explanation/design
title: 'Documentation Taxonomy: Semantic, Episodic, Procedural'
tags:
  - explanation
  - mif-docs
  - conceptType
  - design-rationale
modified: '2026-07-28T19:12:09.463Z'
temporal:
  '@type': TemporalMetadata
  validFrom: '2026-07-28T00:00:00Z'
  validUntil: '2027-07-28T00:00:00Z'
  recordedAt: '2026-07-28T19:00:00Z'
  ttl: P1Y
provenance:
  '@type': Provenance
  sourceType: agent_inferred
  trustLevel: user_stated
  agent: claude-code/claude-sonnet-5
  wasAttributedTo:
    '@id': https://github.com/modeled-information-format
    '@type': prov:Agent
  wasGeneratedBy:
    '@id': urn:mif:activity:claude-code-session:4e347ba7-847b-4614-985d-a4daba31a6e4
    '@type': prov:Activity
  wasDerivedFrom:
    - '@id': https://github.com/modeled-information-format/mif-docs-plugin/blob/main/skills/mif-frontmatter/SKILL.md
      '@type': prov:Entity
    - '@id': https://github.com/modeled-information-format/mif-docs-plugin/blob/main/docs/reference/genre-and-cli-catalog.md
      '@type': prov:Entity
  agentVersion: 2.1.220
citations:
  - '@type': Citation
    citationType: specification
    citationRole: source
    title: MIF — Modeled Information Format Specification v1.0
    url: https://mif-spec.dev/
    accessed: '2026-07-28'
  - '@type': Citation
    citationType: specification
    citationRole: methodology
    title: Diátaxis — Explanation
    url: https://diataxis.fr/explanation/
    accessed: '2026-07-28'
  - '@type': Citation
    citationType: repository
    citationRole: source
    title: mif-docs — genre and CLI catalog
    url: https://github.com/modeled-information-format/mif-docs-plugin/blob/main/docs/reference/genre-and-cli-catalog.md
    accessed: '2026-07-28'
relationships:
  - type: relates-to
    target: urn:mif:reference-genre-and-cli
  - type: relates-to
    target: urn:mif:explanation-one-artifact-two-readers
ontology:
  '@type': OntologyReference
  id: mif-docs
  version: 1.0.0
  uri: https://mif-spec.dev/ontologies/mif-docs
entity:
  name: 'Documentation Taxonomy: Semantic, Episodic, Procedural'
  entity_type: explanation
extensions:
  x-diataxis-quadrant: explanation
  x-projection-deterministic: true
---

# Documentation Taxonomy: Semantic, Episodic, Procedural

Every MIF document declares one `type` at the L1 floor:
`semantic` \| `episodic` \| `procedural` (see `mif-frontmatter`). That enum is
not a formality to fill in after drafting — it is a choice about what kind of
claim the document is making, and it should be made before the first
sentence is written. Getting it right the first time is what keeps a genre
skill's output from drifting into the wrong register partway through: an ADR
that quietly turns into a runbook, or a runbook that starts explaining
architecture instead of telling the operator what to do next.

This piece explains what distinguishes the three kinds, grounds each in
genres this plugin actually ships (see the full mapping in the
[genre and CLI catalog](../../reference/genre-and-cli-catalog/)), and gives the
rule for correcting a document once it exists.

## The three kinds

**Semantic — what is true.** A semantic document describes the system as it
currently exists: timeless present tense, indicative mood, third person. It
describes the system, not the work that produced it — no dates, no
"recently," no "we decided to." Its update trigger is that the system
changed; a semantic document describing a system that no longer exists is
worse than no document at all. Genres in this suite that are semantic:
`adr` (a standing decision and its consequences), `arc42-arch-doc` and
`c4-model-diagram` (the architecture as it stands), `diataxis-reference`
(a lookup of one current fact).

**Episodic — what happened.** An episodic document is an append-only record
of events in time: past tense, agentless where blame would otherwise attach,
anchored to a version or timestamp in the first clause. Entries are
immutable once published — a correction is a new entry, never an edit to an
old one. Its update trigger is that an event occurred. Genres in this suite
that are episodic: `changelog` (Keep a Changelog history, each entry
anchored to a release), `briefing` (a dated standup or status update).

**Procedural — what to do.** A procedural document is ordered imperative
steps for an operator: second person, one action per step, verb first. No
explanation inside a step — rationale belongs in a preamble or a link.
State preconditions before step one, an expected observable result after
every step, and the failure branch for when a step doesn't produce that
result. Its update trigger is that the procedure failed, or its tooling
changed. Genres in this suite that are procedural: `sre-runbook` (one
incident, ordered steps), `diataxis-how-to` and `diataxis-tutorial`
(a recipe or a guided lesson).

### Register at a glance

| | Tense | Mood | Addresses | Reader question | `conceptType` |
| --- | --- | --- | --- | --- | --- |
| Semantic | Present | Indicative | The system | "How does this work?" | `semantic` |
| Episodic | Past | Indicative | The event | "What changed, and when?" | `episodic` |
| Procedural | — | Imperative | The operator | "What do I do now?" | `procedural` |

## One document, one bucket

A register shift partway through a document is a signal that its `type` was
chosen wrong, not a stylistic wobble to smooth over. Imperative steps
appearing inside an `arc42-arch-doc` mean that content belongs in a separate
`sre-runbook` or `diataxis-how-to`, not folded into the architecture
document. A `changelog` entry that starts explaining *why* the system is
designed the way it now is belongs in an `adr` instead, with the changelog
entry linking to it.

Semantic documents may link to episodic ones for history — an `adr`'s
Status section can point at the `changelog` entry that shipped the decision.
But episodic must never be the only place a current fact is stated: if a
`changelog` entry is the sole record that a feature exists, that is a gap in
the semantic layer, not a citation that closes it.

## Corrections follow the bucket

- **Semantic** documents are corrected by editing in place. How much of the
  L1→L3 climb a correction can honestly re-claim is governed by
  `mif-frontmatter`'s grade-down rule — a correction that removes the source
  a claim rested on should drop provenance/citations rather than leave them
  pointing at something no longer true.
- **Episodic** documents are corrected by appending a new entry. Never
  rewrite a shipped `changelog` or `briefing` entry into agreement with the
  present — if the entry was wrong, the next entry says so.
- **Procedural** documents are corrected by editing the failing step in
  place, and, where the doc set has one, noting the change in a `changelog`
  entry so operators who last read the old version know something moved.

## Choosing type at draft time

Before reaching for a genre skill, decide which question the document is
actually answering — "how does this work," "what changed and when," or
"what do I do now." That answer fixes the `type` (see the register table
above), and the `type` in turn narrows which genre skills are a fit: check
the [genre and CLI catalog](../../reference/genre-and-cli-catalog/) for the
full skill-to-`conceptType` mapping before picking one that doesn't match
the question being answered.

## In short

The `conceptType` enum is a commitment to one of three questions a document
can answer, and each answer carries its own tense, mood, update trigger, and
correction rule. Deciding which question is being answered before drafting
— not after, while filling in frontmatter — is what keeps a document's
register consistent from its first line to its last. For the full
genre-to-type mapping, see the
[genre and CLI catalog](../../reference/genre-and-cli-catalog/); for how the
`type` field projects into MIF's machine view, see
[One Artifact, Two Readers](../one-artifact-two-readers/).
