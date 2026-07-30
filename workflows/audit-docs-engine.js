// Named 'audit-docs-engine', not 'audit-docs': Claude Code auto-registers plugin workflows as
// /<plugin>:<meta.name>, which collided with and silently shadowed commands/audit-docs.md's
// authored --help/argument-hint/elicitation logic (mif-docs-plugin#191).
export const meta = {
  name: 'audit-docs-engine',
  description: 'Audit MIF documents for accuracy, taxonomy alignment, editorial consistency, and frontmatter/provenance/temporal/relationship/citation conformance, with per-check model routing and configurable batching',
  phases: [
    { title: 'Design', detail: 'discover targets, finalize check registry (built-in + elicited custom checks), plan batches' },
    { title: 'Audit', detail: 'per-doc checks routed by model tier, per-batch cross-doc checks, batches pipelined' },
    { title: 'Verify', detail: 'adversarial re-check of judgment-tier findings before they count as confirmed' },
    { title: 'Fix', detail: 'apply mechanically-safe fixes when args.fix is set, single re-check per fix' },
    { title: 'Report', detail: 'write the audit report and optionally file high-severity findings as issues' },
  ],
}

const DISCOVER_SCHEMA = {
  type: 'object',
  properties: {
    files: { type: 'array', items: { type: 'string' } },
    excluded: { type: 'array', items: { type: 'string' } },
  },
  required: ['files', 'excluded'],
}

const FINDINGS_SCHEMA = {
  type: 'object',
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          file: { type: 'string' },
          anchor: { type: 'string' },
          check_id: { type: 'string' },
          dimension: { type: 'string' },
          severity: { type: 'string', enum: ['low', 'medium', 'high'] },
          current_mif_level: { type: 'integer' },
          target_mif_level: { type: 'integer' },
          summary: { type: 'string' },
          recommendation: { type: 'string' },
          fixable: { type: 'boolean' },
        },
        required: ['file', 'check_id', 'dimension', 'severity', 'summary', 'recommendation', 'fixable'],
      },
    },
  },
  required: ['findings'],
}

const VERDICT_SCHEMA = {
  type: 'object',
  properties: {
    refuted: { type: 'boolean' },
    reasoning: { type: 'string' },
  },
  required: ['refuted', 'reasoning'],
}

// One fix agent handles every fixable finding for a single file, sequentially, to avoid two
// concurrent agents editing the same file (lost updates) — see per-file grouping below.
const FIX_GROUP_SCHEMA = {
  type: 'object',
  properties: {
    applied: { type: 'array', items: { type: 'boolean' } },
    summary: { type: 'string' },
  },
  required: ['applied', 'summary'],
}

const REPORT_SCHEMA = {
  type: 'object',
  properties: {
    reportPath: { type: 'string' },
    filedIssues: {
      type: 'array',
      items: {
        type: 'object',
        properties: { file: { type: 'string' }, issueUrl: { type: 'string' } },
        required: ['file', 'issueUrl'],
      },
    },
  },
  required: ['reportPath', 'filedIssues'],
}

