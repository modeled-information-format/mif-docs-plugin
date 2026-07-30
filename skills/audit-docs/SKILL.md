---
name: audit-docs
description: Audit MIF documents under one or more paths for accuracy, taxonomy alignment, editorial consistency, and frontmatter/provenance/temporal/relationship/citation conformance. Runs entirely as bounded, in-conversation Agent calls — one per file, plus a small fixed number for cross-document checks — never a background Workflow. Use when the user asks to audit, review, or check a set of MIF documents for conformance/quality.
argument-hint: "--path <path>... [--batch-size N] [--mif-level 1|2|3] [--checks id,id,...] [--fix] [--file-issues] [--report-dir <dir>] [--help]"
---

# audit-docs

Audits MIF documents (files with MIF frontmatter) for schema conformance,
provenance, temporal consistency, editorial voice, taxonomy alignment, genre
conformance, cross-document accuracy, citations, and coverage gaps — via the
same 17-check registry the earlier Workflow-based version used.

**This is a plain skill you drive yourself, turn by turn, in this
conversation — never the Workflow tool.** Read this file's instructions and
execute them directly: call the `Agent` tool yourself when a step says to,
call scripts yourself, write the report yourself. There is no
`Workflow({...})` call anywhere in this skill.

## Why no Workflow tool (read before changing this)

The original implementation (`workflows/audit-docs.js`) ran as a background
Workflow and failed twice in production:

1. A naming collision where the workflow's `meta.name` shadowed the
   equivalent hand-authored command, making its own `--help`/`argument-hint`
   unreachable (mif-docs-plugin#191).
2. Far more seriously: its Verify phase spawned **one opus agent per
   individual finding**, with no dedup or cap. Against a 73-file corpus this
   produced thousands of verify calls, hit the Workflow tool's hard 1000-agent
   safety ceiling, burned roughly 51M tokens, and tripped the account's
   session usage limit — all invisibly, in the background, before anyone
   could see it happening or interrupt it.

This skill exists specifically to make that class of failure structurally
impossible: **every step below fans out at most once per file** (never once
per finding, never once per check), the total number of `Agent` calls for a
run is `O(files)`, not `O(files x checks x findings)`, and because you run it
turn by turn in this conversation, the user can see it happening and
interrupt at any point — no silent background runaway.

**Never spawn one `Agent` call per finding.** If a future edit to this file
does that, it reintroduces the exact incident described above.

**Never override the per-file `Agent` call's model to `opus` (or any
non-default tier) without a specific, stated reason.** This skill's bounded
`O(files)` call count fixed the *fan-out* half of the original incident, but
a 2026-07-30 run against a 125-file corpus reintroduced the same class of
unnecessary cost a different way: every one of ~90 per-file `Agent` calls was
issued with `model: "opus"`, chosen once at the start of the run and never
revisited, with no finding afterward suggesting sonnet would have missed
anything. The per-file checks here (read a doc, read a handful of cited
siblings, run a grep or two against real source, judge voice/structure/
accuracy) are exactly the kind of grounded-but-not-frontier judgment work the
session's default model handles well. **Omit the `model` parameter entirely
in Step 2 and Step 4's `Agent` calls — let it inherit the session's resolved
model.** Only pass an explicit `model` override if the run has a concrete,
stated reason to need a different tier (e.g. the user directly asked for a
specific model), and say so out loud when you do it.

## `--help` / `-h`

If asked to show help, print the option reference and check registry below,
then stop — do not run discovery, elicitation, or any `Agent` call.

