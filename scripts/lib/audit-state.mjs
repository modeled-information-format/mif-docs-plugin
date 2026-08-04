// audit-state.mjs — incremental audit state for audit-docs
// (`mif-docs/audit-state@1`). The single biggest token saver in the audit-v2
// design: per-file LLM judgment re-runs ONLY for files whose content (or
// whose governing checks/genre skill) changed since the last recorded audit,
// so a re-run over an unchanged corpus costs zero Agent calls.
//
// Deterministic checks are NOT gated by this state — they are free and always
// re-run over the full set, keeping the corpus map and defect classes
// current. This module gates judgment-tier work only.
import { createHash } from "node:crypto";
import { existsSync, readFileSync, mkdirSync, writeFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { globSync } from "node:fs";

import { splitFrontmatter, isAdrCarveout, isMifGenreText } from "./mif-genre-signal.mjs";

export const STATE_SCHEMA_ID = "mif-docs/audit-state@1";

// Resolve audit --paths to the MIF document list: literal files pass through
// (an explicitly named file is audited even without a genre signal, matching
// the skill's discovery contract); directories recurse to *.md(x) files that
// carry a MIF genre signal or the ADR carve-out. Shared by audit-state.mjs
// and audit-deterministic.mjs so "the corpus" can never mean two different
// file sets in one run.
export function discoverFiles(paths) {
  const files = [];
  for (const p of paths) {
    let st;
    try {
      st = statSync(p);
    } catch {
      const err = new Error(`path not found: ${p}`);
      err.badPath = p;
      throw err;
    }
    if (st.isFile()) {
      files.push(p);
      continue;
    }
    const root = p.replace(/\/+$/, "");
    for (const f of [...globSync(`${root}/**/*.md`), ...globSync(`${root}/**/*.mdx`)]) {
      const text = readFileSync(f, "utf8");
      const split = splitFrontmatter(text);
      if (split && (isMifGenreText(text) || isAdrCarveout(split.fmText))) files.push(f);
    }
  }
  return [...new Set(files)].sort();
}

export function sha256(text) {
  return createHash("sha256").update(text).digest("hex");
}

// One digest over an ordered list of files' contents — the checks_version
// input: when the skill, the runner, or the finding schema changes, every
// prior verdict was rendered by retired rules and the whole corpus is dirty.
export function sha256OfFiles(paths) {
  const h = createHash("sha256");
  for (const p of [...paths].sort()) {
    h.update(p);
    h.update("\0");
    h.update(existsSync(p) ? readFileSync(p) : "(absent)");
    h.update("\0");
  }
  return h.digest("hex");
}

const GENRE_RE =
  /(^|\n)type[ \t]*:[ \t]*(semantic|episodic|procedural|tutorial|how-to|reference|explanation|runbook|playbook|changelog|decision-record)\b/;

// Cheap genre extraction from raw frontmatter text (no YAML parse — same
// dependency-light discipline as mif-genre-signal.mjs, whose regexes this
// reuses). "adr" for the structured-madr carve-out, "unknown" when only
// non-type signals are present.
export function genreOfText(text) {
  const split = splitFrontmatter(text);
  if (!split) return "unknown";
  if (isAdrCarveout(split.fmText)) return "adr";
  const m = split.fmText.match(GENRE_RE);
  return m ? m[2] : "unknown";
}

// Resolve the genre skill directory that governs a genre's judgment rules,
// by the suite's own naming convention: an exact skills/<genre> dir, else
// skills/diataxis-<genre> (tutorial/how-to/reference/explanation). Genres
// with no resolvable skill dir share the "*" key (hashed over nothing —
// stable), so an unresolvable genre can never invalidate anything by itself.
export function genreSkillKey(genre, skillsRoot) {
  for (const candidate of [genre, `diataxis-${genre}`]) {
    const dir = join(skillsRoot, candidate);
    try {
      if (statSync(dir).isDirectory()) return { key: candidate, dir };
    } catch {
      /* not there */
    }
  }
  return { key: "*", dir: null };
}

export function genreSkillHash(dir) {
  if (!dir) return "none";
  const files = globSync(`${dir}/**/*`).filter((f) => {
    try {
      return statSync(f).isFile();
    } catch {
      return false;
    }
  });
  return sha256OfFiles(files);
}

export function loadState(path) {
  if (!existsSync(path)) return null;
  const parsed = JSON.parse(readFileSync(path, "utf8"));
  if (parsed.schema !== STATE_SCHEMA_ID) {
    throw new Error(`state file ${path} declares schema ${parsed.schema}, expected ${STATE_SCHEMA_ID}`);
  }
  return parsed;
}

// Partition files into dirty (needs LLM judgment) and clean (carry prior
// findings), with a per-file reason for every dirty verdict — "why is this
// being re-audited" must never be a mystery in the report.
export function partitionFiles({ state, files, checksVersion, skillsRoot, full = false }) {
  const dirty = [];
  const clean = [];
  const reasons = {};
  const entries = state?.entries ?? {};
  const skillHashCache = new Map();
  if (skillsRoot) {
    // Fail loud on a mis-resolved skills root: silently hashing "nothing"
    // for every genre would permanently disable genre-skill staleness
    // detection with no signal (per-genre misses are still fine -- a genre
    // with no matching skill dir legitimately maps to "*").
    let st;
    try {
      st = statSync(skillsRoot);
    } catch {
      throw new Error(`skillsRoot ${skillsRoot} does not exist -- refusing to partition with a dead genre-skill oracle`);
    }
    if (!st.isDirectory()) throw new Error(`skillsRoot ${skillsRoot} is not a directory`);
  }

  for (const file of files) {
    const text = readFileSync(file, "utf8");
    const contentSha = sha256(text);
    const genre = genreOfText(text);
    const meta = { file, content_sha256: contentSha, genre };

    let skillKey = "*";
    let skillHash = "none";
    if (skillsRoot) {
      const { key, dir } = genreSkillKey(genre, skillsRoot);
      skillKey = key;
      if (!skillHashCache.has(key)) skillHashCache.set(key, genreSkillHash(dir));
      skillHash = skillHashCache.get(key);
    }
    meta.genre_skill_key = skillKey;
    meta.genre_skill_sha256 = skillHash;

    const entry = entries[file];
    let reason = null;
    if (full) reason = "--full requested";
    else if (!state) reason = "no prior state";
    else if (!entry) reason = "not in prior state (new file)";
    // checks_version is compared PER ENTRY, never via the state file's
    // top-level field: a rules change dirties everything, but if only part
    // of the corpus gets re-audited before commit, the untouched entries
    // keep their old per-entry version and stay dirty on the next run --
    // committing a partial run must never certify files as clean under
    // rules they were never evaluated against (review finding, verified).
    else if (entry.checks_version !== checksVersion) reason = "checks_version changed (audit rules updated)";
    else if (entry.content_sha256 !== contentSha) reason = "content changed";
    else if (skillsRoot && entry.genre_skill_sha256 !== skillHash) reason = `genre skill "${skillKey}" changed`;

    if (reason) {
      dirty.push(meta);
      reasons[file] = reason;
    } else {
      clean.push({ ...meta, ...entry });
    }
  }
  return { dirty, clean, reasons };
}

// Write back state after a run: prior entries survive unless this run
// re-audited the file (results) or the file vanished from the corpus.
export function commitState({
  statePath,
  state,
  checksVersion,
  pluginVersion,
  files,
  results = [],
  now = new Date().toISOString(),
}) {
  const fileSet = new Set(files);
  const entries = {};
  for (const [file, entry] of Object.entries(state?.entries ?? {})) {
    if (fileSet.has(file)) entries[file] = entry;
  }
  for (const r of results) {
    const text = readFileSync(r.file, "utf8");
    entries[r.file] = {
      // Stamped per entry: only files actually judged THIS run get certified
      // under the current rules; carried entries keep the version they were
      // really evaluated under (see partitionFiles).
      checks_version: checksVersion,
      content_sha256: sha256(text),
      genre: r.genre ?? genreOfText(text),
      genre_skill_key: r.genre_skill_key,
      genre_skill_sha256: r.genre_skill_sha256,
      last_audited: now,
      llm_verdict: r.llm_verdict,
      finding_counts: r.finding_counts ?? { high: 0, medium: 0, low: 0 },
      findings_ref: r.findings_ref ?? null,
    };
  }
  const next = {
    schema: STATE_SCHEMA_ID,
    checks_version: checksVersion,
    plugin_version: pluginVersion,
    updated: now,
    entries,
  };
  mkdirSync(dirname(statePath), { recursive: true });
  writeFileSync(statePath, `${JSON.stringify(next, null, 2)}\n`);
  return next;
}
