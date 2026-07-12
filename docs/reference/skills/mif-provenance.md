---
id: reference-skill-mif-provenance
type: semantic
created: '2026-07-11T12:00:00Z'
modified: '2026-07-12T15:46:27.731Z'
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
  trustLevel: user_stated
  agent: claude-code/claude-sonnet-5
  wasAttributedTo:
    '@id': https://github.com/modeled-information-format
    '@type': prov:Agent
  wasGeneratedBy:
    '@id': urn:mif:activity:claude-code-session:3eeb65b8-4027-4e9e-afbe-ccfe2ae33a26
    '@type': prov:Activity
  wasDerivedFrom:
    - '@id': https://github.com/modeled-information-format/mif-docs-plugin
      '@type': prov:Entity
    - '@id': urn:mif:skill:mif-provenance
      '@type': prov:Entity
  agentVersion: 2.1.207
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
  - type: relates-to
    target: urn:mif:how-to-witness-document-provenance
  - type: relates-to
    target: urn:mif:explanation-witnessed-provenance
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

> New to this? Start with [the how-to
> guide](../../../how-to/witness-document-provenance/) for the walk-through, or
> [the explanation](../../../explanation/witnessed-provenance/) for the reasoning
> behind it. This page is the deep reference for drilling into specifics.

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

## The helper versus the hooks

This skill (`stamp`/`verify`/`status`) is the piece you invoke. The capture
hooks (`hooks/provenance-session-start.mjs`,
`hooks/provenance-post-tool-use.mjs`, `hooks/provenance-session-end.mjs`) are
the piece that runs silently in the background and is never invoked
directly — they only build the ledger this skill reads. The skill never observes a
session itself; it only turns what the hooks already recorded into a
document's `provenance` block, or checks a block against it.

## Scope: Claude Code only, for now

Capture is implemented entirely on Claude Code's own plugin hook events
(`SessionStart`, `PostToolUse`, `SessionEnd` — see `hooks/hooks.json`), so
witnessed provenance is only available for sessions run through Claude Code
today. The [ledger contract](../provenance-ledger.md) itself is a generic,
append-only "session touched file" log with no Claude-Code-specific
assumption in its shape; extending capture to another coding agent or tool
would mean that tool appending to the same kind of ledger, which is real,
unstarted work, not something this design rejects.

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

### `status`

Reports whether capture is actually active for the *current* session, from
inside the session, without touching any document: the resolved
`mifProvenance.capture`/`stamp` config, and — when capture is on — whether
the session ledger has a `session_start` line for the current session id.
Enabling capture mid-session, or updating this plugin mid-session, is not
guaranteed to wire hooks into an already-running session's dispatch (issue
[#90](https://github.com/modeled-information-format/mif-docs-plugin/issues/90),
confirmed by direct repro: Claude Code snapshots the set of hook commands per
matcher at session/plugin-load time and does not re-read `hooks.json` for
that set on later dispatches), and both `provenance-config.mjs` (fail-closed)
and the capture hooks themselves (fail-open) are deliberately silent either
way — `status` is the one surface built to say so plainly. A missing
`session_start` line means: restart the Claude Code session, don't keep
authoring and hoping.

`status` also hashes this plugin's own `hooks.json` at every `session_start`
and compares it against the *current* on-disk copy. A mismatch means this
plugin was updated after this session started — the running session may
still be dispatching the stale hook set it loaded at start — same fix,
restart the session.

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
node scripts/mif-provenance.mjs status [--session <id>] [--ledger <path>]
npm run provenance-corpus-check          # witnessed-vs-asserted coverage report
```

Exit codes: `0` stamped / match / status-healthy, `1` verify drift (including
unwitnessed) or status found no `session_start` line yet, `2` usage or
environment error, `3` stamp declined.
