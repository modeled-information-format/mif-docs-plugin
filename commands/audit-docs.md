---
description: Audit MIF documents under one or more paths for accuracy, taxonomical alignment, editorial consistency, frontmatter/provenance/temporal/relationship/citation conformance, using per-check model routing and configurable batching
argument-hint: [--help] --path <path>... [--batch-size N] [--mif-level 1|2|3] [--checks id,id,...] [--fix] [--file-issues] [--report-dir <dir>]
allowed-tools: Bash(echo:*)
---

Audit MIF documents via the `audit-docs-engine` Workflow
(`${CLAUDE_PLUGIN_ROOT}/workflows/audit-docs-engine.js`) shipped with this plugin. Its name is
deliberately distinct from this command's: Claude Code auto-registers plugin workflows as
`/<plugin>:<meta.name>`, and a workflow sharing this command's name would shadow it entirely,
making the `--help`/argument-hint/elicitation instructions below unreachable.

Arguments: `$ARGUMENTS`

## `--help` / `-h`

If `$ARGUMENTS` contains a standalone `--help` or `-h` token (not as a
substring of another argument's value, e.g. not the `-h` inside a path like
`docs/api-handbook`), print the block below verbatim and stop — do not run
the elicitation step, do not invoke the Workflow. Note: the
`${CLAUDE_PLUGIN_ROOT}` path resolutions further down this file are bash
preprocessing that runs before this instruction is evaluated, so those
`echo` calls still fire even on `--help` — that's harmless (no side effects
beyond printing a path) and safe to ignore, just don't act on their output.

```text
/audit-docs --path <path>... [options]

Audits MIF documents (files with MIF frontmatter) for schema conformance,
provenance, temporal consistency, editorial voice, taxonomy alignment,
genre conformance, cross-document accuracy, citations, and coverage —
via an extensible, model-routed check registry. Read-only by default.

Required:
  --path <path>...        One or more files or directories to audit.
                           A directory is recursed for matching MIF documents.

Options:
  --batch-size N           Targets processed per batch. Default: 5.
  --mif-level 1|2|3        Target level for the mif-level-gap check only —
                            reported as an advisory upgrade recommendation,
                            never a failing finding. frontmatter-schema always
                            validates at level 1 regardless of this flag, and
                            its violations ARE real findings, not advisory.
  --checks id,id,...        Run only these checks (see the full list below).
                            Default: every check in the registry.
  --fix                    Apply fixes for haiku-tier mechanical findings with
                            one deterministic corrective action. Default: off
                            (report-only). Never applies to judgment-tier
                            findings (voice/taxonomy/relationship-graph/
                            coverage-gaps) — that's permanent, not a v1 gap.
  --file-issues            File confirmed high-severity findings as GitHub
                            issues in their owning repo. Default: off.
  --report-dir <dir>       Where the report is written, relative to the
                            current working directory. Default: reports/audit-docs.
  --help, -h                Show this help and exit.

Check registry (--checks accepts any of these ids):
  Haiku tier, tool-backed (a real CLI/tool is the oracle, not just LLM judgment):
    frontmatter-schema      MIF schema + round-trip conformance (mif-validate CLI)
    mif-level-gap            Current vs. target MIF level (advisory)
    provenance-drift         Witnessed/asserted provenance coverage
    link-integrity            Internal/external links actually resolve
    ontology-reference        MIF ontology term references resolve

  Haiku tier, LLM judgment (routed here for cost, not because a tool verifies them):
    structural-formatting      Heading hierarchy, code fences, table formatting
    temporal-metadata          created/modified field consistency

  Judgment / sonnet tier (per-document):
    taxonomy-alignment        Semantic/episodic/procedural classification + voice
    editorial-voice            Voice/register consistency
    genre-conformance          Structure vs. the document's declared genre skill
    temporal-staleness        Content describing a retired/superseded system
    accuracy-corpus            Cross-document factual contradictions
    citation-validity          Citation format and existence

  Judgment / opus tier:
    accuracy-code              Code citations checked against actual source (per-doc)
    duplication-drift          Same fact asserted differently across the batch
    relationship-graph        MIF relationship graph resolves within the batch
    coverage-gaps              An expected doc genre conspicuously missing

Examples:
  /audit-docs --path docs/how-to/deploy.md
  /audit-docs --path docs/ --checks frontmatter-schema,editorial-voice
  /audit-docs --path docs/ --fix --mif-level 2
```

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
  from the registry instead of all of them — see the full id list in the
  `--help` block above. Omit entirely if not given.
- `--fix` (optional flag): apply fixes after the audit, scoped to haiku-tier
  mechanical findings with a single deterministic corrective action —
  never voice/taxonomy/relationship-graph/coverage-gaps findings, those are
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

Workflow script path: !`echo ${CLAUDE_PLUGIN_ROOT}/workflows/audit-docs-engine.js`

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
  relationship-graph/coverage-gaps findings, those are permanently out of
  `--fix` scope, not a gap to close later)
- if `--file-issues` was set: which findings were filed, in which repo, and
  which were skipped as likely duplicates
- the report file's path
- any check that could not run and why (e.g. a doc outside any git repo,
  so `--file-issues` couldn't resolve an owning repo for it) — never a silent
  drop
