---
id: reference-provenance-ledger
type: semantic
created: '2026-07-11T12:00:00Z'
modified: '2026-07-11T12:00:00Z'
namespace: reference/provenance
title: 'The session ledger: format contract'
summary: The append-only JSONL contract the mif-provenance capture hooks write and every witnessed-provenance consumer reads.
tags:
  - reference
  - mif-docs
  - provenance
  - ledger
  - contract
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
citations:
  - '@type': Citation
    citationType: documentation
    citationRole: methodology
    title: Claude Code hooks reference — payload fields per hook event
    url: https://docs.anthropic.com/en/docs/claude-code/hooks
    accessed: '2026-07-11'
  - '@type': Citation
    citationType: specification
    citationRole: background
    title: JSON Lines — the one-object-per-line text format
    url: https://jsonlines.org/
    accessed: '2026-07-11'
relationships:
  - type: relates-to
    target: urn:mif:reference-skill-mif-provenance
  - type: derived-from
    target: urn:mif:adr-0005-provenance-consent
ontology:
  '@type': OntologyReference
  id: mif-docs
  version: 1.0.0
  uri: https://mif-spec.dev/ontologies/mif-docs
entity:
  name: 'The session ledger: format contract'
  entity_type: reference-document
extensions:
  x-ledger-version: 1
  x-ledger-path: .git/ai-provenance/session.jsonl
---

# The session ledger: format contract

The session ledger is the file the mif-provenance capture hooks append and the
`stamp`/`verify` verbs and corpus report read. This page is its **contract**:
the fields below are load-bearing for every consumer, and at least one
consumer outside this plugin — a commit-trailer generator sharing the same
observation stream — is an anticipated reader. **A change to this format must
consider both consumer families**, not just the verbs in this repository.

## Location and lifecycle

```text
<git-dir>/ai-provenance/session.jsonl
```

- `<git-dir>` is the repository's own git directory (`.git/`, or the
  worktree-private git dir a linked worktree's `.git` file names), so the
  ledger is **never committed and never leaves the machine**. Two worktrees
  of one repository therefore keep separate ledgers.
- Outside a git repository, capture disables; no alternative store is
  invented.
- **Append-only** semantics: writers add whole lines and never rewrite or
  reorder existing ones. Truncation/rotation is the repository owner's
  responsibility (delete the file or the `ai-provenance/` directory at will —
  consumers treat an absent ledger as "no witnesses", never as an error).
- Readers must **skip unparseable lines** (a torn concurrent append, a hand
  edit) rather than fail: the ledger is evidence, and losing one line must
  not invalidate the rest.

## Line format