// Extensible check registry: add a record here to add a check. Never touch
// the finding schema or the orchestration logic below to add one.
const CHECKS = [
  { id: 'frontmatter-schema', dimension: 'frontmatter', tier: 'haiku', scope: 'doc',
    instructions: "Run `node <mifValidateScript> <file> --level 1` — <mifValidateScript> is the absolute path supplied in args.mifValidateScript, resolved by the invoking command from its own installation. Do NOT use the validate_mif_document MCP tool for this — it requires a pre-converted JSON-LD projection and fails on markdown input, which is what real documents actually are; confirmed by direct test. The CLI exits 3 (not 1) when its schema cache isn't hydrated locally — that is an environment/tooling gap, not a document defect; report it as a single low-severity 'audit environment not hydrated (run npm run hydrate-schema)' note, never as a schema/conformance finding. Only exit 1 (with its numbered failure list) represents real document violations — report those. If args.mifValidateScript was not supplied, say so explicitly as a finding rather than silently skipping." },
  { id: 'mif-level-gap', dimension: 'frontmatter', tier: 'haiku', scope: 'doc',
    instructions: "Using the same `node <mifValidateScript> <file> --level <target>` run (re-run at the target level if one was given, otherwise at level 1), compare the document's current passing level to the target level — same exit-3-vs-exit-1 distinction as frontmatter-schema applies here too. Advisory only: report a gap as an upgrade recommendation with severity 'low' or 'medium', never as a failing/high-severity finding." },
  { id: 'provenance-drift', dimension: 'provenance', tier: 'haiku', scope: 'doc',
    instructions: "Run `node <mifProvenanceCorpusCheckScript> --dir <the directory containing this file>` — <mifProvenanceCorpusCheckScript> is the absolute path supplied in args.mifProvenanceCorpusCheckScript, resolved by the invoking command from its own installation. Do NOT use `mif-provenance verify` for this (a different script, args.mifProvenanceScript) — it checks against the CURRENT session, which is wrong for auditing a pre-existing document authored in a past session, and produces false 'unwitnessed' results for exactly that reason. The corpus-check script's output has a 'per file:' section listing every file's status (witnessed/asserted/none) — find this file's row and report based on that: 'none' (no provenance block at all) is worth a low-severity note only if the target MIF level requires provenance; 'asserted' (a provenance block exists but isn't witnessed) is informational, not a defect, unless the document claims witnessed provenance it doesn't have. Skip this check with no finding if args.mifProvenanceCorpusCheckScript was not supplied." },
  { id: 'link-integrity', dimension: 'relationships', tier: 'haiku', scope: 'doc',
    instructions: 'Check every internal and external link in the document actually resolves. Report dangling internal links and dead external links.' },
  { id: 'ontology-reference', dimension: 'relationships', tier: 'haiku', scope: 'doc',
    instructions: 'Resolve every MIF ontology term reference in the document via the resolve_ontology_reference tool. Report any reference that fails to resolve or resolves to a superseded term.' },
  { id: 'structural-formatting', dimension: 'structure', tier: 'haiku', scope: 'doc',
    instructions: 'Check heading hierarchy (no skipped levels), code-block fencing validity, and table well-formedness. Report violations.' },
  { id: 'temporal-metadata', dimension: 'temporal', tier: 'haiku', scope: 'doc',
    instructions: "Check the document's created/modified frontmatter fields for internal consistency (e.g. modified before created is invalid). Report inconsistencies." },
  { id: 'taxonomy-alignment', dimension: 'taxonomy-alignment', tier: 'sonnet', scope: 'doc',
    instructions: "Using this org's MIF documentation-taxonomy rules (semantic/episodic/procedural), judge whether this document is correctly classified and whether its voice/register/mood matches its declared bucket (present-tense indicative for semantic, past-tense agentless for episodic, second-person imperative for procedural). Report register shifts, misclassification, or bucket-mixing (e.g. procedural content embedded in a semantic doc). Report every structural/register fact you observe, quoting the specific line or section, regardless of whether the document appears to be a deliberate example, template, or antipattern demonstration — do not infer intent and use it to suppress an otherwise-true finding. State the fact; whether it is actionable is the caller's decision, not yours." },
  { id: 'editorial-voice', dimension: 'editorial-voice', tier: 'sonnet', scope: 'doc',
    instructions: 'Judge voice/register consistency within this document and, where sibling documents from the same batch are visible, against them. Report inconsistencies. Report every inconsistency you observe regardless of whether the document appears to be a deliberate example, template, or antipattern demonstration — do not infer intent and use it to suppress an otherwise-true finding.' },
  { id: 'genre-conformance', dimension: 'genre-conformance', tier: 'sonnet', scope: 'doc',
    instructions: "If the document declares a genre (ADR, PRD, runbook, etc.), compare its structure against that genre's required sections from the matching mif-docs genre skill. Report missing or malformed required sections, quoting the specific section/line for each. Report every structural fact you observe regardless of whether the document appears to be a deliberate example, template, or antipattern demonstration (e.g. self-labeled 'antipattern' frontmatter, an 'antipattern' namespace/tag, or inline comments narrating its own flaws) — do not infer intent from such labeling and use it to suppress an otherwise-true finding. Whether a true finding is actionable (a real bug to fix, versus a fixture correctly embodying its documented purpose) is the caller's decision to make from the reported facts, not something to pre-filter here." },
  { id: 'temporal-staleness', dimension: 'temporal', tier: 'sonnet', scope: 'doc',
    instructions: 'Judge whether the content (not just the metadata) describes a system, tool, or convention that has since been retired or superseded. Report content staleness even when created/modified metadata looks current.' },
  { id: 'accuracy-corpus', dimension: 'accuracy', tier: 'sonnet', scope: 'doc',
    instructions: 'Using search_documents/find_similar_documents, check this document for internal self-consistency and consistency against related documents in the corpus. Report contradictions.' },
  { id: 'citation-validity', dimension: 'citations', tier: 'sonnet', scope: 'doc',
    instructions: 'Check every citation in the document for correct format and that the cited source plausibly exists/is reachable. Report invalid or unverifiable citations.' },
  { id: 'accuracy-code', dimension: 'accuracy', tier: 'opus', scope: 'doc',
    instructions: 'Only produce a finding if the document cites a specific file path, function name, or line number from a codebase. Read the actual referenced code and verify the claim is still accurate. Return zero findings quickly if the document makes no such citation.' },
  { id: 'duplication-drift', dimension: 'duplication', tier: 'opus', scope: 'batch',
    instructions: "Across every document in this batch, use find_similar_documents/search_documents to detect the same current fact asserted in more than one place. Flag the drift risk per the taxonomy rule that a current fact must never live only in an episodic doc, and per the one-document-one-bucket rule." },
  { id: 'relationship-graph', dimension: 'relationships', tier: 'opus', scope: 'batch',
    instructions: "Across every document in this batch, check the MIF relationship graph resolves with no dangling or contradictory links between the batch's own documents." },
  { id: 'coverage-gaps', dimension: 'coverage', tier: 'opus', scope: 'batch',
    instructions: "Across every document in this batch, judge whether an expected doc genre is conspicuously missing for the audited scope (e.g. ADRs exist but no glossary; a feature has a PRD but no how-to). Report as a finding with file set to the batch's shared directory rather than a single file." },
]

