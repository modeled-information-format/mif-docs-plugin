---
id: reference-skill-changelog
type: semantic
created: '2026-06-30T12:00:00Z'
modified: '2026-07-28T19:29:51.406Z'
namespace: reference/skills
title: 'Skill reference: changelog'
tags:
  - reference
  - mif-docs
  - skill
  - changelog
  - release-history
temporal:
  '@type': TemporalMetadata
  validFrom: '2026-06-30T00:00:00Z'
  recordedAt: '2026-06-30T12:00:00Z'
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
    - '@id': https://github.com/modeled-information-format/mif-docs-plugin
      '@type': prov:Entity
    - '@id': urn:mif:skill:changelog
      '@type': prov:Entity
  agentVersion: 2.1.220
citations:
  - '@type': Citation
    citationType: specification
    citationRole: methodology
    title: Keep a Changelog 1.1.0 (Olivier Lacan)
    url: https://keepachangelog.com/en/1.1.0/
    accessed: '2026-06-30'
  - '@type': Citation
    citationType: specification
    citationRole: source
    title: Semantic Versioning 2.0.0 (Tom Preston-Werner)
    url: https://semver.org/spec/v2.0.0.html
    accessed: '2026-06-30'
  - '@type': Citation
    citationType: tool
    citationRole: source
    title: 'mif-docs — changelog skill (SKILL.md)'
    url: https://github.com/modeled-information-format/mif-docs-plugin/tree/main/skills/changelog
relationships:
  - type: relates-to
    target: urn:mif:reference-skills-by-purpose
ontology:
  '@type': OntologyReference
  id: mif-docs
  version: 1.0.0
  uri: https://mif-spec.dev/ontologies/mif-docs
entity:
  name: 'Skill reference: changelog'
  entity_type: reference-document
extensions:
  x-skill: changelog
  x-genre-conceptType: episodic
  x-target-level: 2
  x-purpose-group: release-history
---

# Skill reference: `changelog`

The `changelog` skill authors one document genre: a **CHANGELOG** in the Keep a
Changelog format — a human-curated record of notable changes per release. This
reference describes what that document type is, how the skill produces one, when it
earns its place, and the provenance and sources behind it.

| Property | Value |
| --- | --- |
| Authors | A Keep a Changelog CHANGELOG |
| Purpose group | Release history |
| MIF `conceptType` | `episodic` |
| Target MIF level | 2 |
| Primary source | [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/) |

## What this document type is

A changelog is a curated, reverse-chronological list of the notable changes in a
project, organised by released version. The Keep a Changelog standard defines its
shape precisely: an entry per version, newest first, with changes grouped under a
fixed set of headings — **Added**, **Changed**, **Deprecated**, **Removed**,
**Fixed**, and **Security** — plus an `Unreleased` section at the top for changes
not yet shipped. The defining word is *human-curated*: a changelog is written for
people who want to know what changed and whether they should upgrade, so each line
is a deliberate, readable summary, not a mechanical artifact. Versions are labelled
and ordered by Semantic Versioning, so the changelog and the version numbers tell a
consistent story about the size and risk of each release.

A changelog is *not* a roadmap of planned work, *not* a marketing release
announcement, and emphatically *not* a raw dump of git commit log lines — Keep a
Changelog calls that last anti-pattern out by name. The whole point is the
editorial judgement that selects and phrases what matters to a reader.

## How the skill produces one

`changelog` is a genre skill: it carries the Keep a Changelog pattern as durable
instructions plus exemplars, and writes the artifact over a MIF floor so the
result is at once a readable history and a machine-conformant unit.

- **Pattern, made operational.** The skill encodes the structure — `Unreleased`
  plus per-version sections, the six change groups, newest-first order, SemVer
  labels — and refuses anti-triggered work (a roadmap, an announcement, or a
  commit-log dump).
- **SemVer-aware.** Versions follow Semantic Versioning, so the grouping (a
  breaking `Removed`/`Changed` versus an additive `Added`) lines up with whether
  the release is a major, minor, or patch bump.
- **Exemplars set the bar.** Like every genre in the suite it ships `good-l1.md`
  (the MIF Level-1 floor), `good.md` (the target level — Level 2 here),
  `bad.md` (a counter-example), and `evals/evals.json`. The `check-exemplars`
  gate proves `good-l1.md` validates at L1 and `good.md` at its target level.
- **MIF projection.** The document is authored with MIF frontmatter (via the
  shared `mif-frontmatter` substrate) and a `conceptType` of `episodic`,
  reflecting that every entry records what happened in a released version rather
  than asserting a standing fact about the present.
  `mif-validate` proves the Markdown to JSON-LD round-trip is lossless before the
  document is considered done.

## When it is beneficial

Reach for `changelog` whenever a project ships versioned releases that humans
consume — a library, a CLI, an API. Its value is upgrade confidence: a reader
scanning the `Added`/`Changed`/`Removed`/`Security` groups for the versions
between theirs and the latest can decide quickly whether and how to upgrade,
without reading the diff.

Do **not** use it for forward-looking plans (a roadmap), for promotional copy (a
release announcement), or as a substitute for the commit history. The cost of the
genre is the editorial discipline: keeping an honest `Unreleased` section and
curating entries as work lands is ongoing effort, but it is exactly that curation
that distinguishes a changelog from a log dump.

## Example

A `CHANGELOG.md` opens with an `Unreleased` section, then `## [1.4.0] - 2026-05-12`
grouping that release's notable changes — `Added` a new export format, `Changed`
the default timeout, `Deprecated` an old flag, `Fixed` a race condition, and a
`Security` note for a patched dependency — followed by earlier versions in
descending order, each labelled with a SemVer number and date.

## Provenance & citations

- **Genre source — Keep a Changelog:** the canonical format definition,
  <https://keepachangelog.com/en/1.1.0/>, with versions ordered by Semantic
  Versioning, <https://semver.org/spec/v2.0.0.html>.
- **Skill provenance:** authored by the `changelog` skill in the mif-docs
  plugin, <https://github.com/modeled-information-format/mif-docs-plugin>; the
  skill's exemplars and `evals/` define and verify the pattern.
- **MIF conformance:** the document projects to canonical JSON-LD under the MIF
  specification, <https://mif-spec.dev>, and is proven lossless by `mif-validate`.
- **Index:** this skill is one entry in the [skills by purpose](../../skills-by-purpose/)
  catalog, in the release-history purpose group.
