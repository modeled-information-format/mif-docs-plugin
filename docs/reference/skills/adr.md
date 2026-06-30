---
id: reference-skill-adr
type: semantic
created: '2026-06-30T12:00:00Z'
modified: '2026-06-30T12:00:00Z'
namespace: reference/skills
title: 'Skill reference: adr'
tags:
  - reference
  - mif-docs
  - skill
  - adr
  - structured-madr
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
    - '@id': urn:mif:skill:adr
      '@type': prov:Entity
    - '@id': urn:mif:adr-0001-align-adr-to-smadr
      '@type': prov:Entity
citations:
  - '@type': Citation
    citationType: repository
    citationRole: methodology
    title: 'Structured MADR — modeled-information-format/structured-madr, the Action this genre validates against'
    url: https://github.com/modeled-information-format/structured-madr
  - '@type': Citation
    citationType: specification
    citationRole: background
    title: 'MADR — Markdown Architectural Decision Records, the base format Structured MADR builds on'
    url: https://adr.github.io/madr/
    accessed: '2026-06-30'
  - '@type': Citation
    citationType: documentation
    citationRole: background
    title: 'Architectural Decision Records — the ADR community and organization'
    url: https://adr.github.io/
    accessed: '2026-06-30'
  - '@type': Citation
    citationType: tool
    citationRole: source
    title: 'mif-docs — adr skill (SKILL.md)'
    url: https://github.com/modeled-information-format/mif-docs-plugin/tree/main/skills/adr
relationships:
  - type: relates-to
    target: urn:mif:reference-skills-by-purpose
  - type: relates-to
    target: urn:mif:adr-0001-align-adr-to-smadr
  - type: relates-to
    target: urn:mif:reference-skill-rust-rfc
  - type: relates-to
    target: urn:mif:reference-skill-python-pep
ontology:
  '@type': OntologyReference
  id: mif-docs
  version: 1.0.0
  uri: https://mif-spec.dev/ontologies/mif-docs
entity:
  name: 'Skill reference: adr'
  entity_type: reference-document
extensions:
  x-skill: adr
  x-genre-conceptType: semantic
  x-target-level: 3
  x-purpose-group: decisions-proposals
---

# Skill reference: `adr`

The `adr` skill authors one document genre: an **Architectural Decision Record**
in the org's **Structured MADR** format — a single, consequential, hard-to-reverse
decision captured with its drivers, the options weighed, the chosen outcome, and
the consequences accepted. This reference describes what that document type is, how
the skill produces one, when it earns its place, and the provenance and sources
behind it.