function resolveChecks(requestedIds, customChecks) {
  const registry = requestedIds && requestedIds.length
    ? CHECKS.filter(c => requestedIds.includes(c.id))
    : CHECKS
  if (requestedIds && requestedIds.length) {
    const unknown = requestedIds.filter(id => !CHECKS.some(c => c.id === id))
    if (unknown.length) {
      log(`--checks requested ${unknown.length} unknown check id(s), not run (no silent drop): ${JSON.stringify(unknown)}. Known ids: ${JSON.stringify(CHECKS.map(c => c.id))}`)
    }
  }
  const custom = (customChecks || []).map((text, i) => ({
    id: `custom-${i + 1}`,
    dimension: 'custom',
    tier: 'sonnet',
    scope: 'doc',
    instructions: text,
  }))
  return [...registry, ...custom]
}

function chunk(list, size) {
  const out = []
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size))
  return out
}

function findingsPrompt(target, relevantChecks, mifLevel, mifProvenanceCorpusCheckScript, skillsRoot, mifValidateScript) {
  return (
    `Audit exactly one document, ${target}, against these checks:\n` +
    relevantChecks.map(c => `- [${c.id}] ${c.instructions}`).join('\n') +
    (mifLevel ? `\nTarget MIF level for the mif-level-gap check: ${mifLevel}.` : '') +
    (relevantChecks.some(c => c.id === 'provenance-drift')
      ? `\nmifProvenanceCorpusCheckScript for the provenance-drift check: ${mifProvenanceCorpusCheckScript || '(not supplied — skip that check)'}`
      : '') +
    (relevantChecks.some(c => c.id === 'frontmatter-schema' || c.id === 'mif-level-gap')
      ? `\nmifValidateScript for the frontmatter-schema/mif-level-gap checks: ${mifValidateScript || '(not supplied — skip those checks)'}`
      : '') +
    (relevantChecks.some(c => c.id === 'genre-conformance')
      ? `\nFor genre-conformance: identify the document's declared genre, then read the ACTUAL genre skill ` +
        `at ${skillsRoot || '(skillsRoot not supplied — infer the path, or skip this check if you cannot)'}` +
        `/<genre-slug>/SKILL.md before judging — ground your findings in what that file actually requires, ` +
        'not in your own general knowledge of what the genre "should" look like. If the genre or its skill ' +
        'file cannot be identified, say so explicitly rather than silently skipping the check.'
      : '') +
    '\nCost bound: reading a handful of directly relevant files (the document itself, a cited sibling, ' +
    'the matching genre skill, a schema file if one is quickly located) is expected and encouraged. Do ' +
    'NOT clone into, run tooling from, or execute validator scripts in another repository to empirically ' +
    'prove a claim — if you cannot ground a finding from files already reasonably reachable, state the ' +
    'finding with your best available confidence and note what you could not verify, rather than spending ' +
    'extended time/tool-calls chasing certainty. This audit runs at scale across many documents; a single ' +
    "check's cost must stay small and predictable, not open-ended research." +
    '\nSome checks (accuracy-code, accuracy-corpus, citation-validity, editorial-voice) may require ' +
    `reading or searching OTHER files for context — that is expected. Even so, every finding's \`file\` ` +
    `field must be ${target} itself; never emit a finding whose file is anything else, and never treat ` +
    'this audit as license to discover or report on documents beyond the one given here.' +
    '\nReturn every finding as a structured record: file, anchor, check_id, dimension, severity, ' +
    'current_mif_level, target_mif_level, summary, recommendation, fixable (true only for haiku-tier ' +
    'mechanical checks with one deterministic corrective action, false otherwise). Return an empty ' +
    'findings array if nothing to report — do not invent a finding to have something to say.'
  )
}