```text
audit-docs --path <path>... [options]

Required:
  --path <path>...        One or more files or directories to audit. A
                           directory is recursed (via Glob, scoped to that
                           directory — it cannot discover anything outside it).

Options:
  --batch-size N           How many files to process before pausing to report
                            interim progress to the user. Default: 10. Purely
                            a reporting cadence, not a concurrency or fan-out
                            control — every file still gets exactly one Agent
                            call regardless of this value.
  --mif-level 1|2|3        Target level for the mif-level-gap check only —
                            reported as an advisory upgrade recommendation,
                            never a failing finding. frontmatter-schema always
                            validates at level 1 regardless of this flag, and
                            its violations ARE real findings, not advisory.
  --checks id,id,...        Run only these checks (see the registry below).
                            Default: every check in the registry.
  --fix                    After auditing, apply fixes for haiku-tier
                            mechanical findings with one deterministic
                            corrective action. Default: off (report-only).
                            Never applies to judgment-tier findings
                            (voice/taxonomy/relationship-graph/coverage-gaps).
  --file-issues            File confirmed high-severity findings as GitHub
                            issues in their owning repo, via github-bug-capture
                            search-then-file. Default: off.
  --report-dir <dir>       Where the report is written, relative to the
                            current working directory. Default: reports/audit-docs.
  --help, -h                Show this help and exit.

Check registry (--checks accepts any of these ids):
  Tool-backed (a real CLI/tool is the oracle, not just judgment):
    frontmatter-schema      MIF schema + round-trip conformance (mif-validate CLI)
    mif-level-gap            Current vs. target MIF level (advisory)
    provenance-drift         Witnessed/asserted provenance coverage
    link-integrity            Internal/external links actually resolve
    ontology-reference        MIF ontology term references resolve

  LLM judgment, mechanical in scope (routed here for cost, not because a tool verifies them):
    structural-formatting      Heading hierarchy, code fences, table formatting
    temporal-metadata          created/modified field consistency

  LLM judgment, per-document:
    taxonomy-alignment        Semantic/episodic/procedural classification + voice
    editorial-voice            Voice/register consistency
    genre-conformance          Structure vs. the document's declared genre skill
    temporal-staleness        Content describing a retired/superseded system
    accuracy-corpus            Cross-document factual contradictions
    citation-validity          Citation format and existence
    accuracy-code              Code citations checked against actual source

  LLM judgment, cross-document (run once per whole audited set, not per file):
    duplication-drift          Same fact asserted differently across the set
    relationship-graph        MIF relationship graph resolves within the set
    coverage-gaps              An expected doc genre conspicuously missing

Examples:
  audit-docs --path docs/how-to/deploy.md
  audit-docs --path docs/ --checks frontmatter-schema,editorial-voice
  audit-docs --path docs/ --fix --mif-level 2
```

- If no `--path` is given, stop and ask which path(s) to audit — do not guess
  or default to the whole repo.
- If `--batch-size` is given but not a positive integer, stop and ask.

## Before starting: elicit custom criteria

Ask the user, via `AskUserQuestion`, whether they want to add any custom
check criteria beyond the built-in registry above for this run (e.g. a
project-specific consistency rule not covered by the standard checks). If
they decline or add nothing, proceed with an empty custom-checks list — do
not invent criteria on their behalf.

## Resolve plugin-relative paths

This plugin's own scripts live at a path that differs per installation —
resolve these yourself (e.g. via `Bash("echo ${CLAUDE_PLUGIN_ROOT}/...")`)
before the per-file step, never assume the audited path is inside this
plugin's own repo:

- `mifValidateScript`: `${CLAUDE_PLUGIN_ROOT}/scripts/mif-validate.mjs`
  (frontmatter-schema/mif-level-gap use this CLI, never the
  `validate_mif_document` MCP tool — that tool requires pre-converted
  JSON-LD and fails on markdown, confirmed by direct test).
- `mifProvenanceCorpusCheckScript`:
  `${CLAUDE_PLUGIN_ROOT}/scripts/provenance-corpus-check.mjs`
  (provenance-drift uses this, not `mif-provenance verify` — that tool
  checks against the CURRENT session, which is wrong for auditing a
  pre-existing document authored in a past session).
- `skillsRoot`: `${CLAUDE_PLUGIN_ROOT}/skills` (genre-conformance grounds its
  judgment in the actual genre skill file here, not general knowledge of
  what a genre "should" look like).

If `${CLAUDE_PLUGIN_ROOT}` didn't actually expand to a real absolute path,
stop and report that rather than passing an unresolved placeholder forward.

## Step 1 — Discover targets (no Agent call; use Glob/Grep directly)

For each literal file path in `--path`, use it as-is. For each directory,
`Glob` for MIF documents (files with MIF frontmatter — YAML/JSON-LD
frontmatter declaring a MIF `type`) **scoped to that directory** — a `Glob`
call rooted at the given directory cannot return anything outside it, so
there is no separate containment check to write or verify here (unlike the
old Workflow, which delegated discovery to a subagent and then had to
independently re-verify its output stayed in scope). Skip any file that
doesn't actually have MIF frontmatter, and say how many were excluded and
why.

