---
name: audit-docs
description: Audit MIF documents under one or more paths for accuracy, taxonomy alignment, editorial consistency, and frontmatter/provenance/temporal/relationship/citation conformance. Deterministic script checks run first at zero Agent cost; cross-document checks are guaranteed (three bounded Agent calls); per-file judgment runs as batched, schema-validated Agent calls over only the files that changed since the last audit. Use when the user asks to audit, review, or check a set of MIF documents for conformance/quality.
argument-hint: "--path <path>... [--batch-size N] [--mif-level 1|2|3] [--checks id,...] [--full] [--fix] [--file-issues] [--report-dir <dir>] [--site-base <base>] [--astro-config <file>] [--help]"
---

# audit-docs

Audits MIF documents (files with MIF frontmatter) via the same 17-check
registry as always — but tiered by where each check is DECIDED, so tokens are
spent only where judgment is genuinely needed:

1. **Deterministic** checks run as plugin scripts, once, over the whole
   corpus. Zero Agent calls.
2. **Cross-document** checks run as at most three bounded Agent calls, fed by
   the deterministic pass's corpus map — guaranteed, never starved.
3. **Per-file judgment** checks run as batched Agent calls (several files per
   call), only over files that changed since the last recorded audit.

Total Agent calls for a run: `C + ceil(dirty_files / batch_size)` (+ fix
batches when `--fix`), where `C` is the number of IN-SCOPE cross-document
checks — at most 3, and 0 when `--checks` excludes them all (a
deterministic-only `--checks` run makes zero Agent calls). State that number
to the user before making any call, and reconcile against it at the end.

**This is a plain skill you drive yourself, turn by turn, in this
conversation — never the Workflow tool.** Read this file's instructions and
execute them directly: run the scripts yourself, call the `Agent` tool
yourself when a step says to, write the report yourself.

## Incident history — why this structure is load-bearing (read before changing)

Three real production failures shaped this skill; each rule below exists
because its absence burned real money.