// The runtime delivers args as a JSON string in some invocation paths — defensively re-parse,
// matching this workspace's other workflow scripts (e.g. ticket-pipeline.js).
const resolvedArgs = typeof args === 'string'
  ? (() => {
      try { return JSON.parse(args) } catch (e) { throw new Error(`audit-docs received args as an unparsed string and it is not valid JSON: ${e.message}`) }
    })()
  : args

if (!resolvedArgs || !Array.isArray(resolvedArgs.paths) || resolvedArgs.paths.length === 0) {
  throw new Error('audit-docs requires args.paths: a non-empty array of file/directory paths')
}
const batchSize = Number.isInteger(resolvedArgs.batchSize) && resolvedArgs.batchSize > 0 ? resolvedArgs.batchSize : 5

phase('Design')
const checks = resolveChecks(resolvedArgs.checks, resolvedArgs.customChecks)
const docChecks = checks.filter(c => c.scope === 'doc')
const batchChecks = checks.filter(c => c.scope === 'batch')
const haikuChecks = docChecks.filter(c => c.tier === 'haiku')
const sonnetChecks = docChecks.filter(c => c.tier === 'sonnet')
const opusDocChecks = docChecks.filter(c => c.tier === 'opus')
log(
  `Check registry: ${checks.length} checks — ${haikuChecks.length} haiku, ` +
  `${sonnetChecks.length + batchChecks.filter(c => c.tier === 'sonnet').length} sonnet, ` +
  `${opusDocChecks.length + batchChecks.filter(c => c.tier === 'opus').length} opus ` +
  `(${(resolvedArgs.customChecks || []).length} elicited custom checks included)`
)

// Deterministic containment check — plain string comparison, no filesystem/Node API needed, and no
// dependence on any agent's judgment. Used both to skip discovery entirely for literal file paths
// and, below, as a second independent check on whatever a discovery agent returns for directories.
// Resolves '.'/'..' segments itself (no Node `path` module available to this script) so a path like
// '/repo/skills/templates/../../../secrets/x.md' can't bypass containment via string-prefix matching
// alone — it must resolve to its real target before the prefix comparison runs.
function normalizeForContainment(p) {
  const raw = String(p).replace(/\\/g, '/')
  const isAbsolute = raw.startsWith('/')
  const resolved = []
  for (const part of raw.split('/')) {
    if (part === '' || part === '.') continue
    if (part === '..') {
      if (resolved.length && resolved[resolved.length - 1] !== '..') resolved.pop()
      else if (!isAbsolute) resolved.push('..')
      continue
    }
    resolved.push(part)
  }
  return (isAbsolute ? '/' : '') + resolved.join('/')
}
function isWithinGivenPaths(file, givenPaths) {
  const nf = normalizeForContainment(file)
  return givenPaths.some(gp => {
    const ng = normalizeForContainment(gp)
    return nf === ng || nf.startsWith(ng + '/')
  })
}
// A path that already looks like a concrete file (has a file extension) needs no interpretation —
// use it directly, exactly as a direct "audit this file" request would, with zero agent involvement
// in deciding scope. Only extension-less paths (directories) go through discovery/enumeration at all.
function looksLikeFilePath(p) {
  return /\.[a-zA-Z0-9]+$/.test(String(p))
}
const literalFilePaths = resolvedArgs.paths.filter(looksLikeFilePath)
const directoryPaths = resolvedArgs.paths.filter(p => !looksLikeFilePath(p))

