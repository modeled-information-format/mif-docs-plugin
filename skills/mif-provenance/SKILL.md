---
name: mif-provenance
description: Stamp witnessed provenance into a MIF document's frontmatter from the hook-observed session ledger, verify an existing provenance block against it, or check whether capture is actually active for the current session — hook-observed facts only (agent, agentVersion, session activity URN), never model-asserted. Use after authoring a MIF document in a session with capture enabled, to make its provenance witnessed rather than asserted; use verify to detect drift between a document's provenance block and what the ledger actually observed; use status when you just enabled capture or updated this plugin and want to confirm hooks are actually wired before trusting anything gets stamped. Anti-trigger; for writing the rest of the frontmatter use mif-frontmatter (asserted provenance from drafting context), and for schema/level/round-trip conformance use mif-validate.
argument-hint: "stamp|verify <path to the document> [--session <id>] [--ledger <path>] | status [--session <id>] [--ledger <path>]"
---

# mif-provenance

The suite's **witnessed** provenance helper — the fifth authoring helper,
closing the gap the other four cannot: `mif-frontmatter` writes provenance
*asserted* from drafting context, and `mif-validate` passes any schema-valid
block regardless of whether the named agent ever touched the document. This
skill stamps only what the plugin's capture hooks actually observed, and the
model being described is never the source of the facts describing it.

## What it does

- **`stamp <file>`** — writes ONLY ledger-witnessed fields into the
  document's frontmatter `provenance` block: `agent`, `agentVersion` (only
  when witnessed; omitted, never invented) and `wasGeneratedBy` (the session
  activity URN `urn:mif:activity:claude-code-session:<id>`), plus
  `trustLevel` from fixed policy. It modifies only the `provenance` block and
  the `modified` timestamp (set to the latest witnessed touch, so stamping is
  byte-idempotent), preserves every unowned provenance field, and **declines**
  when the ledger records no touch of the document by the selected session —
  provenance naming a session that did not touch the document is the defect
  class this whole helper exists to prevent.
- **`verify <file>`** — deterministically re-derives the expected block from
  the ledger and reports **match** or per-field **drift**. It never restamps;
  reconciliation is an explicit `stamp`. No LLM judgment is in the path
  (the `mif-validate` precedent): identical document + ledger + config yield
  an identical verdict.
- **`status`** — answers "is capture actually active for THIS session right
  now," from inside the session, without touching any document. Reports the
  resolved `mifProvenance.capture`/`stamp` config, and — when capture is on —
  whether the session ledger has a `session_start` line for the current
  session. Enabling capture mid-session, or updating this plugin mid-session,
  is not guaranteed to wire hooks into an already-running session's dispatch
  (issue #90, confirmed by direct repro: Claude Code snapshots the set of hook
  commands per matcher at session/plugin-load time and does not re-read
  `hooks.json` for that set on later dispatches); `status` is the fail-loud
  check for exactly that gap, since the capture hooks themselves are
  deliberately silent on both success and failure. If it reports no
  session_start line, the fix is to restart the Claude Code session, not to
  keep authoring and hoping. Beyond that, `status` also hashes this plugin's
  own `hooks.json` at every `session_start` and compares it against the
  *current* on-disk copy: if they differ, this plugin was updated after this
  session started and the running session may still be dispatching the stale
  hook set — same fix, restart the session.

## Trust ceiling — say this plainly when reporting results

The ledger is a **local, unsigned** witness, so stamped `trustLevel` is fixed
at **`user_stated`** — never `verified`, and not configurable. `confidence`
is **never written** under any configuration: the witness proves presence,
never extent. State this ceiling when reporting a stamp result.

## Consent model

Everything here is opt-in and fail-closed (ADR-0005): capture and stamping
are off by default, configured under the `mifProvenance` settings key
(`capture`: true/false, `stamp`: `"auto"`/`"ask"`/`"off"`), and an explicit
disable at ANY settings scope defeats an enable at every other scope. A
malformed settings file disables rather than enables. Stamping is defined
over the capture ledger, so `stamp` without `capture: true` resolves to
`"off"`. With `stamp: "ask"`,
the hook only surfaces the exact command — run it solely on the user's
explicit approval; in CI/headless, `"ask"` behaves as `"off"`.

## Commands

```bash
node scripts/mif-provenance.mjs stamp  <file> [--session <id>] [--ledger <path>]
node scripts/mif-provenance.mjs verify <file> [--session <id>] [--ledger <path>]
node scripts/mif-provenance.mjs status [--session <id>] [--ledger <path>]
```

Session selection: `--session`, else `$CLAUDE_CODE_SESSION_ID`, else — only when
exactly one session ever touched the file — that session (`status` has no file
to infer from, so it needs `--session` or the environment variable). Several
witnessing sessions is an error demanding `--session`, never a guess. Exit
codes: `0` stamped/match/status-healthy, `1` verify drift (including
unwitnessed) or status found no session_start yet, `2` usage error, `3` stamp
declined.

## Failure postures (deliberately asymmetric)

- **Config resolution fails closed**: any config error resolves to disabled.
- **Capture hooks fail open**: an observation error never blocks a Write or
  a session; outside a git repository capture disables (no alternative store).
- **Stamp never trades conformance for provenance**: if stamping would drop
  the document below the MIF level it already satisfies, it declines and
  leaves the file untouched. A stamped document remains `mif-validate`-valid
  at its prior level with a lossless round-trip.