Report the resolved file list and count to the user before continuing.

## Step 2 — Per-file audit (exactly one Agent call per file)

For each discovered file, make exactly one `Agent` call (label it with the
file path) that:

1. Runs every applicable **doc-scoped** check from the registry above
   (everything except duplication-drift/relationship-graph/coverage-gaps,
   which are cross-document and handled in Step 3) against that one file.
2. **Adversarially re-checks its own findings before returning them** —
   instruct it explicitly: "Before finalizing, go back through each finding
   and try to refute it. Drop any finding that doesn't survive its own
   scrutiny, or downgrade its confidence if it's borderline." This replaces
   the old design's separate per-finding verify fan-out with a single
   self-verification pass inside the same call — no second wave of agents.
3. Returns a structured result: `file`, and an array of findings each with
   `anchor`, `check_id`, `dimension`, `severity` (low/medium/high),
   `current_mif_level`, `target_mif_level`, `summary`, `recommendation`,
   `fixable` (true only for tool-backed mechanical checks with one
   deterministic corrective action).

Prompt content for this call should carry forward the same per-check
instructions, cost bounds, and grounding rules the original registry used
(read a handful of directly relevant files — the doc itself, a cited
sibling, the matching genre skill, a schema file — but never clone into or
run tooling from another repository to chase certainty; state a
best-confidence finding and note what couldn't be verified instead). Report
every structural/register fact observed regardless of whether the document
looks like a deliberate example, template, or antipattern demonstration —
never infer intent to suppress an otherwise-true finding; whether it's
actionable is the caller's decision, not the checking agent's.

If `--batch-size` files have been processed, pause and report interim
progress (files done, findings so far) before continuing — this is purely a
reporting cadence, not a concurrency limit.

## Step 3 — Cross-document checks (small, fixed number of Agent calls)

After every file in Step 2 is done, make **one Agent call per cross-document
check that's in scope** (at most 3: duplication-drift, relationship-graph,
coverage-gaps) — never one per file, never one per finding. Each call gets
the full file list and every finding collected in Step 2 as context, and
checks across the whole set:

- `duplication-drift`: the same current fact asserted differently in more
  than one document — flag per the taxonomy rule that a current fact must
  never live only in an episodic doc, and per the one-document-one-bucket
  rule.
- `relationship-graph`: the MIF relationship graph resolves with no dangling
  or contradictory links between the set's own documents.
- `coverage-gaps`: an expected doc genre is conspicuously missing for the
  audited scope (e.g. ADRs exist but no glossary). Report with `file` set to
  the shared directory, not a single file.

## Step 4 — Fix (only if `--fix` was given)

For each file with at least one `fixable: true` confirmed finding, make one
`Agent` call (bounded, same shape as Step 2) that applies every mechanical
fix for that file and re-runs the relevant tool-backed check once to confirm
it now passes. Never fix judgment-tier findings (voice/taxonomy/
relationship-graph/coverage-gaps) — permanently out of scope for `--fix`,
not a gap to close later.

## Step 5 — Report and file issues (no Agent call; do this yourself)

Write a markdown report to `<report-dir>/audit-<timestamp-or-slug>.md`
(default `reports/audit-docs/`, relative to the current working directory)
grouping findings by severity, each with `file`, `check_id`, `summary`,
`recommendation`, and whether it was auto-fixed.

If `--file-issues` was given, file every confirmed `severity: high` finding
as a GitHub issue in its owning repo via the `github-bug-capture` search-
then-file pattern (check for duplicates first) — do this directly with your
own tool calls, not through another `Agent` call.

## When reporting back to the user

- The finalized check registry actually run (built-in + any elicited custom
  checks).
- File count audited, and the actual number of `Agent` calls made (should be
  close to `file_count + fix_file_count + cross_document_check_count` —
  call out explicitly if it wasn't, since that's the exact signal the prior
  incident would have shown early).
- Findings grouped by severity.
- If `--fix`: which findings were fixed vs. left for manual action.
- If `--file-issues`: which findings were filed, where, and which were
  skipped as likely duplicates.
- The report file's path.
- Any check that couldn't run and why (e.g. a doc outside any git repo, so
  `--file-issues` couldn't resolve an owning repo) — never a silent drop.