let discoveredFiles = []
let excluded = []
if (directoryPaths.length) {
  const discovery = await agent(
    'Discover MIF documents (files with MIF frontmatter — YAML/JSON-LD frontmatter declaring a MIF type) ' +
    `STRICTLY within these exact directories, and nowhere else: ${JSON.stringify(directoryPaths)}.\n` +
    'Hard rules, no exceptions:\n' +
    '- Recurse only inside each given directory tree — never outside it, never up to a parent, never ' +
    'across to an unrelated directory in the same repo.\n' +
    '- Never expand scope to "the whole repo" or "every MIF document you can find" under any circumstance, ' +
    'even if a given directory sits inside a repo that has many other MIF documents elsewhere.\n' +
    'Return the full list of matching file paths, plus a list of any excluded paths and why (not a MIF ' +
    'document, binary file, symlink loop, unreadable, or outside the given scope).',
    { phase: 'Design', schema: DISCOVER_SCHEMA, label: 'discover-targets', model: 'haiku' }
  )
  excluded = discovery.excluded
  const inScope = discovery.files.filter(f => isWithinGivenPaths(f, directoryPaths))
  const outOfScope = discovery.files.filter(f => !isWithinGivenPaths(f, directoryPaths))
  if (outOfScope.length) {
    log(
      `Discovery returned ${outOfScope.length} file(s) outside the given directories — dropped, not ` +
      `audited (enforced in code, independent of the discovery agent's own compliance): ` +
      `${JSON.stringify(outOfScope.slice(0, 10))}${outOfScope.length > 10 ? ` (+${outOfScope.length - 10} more)` : ''}`
    )
  }
  if (discovery.files.length && !inScope.length) {
    throw new Error(
      `Discovery returned ${discovery.files.length} file(s), none of which are within the given ` +
      `directories (${JSON.stringify(directoryPaths)}). This means discovery failed for this input ` +
      'rather than finding nothing — stopping instead of silently reporting zero findings.'
    )
  }
  discoveredFiles = inScope
}
if (directoryPaths.length) {
  log(`Discovery resolved ${directoryPaths.length} given director(y/ies) to ${discoveredFiles.length} in-scope file(s): ${JSON.stringify(discoveredFiles)}`)
}
if (literalFilePaths.length) {
  log(`${literalFilePaths.length} literal file path(s) used directly, no discovery agent involved: ${JSON.stringify(literalFilePaths)}`)
}

const inScopeFiles = [...literalFilePaths, ...discoveredFiles]

// No hard cap on total in-scope file count: a large legitimate audit (a whole docs/ tree, a whole
// repo) is a real, intended use of this command, not an error. The scope-correctness guarantee is
// the containment filter above (every file is verified to actually be within what was asked for);
// pacing so a large audit doesn't fire everything at once is the job of batching + pipeline() below,
// not a refusal to run at all past some fixed count. If a run turns out unexpectedly large, that's
// visible from this log line, not from the run being blocked.
log(`${inScopeFiles.length} file(s) confirmed in scope; will process in batches of ${batchSize}.`)

if (!inScopeFiles.length) {
  return { checksRun: [], batchPlan: { targets: 0, batches: 0, batchSize }, excluded, findings: [], reportPath: null, filedIssues: [] }
}

const batches = chunk(inScopeFiles, batchSize)
log(`Batch plan: ${inScopeFiles.length} targets, ${batches.length} batch(es) of up to ${batchSize}`)

const reportDir = typeof resolvedArgs.reportDir === 'string' && resolvedArgs.reportDir.trim() ? resolvedArgs.reportDir : 'reports/audit-docs'