1. **The Workflow meltdown (v0.9.0, mif-docs-plugin#191/#193).** The original
   background-Workflow implementation spawned one opus agent per individual
   finding with no dedup or cap. Against a 73-file corpus it produced
   thousands of verify calls, hit the Workflow tool's 1000-agent ceiling,
   burned roughly 51M tokens, and tripped the account's session usage limit —
   invisibly, in the background. **Never spawn one `Agent` call per finding,
   and never run this skill as a background Workflow.**
2. **The opus default (PR #195).** Never override any `Agent` call's model to
   `opus` (or any non-default tier) without a specific, stated reason. A
   2026-07-30 run issued ~90 per-file calls as `model: "opus"`, chosen once
   and never revisited, with no finding suggesting the default model would
   have missed anything. **Omit the `model` parameter entirely — let it
   inherit the session's resolved model** — and say so out loud if a concrete
   stated reason ever justifies an exception.
3. **The re-derivation waste (the 2026-07-30 gdlc audit).** 125 files, ~750
   findings, a 266KB report — and zero fixes or filed issues resulted. 265 of
   those findings re-narrated, per file, one mechanical defect class (315
   `.md`-suffix links broken under Starlight routing) that a free script had
   already found corpus-wide before any agent ran; 163 more repeated
   near-identical genre boilerplate; immutable accepted ADRs got voice nits
   recommending "leave as-is"; and the three cross-document checks never ran
   because the budget was exhausted. Two rules fix this structurally:
   **never ask an Agent to check anything a script in this plugin already
   decided**, and **a corpus-wide defect class is ONE finding with an
   instance list, never N findings.**

## `--help` / `-h`

If asked to show help, print the option reference and check registry below,
then stop — do not run discovery, elicitation, or any script or `Agent` call.

```text
audit-docs --path <path>... [options]

Required:
  --path <path>...        One or more files or directories to audit. A
                           directory is recursed to files with MIF
                           frontmatter (plus type: adr documents).

Options:
  --batch-size N           Files per per-file judgment Agent call.
                            Default: 6, max: 10. This bounds call count, not
                            coverage — every dirty file is still audited.
  --mif-level 1|2|3        Target level for the mif-level-gap check only —
                            always an advisory upgrade recommendation, never
                            a failing finding. Default: 3.
  --checks id,id,...        Run only these checks (see the registry below).
                            Default: every check in the registry. The list
                            is partitioned by tier before running: only its
                            deterministic ids (plus relationship-graph, for
                            the structural half) are passed to
                            audit-deterministic.mjs --checks (which rejects
                            judgment/cross-doc ids), only its cross-document
                            ids get Step 4 calls, and only its judgment ids
                            scope the Step 5 batches.
  --full                   Ignore recorded audit state and re-judge every
                            file. Default: only files that changed since the
                            last recorded audit get LLM judgment.
  --fix                    Apply mechanical fixes: defect classes with a
                            fix_command run as one scripted pass re-verified
                            by the same script oracle; per-file fixable
                            findings are applied by batched Agent calls.
                            Never applies to judgment-tier findings.
  --file-issues            File confirmed high-severity findings as GitHub
                            issues in their owning repo, via github-bug-capture
                            search-then-file. Default: off.
  --report-dir <dir>       Where the report and state live, relative to the
                            current working directory.
                            Default: reports/audit-docs.
  --site-base <base>       Starlight site base for route-aware link checking.
  --astro-config <file>    Read the site base from this astro config's
                            base: field instead of --site-base. If neither
                            resolves a base, link-integrity is skipped with
                            a stated reason.
  --help, -h               Show this help and exit.

Check registry (--checks accepts any of these ids):
  Deterministic (decided by plugin scripts, zero Agent cost):
    frontmatter-schema      MIF schema + round-trip conformance (type: adr
                             docs route to the structured-madr oracle)
    mif-level-gap            Current vs. target MIF level (always advisory)
    provenance-drift         Witnessed/asserted provenance coverage
    link-integrity            Route-aware internal link resolution
    ontology-reference        MIF ontology term references resolve
    temporal-metadata         created/modified vs git history (advisory when
                             the corpus's git dates cluster)
    structural-formatting     Heading hierarchy, anchor collisions, unclosed
                             fences (targeted defects only, not style lint)
    relationship-graph        (structural half) dangling relationship targets

  Cross-document (exactly one Agent call each, guaranteed, run BEFORE
  per-file judgment):
    duplication-drift          Same fact asserted differently across the set
    relationship-graph        (semantic half) contradictory/missing edges
    coverage-gaps              An expected doc genre conspicuously missing

  Per-file judgment (batched Agent calls, dirty files only):
    taxonomy-alignment        Semantic/episodic/procedural classification + voice
    editorial-voice            Voice/register consistency
    genre-conformance          Structure vs. the document's declared genre skill
    temporal-staleness        Content describing a retired/superseded system
    accuracy-corpus            Cross-document factual contradictions
    citation-validity          Citation format and existence
    accuracy-code              Code citations checked against actual source

Examples:
  audit-docs --path docs/how-to/deploy.md
  audit-docs --path docs/ --checks frontmatter-schema,link-integrity   # zero Agent calls
  audit-docs --path docs/ --fix --mif-level 2
```

- If no `--path` is given, stop and ask which path(s) to audit — do not guess
  or default to the whole repo.
- If `--batch-size` is given but not an integer in 1..10, stop and ask.

## Step 0 — Resolve plugin paths

This plugin's scripts live at a path that differs per installation — resolve
`${CLAUDE_PLUGIN_ROOT}` yourself (e.g. via `Bash("echo ${CLAUDE_PLUGIN_ROOT}")`)
before anything else. If it didn't expand to a real absolute path, stop and
report that rather than passing an unresolved placeholder forward. Scripts
used below (all under `${CLAUDE_PLUGIN_ROOT}/scripts/`):

- `audit-deterministic.mjs` — the zero-LLM pass (all deterministic checks;
  never use the `validate_mif_document` MCP tool for schema checks — it
  requires pre-converted JSON-LD and fails on markdown, and never use
  `mif-provenance verify` for provenance-drift — it checks against the
  CURRENT session, wrong for pre-existing documents).
- `audit-state.mjs` — incremental state (`status` / `commit`).
- `check-doc-links.mjs` — the link fix oracle for `--fix`.
- `${CLAUDE_PLUGIN_ROOT}/skills` — genre skills; genre-conformance judgment
  is grounded in the matching genre skill file, not general knowledge.

If the deterministic runner reports its schema or ontology cache is not
hydrated, run `npm run hydrate-schema` / `npm run hydrate-ontology` in
`${CLAUDE_PLUGIN_ROOT}` once and retry before giving up on those checks.

## Step 1 — Discover targets and load state (scripts only, no Agent call)

Run:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/audit-state.mjs status \
  --state <report-dir>/state/audit-state.json --paths <path>... [--full]
```

This discovers the MIF document list (scoped to the given paths — it cannot
return anything outside them) and partitions it into **dirty** (needs LLM
judgment: new, changed, or invalidated by a rules/genre-skill change — each
with its reason) and **clean** (prior findings carry forward). Report the
counts and the dirty reasons summary to the user before continuing.

## Step 2 — Budget gate and custom criteria (one AskUserQuestion, maybe)

Compute and print the plan before any Agent call:

```text
Agent calls this run: <C> cross-document (the in-scope subset of 3) +
ceil(<dirty>/<batch-size>) judgment batches [+ fix batches if --fix] =
<N> total. Deterministic checks: 0 calls.
```

If `N > 15` or dirty file count > 60, ask the user ONE `AskUserQuestion`
combining: (a) proceed / trim scope / deterministic-only, and (b) whether to
add custom check criteria beyond the built-in registry for this run. For
smaller runs, ask only (b) — and if they decline, proceed with an empty
custom-checks list; do not invent criteria on their behalf.

## Step 3 — Deterministic pass (scripts only, no Agent call)

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/audit-deterministic.mjs \
  --paths <path>... --report-dir <report-dir> --mif-level <level> \
  [--site-base <base> | --astro-config <file>] [--checks <deterministic subset>]
```

This decides every deterministic check over the FULL corpus (state never
gates it — it is free and keeps the corpus map current) and writes:

- `<report-dir>/findings/deterministic.json` — pinned-schema findings
- `<report-dir>/classes.json` — defect classes (one root cause, instance
  list, `fix_command` when mechanical)
- `<report-dir>/corpus-map.json` — per-file genre/mutability/level/dates/
  headings/relationships, plus each file's `mutability`
  (mutable | immutable | episodic) and oracle

Report any `SKIPPED <check>: <reason>` lines to the user — a check that
couldn't run is stated, never silently dropped. Everything this pass decided
is now **settled**: no Agent call below may re-check it or re-report its
findings.

## Step 4 — Cross-document checks (at most 3 Agent calls, guaranteed, run NOW)

Before any per-file judgment, make **one `Agent` call per in-scope
cross-document check** (duplication-drift, relationship-graph semantic half,
coverage-gaps) — never one per file, never one per finding, no `model`
parameter. These run first so they can never again be starved by per-file
spending. Each call receives:

- The full `corpus-map.json` content (titles, headings, genres, levels,
  relationships — sufficient to reason across the set without re-reading
  every file; the agent may Read specific files it needs to confirm a
  suspicion).
- The defect-class summary from `classes.json` (context, not to re-report).
- The instruction to adversarially re-check its own findings before
  returning, and the SAME pinned `mif-docs/audit-findings@1` output contract
  Step 5 shows — validated with `validateFindings` passing
  `allowedCheckIds: ["<this call's one check id>"]`, so a cross-doc agent
  can never smuggle findings for a check it was not asked to run.

Check semantics:

- `duplication-drift`: the same current fact asserted differently in more
  than one document — including a current fact living only in an episodic
  doc (taxonomy violation).
- `relationship-graph`: contradictory or conspicuously missing edges between
  the set's documents (dangling targets are already settled — deterministic).
- `coverage-gaps`: an expected doc genre conspicuously missing for the
  audited scope; report with `files` set to the shared directory.

## Step 5 — Per-file judgment (batched Agent calls over dirty files only)

Group the **dirty** files by top-level directory, then genre within it; fill
batches to at most `batch-size` files (default 6, max 10) and ~50KB of
combined body text — any single file over 25KB gets its own batch. Then make
**one `Agent` call per batch** (label it with the batch's directory + index).
Each call's prompt must contain:

1. The batch's file list, each with its genre and matching genre-skill path
   under `${CLAUDE_PLUGIN_ROOT}/skills/`.
2. Scope: ONLY the seven per-file judgment checks (plus any user-elicited
   custom criteria). An explicit exclusion block: "These checks were already
   decided by scripts — report nothing for them: <deterministic ids>. These
   corpus-wide defect classes are already known — never report an instance
   of them: <class_id: one-line description each>."
3. The immutable/episodic policy below, with each batch file's `mutability`
   from the corpus map.
4. Caps: at most 5 findings per file, at most 2 of them `low`; **no cap on
   `high`**; overflow goes in `per_file_meta.<file>.suppressed_count`, never
   silently. If the same defect pattern appears in 3+ files of the batch,
   emit ONE finding with all files in `files[]`, not one per file.
5. Grounding rules: read the doc itself, a cited sibling, the matching genre
   skill, directly referenced source files — but never clone into or run
   tooling from another repository to chase certainty; state a
   best-confidence finding (with `confidence`) and note what couldn't be
   verified. `evidence` must name what was actually read or run, in which
   file — a finding whose anchor can't be located in the named file is
   dropped.
6. Adversarial self-refutation: "Before finalizing, go back through each
   finding and try to refute it. Drop any finding that doesn't survive its
   own scrutiny, or downgrade its confidence if it's borderline."
7. **No `model` parameter** (see incident 2).
8. The pinned output contract: return ONLY a JSON object, no YAML, no prose:

```json
{
  "schema": "mif-docs/audit-findings@1",
  "batch_id": "<dir>-<n>",
  "files_audited": ["<every assigned file>"],
  "files_clean": ["<assigned files with zero findings>"],
  "findings": [{
    "check_id": "<one of the seven judgment ids>",
    "files": ["<file(s) the defect was observed in>"],
    "anchor": {"line": 42, "excerpt": "<short quote>"},
    "severity": "low|medium|high",
    "confidence": "low|medium|high",
    "summary": "<one sentence>",
    "evidence": "<what was read/run that proves it, naming the file>",
    "recommendation": "<concrete edit>",
    "fixable": false,
    "immutable_doc": false,
    "supersession_candidate": false
  }],
  "per_file_meta": {"<file>": {"finding_count": 2, "suppressed_count": 0}}
}
```

Validate every batch's returned JSON with
`${CLAUDE_PLUGIN_ROOT}/scripts/lib/audit-findings.mjs`'s `validateFindings`
— a short `node -e` call passing the payload, `expectedFiles` set to the
batch's assigned file list, and `allowedCheckIds` set to the seven judgment
ids (plus nothing else), so a registry-valid but out-of-scope check_id
(e.g. `duplication-drift` from a batch agent) fails validation instead of
slipping through. On failure: re-ask that agent once with the validation errors; if it
fails again, fall back to one call per file **for that batch only** — still
bounded, still O(files). Record actual call counts as you go.

After each batch resolves, note interim progress (batches done, findings so
far) so the user can see and interrupt at any point.

## Immutable and episodic documents

The corpus map marks each file's `mutability`. Policy (enforced via the
batch prompt, and applied when triaging returned findings):

- **immutable** (accepted/superseded/rejected/deprecated ADRs and
  equivalent terminal-status decision records): suppress editorial-voice,
  taxonomy-alignment, and genre-structure nits entirely. Accuracy-tier
  findings (accuracy-code, accuracy-corpus, temporal-staleness) are
  reportable ONLY as `supersession_candidate: true`, with a recommendation
  to write a superseding record or a dated audit-trail entry — never to edit
  the accepted text. **If the recommendation for an immutable doc would be
  to leave it unchanged, that is not a finding — drop it.** `--fix` never
  touches an immutable doc's body; link fixes inside one require the user's
  explicit per-file confirmation.
- **episodic** (changelogs, briefings, `conceptType: episodic`): suppress
  voice/genre nits; keep accuracy and temporal checks — an episodic doc
  asserting a current fact that lives nowhere semantic is exactly
  duplication-drift's business.

## Step 6 — Fix (only if `--fix`)

1. **Defect classes first:** every class in `classes.json` with a
   `fix_command` runs as that one scripted pass, then the same script
   re-runs as the oracle to confirm the class is gone (e.g.
   `check-doc-links.mjs --write` then a clean re-check). One command, one
   verification — never an Agent call per instance.
2. **Per-file mechanical findings:** for files with `fixable: true` findings
   from deterministic or judgment passes, batch them exactly like Step 5
   (one Agent call per batch, same caps) to apply each fix and re-run the
   relevant tool-backed check once. Judgment-tier findings
   (voice/taxonomy/genre/cross-document) are permanently out of `--fix`
   scope — not a gap to close later.

## Step 7 — Report, issues, and state commit (no Agent call)

Write `<report-dir>/audit-<slug>.md` in this exact order — triage first,
detail behind it, medium/low **never individually narrated** (that is what
made the 266KB report unread; their detail lives in the JSON sidecars):

```text
# Audit: <scope> — <date>
## Triage
- One verdict line: N files (D judged, C carried), H high / M medium / L low,
  K defect classes
- Budget line: planned vs actual Agent calls (any excess is the incident
  signal — call it out, see "When reporting back")
### Top findings        (≤10 rows: severity | file | check | summary | action)
### Defect classes      (class | instances | files | fix: `<command>` or "manual")
### Do next             (numbered concrete actions: "run <command>",
                         "file issue for X", "write superseding ADR for Y")
## Cross-document findings   (full detail)
## High-severity findings    (full detail)
## Defect class details      (per class: cause, 5 sample instances, pointer
                              to classes.json for the machine list)
## Medium/low                (counts per file+check only; detail in sidecars)
## Suppressed and skipped    (immutable suppressions, incremental skips,
                              skipped checks with reasons — never silent)
## Run metadata              (flags, state file, checks_version, model note,
                              per-batch call log)
```

Carried findings from clean files appear in their sections marked
`(carried, unchanged since <date>)`.

If `--file-issues`: file every confirmed `severity: high` finding as a
GitHub issue in its owning repo via the `github-bug-capture` search-then-file
pattern (dedup first) — directly with your own tool calls, not through
another `Agent` call.

Finally, commit state so the next run is incremental:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/audit-state.mjs commit \
  --state <report-dir>/state/audit-state.json --paths <path>... \
  --results <results.json> --plugin-version <version>
```

where `results.json` lists every file judged this run:
`[{file, llm_verdict: "clean"|"findings", finding_counts, findings_ref,
genre_skill_key, genre_skill_sha256}]` (the keys/hashes come from Step 1's
`status` output). A subsequent run over an unchanged corpus then partitions
to zero dirty files and costs **zero Agent calls**.

## When reporting back to the user

- The finalized check registry actually run (built-in + elicited custom).
- Files audited (judged vs carried), and **planned vs actual Agent-call
  count** — `in-scope cross-doc + batches (+ fix batches)`. Call out any
  excess explicitly:
  that divergence is the early signal of every incident above.
- Findings grouped per the report template; defect classes as classes.
- If `--fix`: what was fixed by script oracle, what by batch, what remains.
- If `--file-issues`: filed / skipped-as-duplicate, with links.
- Any check that couldn't run and why — never a silent drop.
