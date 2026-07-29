---
description: Audit MIF documents under one or more paths for accuracy, taxonomical alignment, editorial consistency, frontmatter/provenance/temporal/relationship/citation conformance, using per-check model routing and configurable batching
argument-hint: --path <path>... [--batch-size N] [--mif-level 1|2|3] [--checks id,id,...] [--fix] [--file-issues] [--report-dir <dir>]
allowed-tools: Bash(echo:*)
---

Audit MIF documents via the `audit-docs` Workflow
(`${CLAUDE_PLUGIN_ROOT}/workflows/audit-docs.js`) shipped with this plugin.

Arguments: `$ARGUMENTS`

- `--path` (required, one or more values): each a file or directory. Recurse
  over matching MIF documents (files with MIF frontmatter) when a value is a
  directory. If no `--path` is given, stop and ask which path(s) to audit —
  do not guess or default to the whole repo.
- `--batch-size` (optional, default `5`): number of targets processed per
  batch. Must be a positive integer; if given but not one, stop and ask.
- `--mif-level` (optional, one of `1`/`2`/`3`): the target level the
  frontmatter checks evaluate against. Advisory only — a doc below this level
  is reported as an upgrade recommendation, never a failing finding. Omit
  entirely if not given (the workflow then only reports each doc's own
  current level with no gap comparison).
- `--checks` (optional, comma-separated check ids): run only these checks
  from the registry instead of all of them. Omit entirely if not given.
- `--fix` (optional flag): apply fixes after the audit, scoped to haiku-tier
  mechanical findings with a single deterministic corrective action —
  never voice/taxonomy/relationship-graph/coverage-gap findings, those are
  permanently out of `--fix` scope. Absent by default — the audit is
  read-only reporting unless this flag is present.
- `--file-issues` (optional flag): file confirmed findings at or above
  `severity: high` as GitHub issues via the `github-bug-capture` search-then-
  file pattern, in the finding's own owning repo. Absent by default.
- `--report-dir` (optional, default `reports/audit-docs`): where the report
  is written, **relative to the current working directory this command runs
  in** — never an absolute path baked into the plugin, since this plugin is
  installed by other users too.

## Before invoking the workflow: elicit custom criteria

A running Workflow cannot pause for input mid-run, so this step happens here,
first. Ask the invoking user, via `AskUserQuestion`, whether they want to add
any custom check criteria beyond the built-in registry for this run (e.g. a
project-specific consistency rule not covered by the standard checks). If
they decline or add nothing, proceed with an empty `customChecks` list — do
not invent criteria on their behalf.

## Resolve plugin-relative paths

This plugin's own scripts and this workflow live at a path that differs per
installation, so resolve all four below before invoking anything — never
assume the audited path is inside this plugin's own repo:

Workflow script path: !`echo ${CLAUDE_PLUGIN_ROOT}/workflows/audit-docs.js`

mif-provenance corpus-check script path (provenance-drift uses this, not
`mif-provenance verify` — that tool checks against the CURRENT session, which
is wrong for auditing a pre-existing document authored in a past session):

!`echo ${CLAUDE_PLUGIN_ROOT}/scripts/provenance-corpus-check.mjs`

mif-validate script path (frontmatter-schema/mif-level-gap use this CLI, never
the validate_mif_document MCP tool — that tool requires pre-converted JSON-LD
and fails on markdown, confirmed by direct test):

!`echo ${CLAUDE_PLUGIN_ROOT}/scripts/mif-validate.mjs`

Skills directory — genre-conformance grounds its judgment in the actual genre
skill here, rather than general knowledge of what a genre "should" look like:

!`echo ${CLAUDE_PLUGIN_ROOT}/skills`

**Before running this for the first time in this installation**, confirm
`Bash` execution actually resolved `${CLAUDE_PLUGIN_ROOT}` above to a real
absolute path (not the literal string `${CLAUDE_PLUGIN_ROOT}/...`) — if it
didn't expand, stop and report that rather than passing an unresolved
placeholder into `scriptPath`.

## Invoke

```js
Workflow({
  scriptPath: "<the workflow script path printed above>",
  args: {
    paths: ["<path>", ...],
    batchSize: <N or 5>,
    mifLevel: <1|2|3 or omit>,
    checks: [<id>, ...] or omit,
    fix: <true|false>,
    fileIssues: <true|false>,
    reportDir: "<--report-dir value or 'reports/audit-docs'>",
    mifProvenanceCorpusCheckScript: "<the mif-provenance corpus-check script path printed above>",
    mifValidateScript: "<the mif-validate script path printed above>",
    skillsRoot: "<the skills directory path printed above>",
    customChecks: [<user-supplied criteria strings>],
  },
})
```

This always runs in the background across five phases (Design → Audit →
Verify → Fix → Report — see the workflow's own `meta.phases`; the elicitation
step above already happened before this call, since a running Workflow
cannot pause for input mid-run). Let it run in the background rather than
polling; report back once the task-notification arrives rather than
re-invoking or re-asking.

## When it completes, report back

- the finalized check registry actually run (built-in + any custom checks),
  with the model tier used per check and why
- the batch plan (target count, batch count, size actually used)
- findings grouped by severity, each with `file`, `check_id`, `summary`,
  `recommendation`, and whether it was auto-fixed
- if `--fix` was set: which findings were fixed vs. left for manual action,
  and why (per-batch, per-doc mechanical fixes only — never voice/taxonomy/
  relationship-graph/coverage-gap findings, those are permanently out of
  `--fix` scope, not a gap to close later)
- if `--file-issues` was set: which findings were filed, in which repo, and
  which were skipped as likely duplicates
- the report file's path
- any check that could not run and why (e.g. a doc outside any git repo,
  so `--file-issues` couldn't resolve an owning repo for it) — never a silent
  drop