const batchResults = await pipeline(
  batches,
  // AUDIT stage — per-doc checks routed to their assigned model tier, then batch-level cross-doc checks.
  async (batch, _item, index) => {
    const perDocGroups = await parallel(batch.flatMap(file => {
      const calls = []
      if (haikuChecks.length) {
        calls.push(() => agent(findingsPrompt(file, haikuChecks, resolvedArgs.mifLevel, resolvedArgs.mifProvenanceCorpusCheckScript, resolvedArgs.skillsRoot, resolvedArgs.mifValidateScript),
          { phase: 'Audit', schema: FINDINGS_SCHEMA, label: `audit:haiku:${file}`, model: 'haiku' }))
      }
      if (sonnetChecks.length) {
        calls.push(() => agent(findingsPrompt(file, sonnetChecks, resolvedArgs.mifLevel, resolvedArgs.mifProvenanceCorpusCheckScript, resolvedArgs.skillsRoot, resolvedArgs.mifValidateScript),
          { phase: 'Audit', schema: FINDINGS_SCHEMA, label: `audit:sonnet:${file}`, model: 'sonnet' }))
      }
      if (opusDocChecks.length) {
        calls.push(() => agent(findingsPrompt(file, opusDocChecks, resolvedArgs.mifLevel, resolvedArgs.mifProvenanceCorpusCheckScript, resolvedArgs.skillsRoot, resolvedArgs.mifValidateScript),
          { phase: 'Audit', schema: FINDINGS_SCHEMA, label: `audit:opus:${file}`, model: 'opus' }))
      }
      return calls
    }))
    const perDocFindings = perDocGroups.filter(Boolean).flatMap(r => r.findings)

    const batchLevelGroups = batchChecks.length
      ? await parallel(batchChecks.map(c => () => agent(
          `${c.instructions}\nDocuments in this batch — exactly these, no more: ${JSON.stringify(batch)}.\n` +
          'This check may need to search the wider corpus for context (e.g. duplication-drift finding a ' +
          'fact restated elsewhere) — that search is expected. Even so, every finding must be ABOUT one ' +
          "of this batch's documents (or the batch's shared directory); never emit a finding whose file " +
          "is a document outside this batch, and never expand this batch's scope to other documents you " +
          'encounter while searching.\n' +
          "Return every finding as a structured record: file (one of this batch's documents, or the " +
          "batch's shared directory if the finding spans the batch), anchor, check_id, dimension, " +
          'severity, summary, recommendation, fixable (always false — batch-level findings are never ' +
          'auto-fixed).',
          { phase: 'Audit', schema: FINDINGS_SCHEMA, label: `audit:batch:${c.id}:${index}`, model: c.tier }
        )))
      : []
    const batchFindings = batchLevelGroups.filter(Boolean).flatMap(r => r.findings)

    return { batchIndex: index, files: batch, rawFindings: [...perDocFindings, ...batchFindings] }
  },
  // VERIFY stage — adversarial refute for judgment-tier findings. Haiku-tier findings skip
  // adversarial re-check purely because of their cost tier, not because every haiku check has an
  // independent oracle backing it — most do (mif-validate CLI, link resolution, ontology
  // resolution), but structural-formatting and temporal-metadata are plain LLM judgment routed to
  // haiku for cost, not tool-verified. A verifier that itself fails must never silently drop the
  // finding — default to reporting it (fail open), flagged as unverified, not vanished.
  async (auditResult) => {
    if (!auditResult) return null
    const verified = await parallel(auditResult.rawFindings.map(f => {
      const check = checks.find(c => c.id === f.check_id)
      if (check && check.tier === 'haiku') return () => Promise.resolve({ finding: f, refuted: false })
      return () => agent(
        `Try to refute this documentation-audit finding. Default to refuted=true if uncertain.\n` +
        `Finding: ${JSON.stringify(f)}`,
        { phase: 'Verify', schema: VERDICT_SCHEMA, label: `verify:${f.file}:${f.check_id}`, model: 'opus' }
      ).then(v => ({ finding: f, refuted: v.refuted }))
       .catch(() => ({ finding: { ...f, summary: `[verification inconclusive] ${f.summary}` }, refuted: false }))
    }))
    const confirmed = verified.filter(Boolean).filter(v => !v.refuted).map(v => v.finding)
    return { ...auditResult, confirmed }
  },
  // FIX stage — only haiku-tier, single-deterministic-action findings, only when args.fix is set.
  // Grouped by file (one agent per file, applying that file's fixes in sequence) rather than one
  // agent per finding, since multiple findings routinely land on the same file and concurrent
  // parallel() edits to one file would lose updates.
  async (verifyResult) => {
    if (!verifyResult) return null
    if (!resolvedArgs.fix) {
      return { ...verifyResult, findings: verifyResult.confirmed.map(f => ({ ...f, fix_applied: null })) }
    }
    const byFile = new Map()
    const notFixable = []
    for (const f of verifyResult.confirmed) {
      const check = checks.find(c => c.id === f.check_id)
      if (f.fixable && check && check.tier === 'haiku') {
        if (!byFile.has(f.file)) byFile.set(f.file, [])
        byFile.get(f.file).push(f)
      } else {
        notFixable.push({ ...f, fix_applied: null })
      }
    }
    const fixGroups = await parallel(Array.from(byFile.entries()).map(([file, fileFindings]) => () =>
      agent(
        `Apply these deterministic fixes to ${file} ONLY, one at a time in sequence — apply and save ` +
        `each before starting the next, since they share one file: ${JSON.stringify(fileFindings)}. Do ` +
        `not edit any file other than ${file}, even if a fix's context references another document. ` +
        "After all are applied, re-run each fix's originating check once to confirm it now passes. " +
        'Return `applied` as an array of booleans in the same order as the findings given.',
        { phase: 'Fix', schema: FIX_GROUP_SCHEMA, label: `fix:${file}`, model: 'sonnet' }
      ).then(r => ({ file, fileFindings, result: r }))
       .catch(() => ({ file, fileFindings, result: null }))
    ))
    const fixedFindings = fixGroups.filter(Boolean).flatMap(g => {
      const applied = g.result && Array.isArray(g.result.applied) ? g.result.applied : []
      return g.fileFindings.map((f, i) => ({ ...f, fix_applied: applied[i] === true }))
    })
    return { ...verifyResult, findings: [...fixedFindings, ...notFixable] }
  }
)

