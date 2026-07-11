---
id: reference-skill-mif-provenance
type: semantic
created: '2026-07-11T12:00:00Z'
modified: '2026-07-11T12:00:00Z'
namespace: reference/skills
title: 'Skill reference: mif-provenance'
tags:
  - reference
  - mif-docs
  - skill
  - provenance
  - witnessed
temporal:
  '@type': TemporalMetadata
  validFrom: '2026-07-11T00:00:00Z'
  recordedAt: '2026-07-11T12:00:00Z'
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
    - '@id': urn:mif:skill:mif-provenance
      '@type': prov:Entity
citations:
  - '@type': Citation
    citationType: specification
    citationRole: methodology
    title: MIF — Modeled Information Format specification
    url: https://mif-spec.dev
    accessed: '2026-07-11'
  - '@type': Citation
    citationType: specification
    citationRole: background
    title: PROV-O — The PROV Ontology (W3C Recommendation)
    url: https://www.w3.org/TR/prov-o/
    accessed: '2026-07-11'
  - '@type': Citation
    citationType: tool
    citationRole: source
    title: 'mif-docs — mif-provenance skill (SKILL.md)'
    url: https://github.com/modeled-information-format/mif-docs-plugin/tree/main/skills/mif-provenance
relationships:
  - type: relates-to
    target: urn:mif:reference-skills-by-purpose
  - type: relates-to
    target: urn:mif:reference-skill-mif-frontmatter
  - type: relates-to
    target: urn:mif:reference-skill-mif-validate
  - type: relates-to
    target: urn:mif:reference-provenance-ledger
  - type: derived-from
    target: urn:mif:adr-0005-provenance-consent
ontology:
  '@type': OntologyReference
  id: mif-docs
  version: 1.0.0
  uri: https://mif-spec.dev/ontologies/mif-docs
entity:
  name: 'Skill reference: mif-provenance'
  entity_type: reference-document
extensions:
  x-skill: mif-provenance
  x-genre-conceptType: substrate
  x-target-level: 1
  x-purpose-group: authoring-helpers
---

# Skill reference: `mif-provenance`

The `mif-provenance` skill is the suite's **witnessed-provenance helper** — the
fifth authoring helper. It stamps hook-observed session facts into a MIF
document's `provenance` block and verifies existing blocks against those
observations. The distinction it adds to the suite is the witness itself:
[`mif-frontmatter`](mif-frontmatter.md) writes provenance *asserted* from
drafting context, [`mif-validate`](mif-validate.md) passes any schema-valid
block regardless of who actually authored the document, and only this skill
proves the named session **touched the file** — the model being described is
never the source of the facts describing it.

| Property | Value |
| --- | --- |
| Authors | A witnessed `provenance` block; a deterministic match/drift verdict |
| Purpose group | Authoring helpers |
| MIF `conceptType` | `substrate` |
| Target MIF level | 1 (operates on documents at any level, preserving it) |
| Primary source | The capture hooks' [session ledger](../provenance-ledger.md) |

## The trust ceiling, stated plainly

The ledger is a **local, unsigned** file written by the plugin's own hooks.
That is a real witness — the hooks observe tool events; they do not ask the
model what happened — but it is not a cryptographic attestation. The stamped
`trustLevel` is therefore fixed at **`user_stated`** and is not configurable:
never `verified`, which MIF reserves for externally verifiable attestations.
`confidence` is **never written** under any configuration — a witness proves
presence, never extent. There is no signing; anyone with filesystem access
could edit the ledger, which is exactly why the ceiling is what it is.

## The two verbs

### `stamp`

Reads the ledger scoped to the selected session and writes only witnessed
fields into the document's `provenance` block:

- `agent` — `claude-code/<model>`, the model witnessed at the latest touch
  (mid-session model switches are real), else the session line's; bare
  `claude-code` when none was witnessed.
- `agentVersion` — the CLI version witnessed from its exec path; omitted
  rather than invented when unwitnessed.
- `wasGeneratedBy` — the session activity URN
  `urn:mif:activity:claude-code-session:<session-id>`, which doubles as the
  stamp marker the corpus report keys on.
- `trustLevel` — `user_stated`, from the fixed policy above.

It modifies **only** the `provenance` block and the `modified` timestamp
(set to the latest witnessed touch, making the stamp byte-idempotent), and it
preserves every provenance field it does not own (`sourceType`,
`wasAttributedTo`, `wasDerivedFrom`, ...). It **declines** — exit 3, file
untouched — when the ledger records no touch of the document by the selected
session, when the document is not MIF-conformant to begin with, or when
stamping would drop the document below the MIF level it already satisfies.

### `verify`

Re-derives the expected block from the same ledger and reports **match** or
per-field **drift** (a hand-edited `agent`, a document the ledger never
witnessed). It never restamps — reconciliation is an explicit `stamp`. The
verdict is deterministic, with no model in the conformance path: identical
document, ledger, and resolved config yield an identical verdict, the same
discipline `mif-validate` established for schema conformance.

## Session selection

`--session <id>` wins; `$CLAUDE_CODE_SESSION_ID` (the same variable the
capture hooks record from) is next; otherwise the verbs use
the ledger's own evidence — but only when **exactly one** session ever touched
the file. Several witnessing sessions is an error demanding `--session`, never
a guess. Selection can only ever land on a session the ledger witnessed
touching the document, so cross-session attribution is structurally
impossible, not merely discouraged.

## Consent model

Everything is opt-in and fail-closed, per
[ADR-0005](../../adr/0005-provenance-consent-in-settings-hierarchy.md): the
`mifProvenance` settings key (`capture`, `stamp`) defaults to off at every
scope, an explicit disable at any scope defeats an enable at every other, and
a malformed settings file disables rather than enables. The hook-mediated
`stamp: "ask"` mode surfaces the exact command and writes nothing until it is
run on the user's explicit approval; in CI or headless contexts `"ask"`
behaves as `"off"`.

## Commands and exit codes

```bash
node scripts/mif-provenance.mjs stamp  <file> [--session <id>] [--ledger <path>]
node scripts/mif-provenance.mjs verify <file> [--session <id>] [--ledger <path>]
npm run provenance-corpus-check          # witnessed-vs-asserted coverage report
```

Exit codes: `0` stamped / match, `1` verify drift (including unwitnessed),
`2` usage or environment error, `3` stamp declined.