One JSON object per line ([JSON Lines](https://jsonlines.org/)). Every line
carries:

| Field | Type | Meaning |
| --- | --- | --- |
| `v` | integer | Format version, currently `1`. |
| `event` | string | `session_start`, `file_touch`, or `session_end`. |
| `sessionId` | string or null | The `session_id` from the payload, else `$CLAUDE_CODE_SESSION_ID`. |
| `ts` | string | ISO-8601 UTC timestamp written by the hook at append time. |

Every recorded fact is **witnessed, never guessed**: a fact neither the
payload, the hook's environment, the vendor transcript, nor the repository's
own files carried is recorded as `null`.

### Where the facts come from

- **Payload** — every vendor-documented field for the event (`prompt_id`,
  `permission_mode`, `effort`, `agent_id`, `agent_type`, `source`,
  `session_title`, `reason`, ...).
- **Model** — the SessionStart payload's optional `model` field when present;
  otherwise a **bounded tail-scan** of the payload's own `transcript_path`
  for the newest assistant line's `message.model` (the vendor's
  authoritative record; synthetic placeholders are skipped). This reads one
  field from the transcript's last window — never conversation content.
  `file_touch` lines re-witness the model per touch, because mid-session
  model switches are real.
- **Runtime environment** — every variable whose name matches the Claude
  Code / agent runtime (`CLAUDE*`, `ANTHROPIC*`, `AI_AGENT`, `CLAUDECODE`,
  terminal session ids), captured structurally so a new CLI version's new
  variables land without a code change — **minus any credential-shaped name**
  (`KEY`/`TOKEN`/`SECRET`/`PASSWORD`/`CREDENTIAL`/`AUTH`), which is never
  recorded regardless of prefix. Values are truncated to 512 chars.
- **Tool version** — derived from the CLI's versioned exec path
  (`CLAUDE_CODE_EXECPATH`) or `AI_AGENT`; no payload carries it.
- **Host** — platform, arch, node version, OS release, hostname, username
  (the ledger never leaves the machine; naming the checkout is attribution
  signal, not exfiltration).
- **Repository** — branch and HEAD sha resolved from the git dir's own files
  (worktree-aware, `packed-refs`-aware); no git binary is spawned.

### `session_start`

| Field | Type | Meaning |
| --- | --- | --- |
| `tool` | string | Always `claude-code` (the witnessing surface is its hook set). |
| `toolVersion` | string or null | Derived from the CLI exec path / `AI_AGENT`. |
| `model` | string or null | Payload `model`, else the transcript tail-scan. |
| `source` | string or null | `startup`, `resume`, `clear`, ... |
| `sessionTitle` | string or null | Payload `session_title`. |
| `permissionMode` | string or null | Payload `permission_mode`. |
| `effort` | string or null | Payload `effort`, else `$CLAUDE_EFFORT`. |
| `promptId` | string or null | Payload `prompt_id`. |
| `agentId`, `agentType` | string or null | Present when running as/inside a subagent. |
| `transcriptPath` | string or null | The session transcript the payload named. |
| `cwd` | string | The payload's working directory. |
| `env` | object | The allow-listed runtime environment map (see above). |
| `sys` | object | `platform`, `arch`, `nodeVersion`, `osRelease`, `hostname`, `username`. |
| `git` | object | `branch`, `headSha` at session start. |

### `file_touch`

Appended by the PostToolUse hook for `Write`, `Edit`, and `MultiEdit`.

| Field | Type | Meaning |
| --- | --- | --- |
| `tool` | string | Always `claude-code`. |
| `via` | string | The tool that touched the file (`Write`, `Edit`, `MultiEdit`). |
| `filePath` | string | The touched file's path exactly as the payload carried it. |
| `model` | string or null | The transcript's newest model at touch time. |
| `promptId` | string or null | Which prompt the touch happened under. |
| `permissionMode`, `effort` | string or null | As at session start, per touch. |
| `agentId`, `agentType` | string or null | The touching subagent, when one. |
| `git` | object | `branch`, `headSha` at touch time. |
| `contentHash` | string or null | `sha256:<hex>` of the file's bytes at touch time. |
| `contentBytes` | integer or null | The file's size at touch time. |

The `contentHash` is the strongest witness in the ledger: a consumer can
prove whether today's file is still byte-identical to what the session
wrote. The ledger stores the hash, **never the content**.

### `session_end`

| Field | Type | Meaning |
| --- | --- | --- |
| `reason` | string or null | The SessionEnd `reason`, when the payload carried one. |
| `permissionMode` | string or null | Payload `permission_mode`. |
| `promptId` | string or null | Payload `prompt_id`. |
| `git` | object | `branch`, `headSha` at session end. |

## How consumers use it

- `stamp` selects `file_touch` lines matching one `sessionId` and one
  document, derives `agent`/`agentVersion` from that session's
  `session_start` line, and uses the **latest witnessed touch** as the
  document's `modified` value (which is what makes stamping idempotent).
- `verify` re-derives the same expectation and diffs it against the
  document's actual block, field by field.
- The corpus report classifies a document as *witnessed* by the stamp marker
  (a `wasGeneratedBy` id under `urn:mif:activity:claude-code-session:`),
  downgrading to *asserted* when a supplied ledger contradicts it.
- A commit-trailer consumer can bound a commit's sessions via
  `session_start`/`session_end` windows and attribute files via `file_touch`
  lines — the same selection discipline: only sessions the ledger witnessed
  touching a file may be named for it.

## What the ledger is not

It is a **local, unsigned** witness: anyone with filesystem access can edit
it, which is why everything stamped from it carries `trustLevel:
user_stated` as a hard ceiling and why `confidence` is never derived from it.
It records tool events, not intent, and it never contains document content —
only paths, identifiers, and timestamps.