phase('Report')

const allFindings = batchResults.filter(Boolean).flatMap(r => r.findings)
const bySeverity = { high: 0, medium: 0, low: 0 }
for (const f of allFindings) bySeverity[f.severity] = (bySeverity[f.severity] || 0) + 1
log(`Findings: ${bySeverity.high} high, ${bySeverity.medium} medium, ${bySeverity.low} low`)

const report = await agent(
  `Write a markdown audit report to ${reportDir}/audit-docs-run.md, relative to the current working ` +
  "directory (create the directory if it doesn't exist), and touch no other file. Use a header table " +
  `with these EXACT values — do not invent or guess any of them: paths given = ${JSON.stringify(resolvedArgs.paths)}, ` +
  `files actually audited = ${JSON.stringify(inScopeFiles)}, method = "audit-docs workflow, checks: ` +
  `${checks.map(c => c.id).join(', ')}". Then findings grouped by severity. Findings: ${JSON.stringify(allFindings)}. ` +
  'If findings is empty, state plainly that no findings were reported for these files — do not invent ' +
  'placeholder or example findings, and do not describe this as a "smoke test" or any other run type not ' +
  'stated here. ' +
  (resolvedArgs.fileIssues
    ? 'Additionally, for every finding with severity "high": determine its owning repo from the audited ' +
      "file's git remote, then use the github-bug-capture search-then-file pattern (search_similar_issues " +
      'first, file only if no likely duplicate). When filing: set the native issue type, add it to that ' +
      "repo's project board, and apply labels, all at creation — never as a later pass. The issue body " +
      'must be mechanical and state only the finding itself (file, check, summary, recommendation) — no ' +
      'process narration, no review-methodology description, no finding counts, no internals of this ' +
      'audit run, and no third-person references to any person. Run the content through the human-voice ' +
      "pass before posting, per this workspace's public-comment conventions. Record each filed issue's URL."
    : 'Do not file any GitHub issues — args.fileIssues was not set.'),
  { phase: 'Report', schema: REPORT_SCHEMA, label: 'write-report', model: 'sonnet' }
)

return {
  checksRun: checks.map(c => ({ id: c.id, tier: c.tier, dimension: c.dimension, scope: c.scope })),
  batchPlan: { targets: inScopeFiles.length, batches: batches.length, batchSize },
  excluded,
  findings: allFindings,
  reportPath: report.reportPath,
  filedIssues: report.filedIssues,
}