| Property | Value |
| --- | --- |
| Authors | An Architectural Decision Record in Structured MADR format |
| Purpose group | Decisions & proposals |
| MIF `conceptType` | `semantic` (genre `type: adr`) |
| Target MIF level | 3 |
| Primary source | [structured-madr](https://github.com/modeled-information-format/structured-madr) |

## What this document type is

An ADR records one architecturally significant decision: a choice that is costly
to change, shapes structure or dependencies, or constrains future work. The genre
is the plugin's flagship, and per the suite's own accepted decision record —
[ADR-0001](../../../adr/0001-align-adr-genre-to-structured-madr/) — it is aligned
**fully** to **Structured MADR** (`structured-madr`), the
`modeled-information-format` org's canonical ADR format, built on the open
[MADR](https://adr.github.io/madr/) template. A Structured MADR document names the
decision in its title, then states the **status**, the **context and problem
statement**, the **decision drivers** (the forces that matter), the **considered
options** with their risks, the **decision** with its justification, and the
**consequences** — both the good and the bad. A lifecycle status moves an accepted
decision through proposed, accepted, deprecated, and superseded.

An ADR is therefore *not* a how-to guide (use [diataxis-how-to](../diataxis-how-to/)
for task steps) and *not* a requirements document (use [prd](../prd/) or
[feature-spec](../feature-spec/) for what to build). It is also distinct from a
forward-looking proposal seeking consensus *before* a choice is made: a
[rust-rfc](../rust-rfc/) or [python-pep](../python-pep/) argues a design open for
debate, whereas an ADR records a decision and the reasoning that produced it so
future readers understand *why*.

## How the skill produces one

`adr` is a genre skill: it carries the Structured MADR pattern as durable
instructions plus exemplars. Every ADR it writes carries `type: adr` and
`conceptType: semantic` and conforms to the org's Action-validated format.

- **Pattern, made operational.** The skill encodes the required Structured MADR
  frontmatter (`title`, `description`, `type: adr`, `category`, `status`,
  `created`, `updated`, `author`, `project`) and the ordered sections — Status,
  Context, Decision Drivers, Considered Options, Decision, Consequences — and
  refuses anti-triggered work, redirecting how-to and requirements requests.
- **Validated by the canonical Action, not the suite.** The genre reuses the
  `modeled-information-format/structured-madr` GitHub Action as the authority,
  which validates an ADR in **both** of its modes: `smadr` (the structural
  frontmatter-and-section schema) and `mif` (MIF conformance, levels 1–3). It does
  not re-implement ADR validation.
- **The one exempt genre.** Because ADRs validate through that Action, the `adr`
  genre is the single genre **exempt** from the suite's `mif-validate` (which keys
  on `conceptType`); the fail-closed PostToolUse guard likewise skips `type: adr`
  documents. CI runs the Action over every shipped ADR via the `adr-smadr` job in
  both modes. This deliberate two-path split keeps the plugin's ADRs
  indistinguishable, to the validator, from any other ADR in the org.

## When it is beneficial

Reach for `adr` when a team makes or captures a decision that is **consequential
and hard to reverse** — a datastore choice, a service boundary, a protocol, a
build-vs-buy call — and needs the rationale on record for the engineers who arrive
later and ask "why is it this way?" A decision log of Structured MADR records turns
tacit architectural memory into durable, searchable knowledge and prevents the same
debate from recurring, while staying conformant with the whole org's tooling.

Do **not** write an ADR for a small or easily reversed change (a plain issue
suffices), for end-user task instructions (a how-to), or for requirements that
describe *what* to build rather than *which* design was chosen. When the decision is
still open and you want written consensus before committing, an RFC or PEP is the
better instrument; the ADR is the artifact you write once the choice is settled.

## Example

An ADR titled *"Use event-driven messaging between order and inventory services"*
opens with the status and the context — synchronous calls were coupling deploys and
causing cascading timeouts — lists decision drivers (decoupling, resilience,
operational familiarity), weighs the options (direct HTTP, shared database, a
message broker) with the risks of each, then records the decision: a broker,
accepted because it decouples deploys at the cost of new operational surface. The
consequences section states the tradeoff plainly. The suite's own
[ADR-0001](../../../adr/0001-align-adr-genre-to-structured-madr/) is itself a
worked example of the genre.

## Provenance & citations

- **Genre format — Structured MADR:** the org's canonical, Action-validated ADR
  format, <https://github.com/modeled-information-format/structured-madr>, built on
  the open MADR template, <https://adr.github.io/madr/>, maintained within the ADR
  community, <https://adr.github.io/>.
- **Governing decision:** the alignment is recorded in the suite's accepted
  [ADR-0001](../../../adr/0001-align-adr-genre-to-structured-madr/), which reversed
  an earlier decouple direction.
- **Skill provenance:** authored by the `adr` skill in the mif-docs plugin,
  <https://github.com/modeled-information-format/mif-docs-plugin>; its exemplars and
  `evals/` define the pattern.
- **Validation:** ADRs are validated by the `structured-madr` Action in `smadr` and
  `mif` modes (the `adr-smadr` CI job); the genre is exempt from the suite's
  `mif-validate` per ADR-0001.
- **Index:** this skill is one entry in the [skills by purpose](../../skills-by-purpose/)
  catalog; its sibling decisions-and-proposals genres are
  [rust-rfc](../rust-rfc/) and [python-pep](../python-pep/).
