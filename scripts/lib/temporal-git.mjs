// temporal-git.mjs — the temporal-metadata oracle for audit-docs: compare a
// MIF document's declared created/modified dates against the file's real git
// history, deterministically, so no Agent is ever asked to judge date drift.
//
// Git dates are a WEAK oracle for bulk-committed corpora: when a whole docs
// tree lands in one import commit, every file shares one author date and the
// comparison says nothing about real edit history. detectDateClustering()
// exists for exactly that: when the corpus's last-commit dates cluster, every
// git-derived finding is demoted to advisory and severity never rises above
// low on git evidence alone.
import { execFileSync } from "node:child_process";

const DAY_MS = 24 * 60 * 60 * 1000;

// True when the repository containing cwd is a shallow clone. In a shallow
// clone `git log --follow` succeeds and reports the truncated tip date as
// every file's whole history — fabricated dates, not a real oracle (review
// finding, verified under fetch-depth: 1). Callers must treat a shallow
// repo as "no oracle" for date work.
export function isShallowRepo(cwd = process.cwd()) {
  try {
    return (
      execFileSync("git", ["rev-parse", "--is-shallow-repository"], {
        cwd,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }).trim() === "true"
    );
  } catch {
    return false; // not a repo at all -- gitDatesOf already returns null there
  }
}

// First and last author dates (ISO 8601) for one file, rename-tracking via
// --follow. Returns { first, last } or null when the file has no git history
// (untracked, or the tree is not a git repo) — null is "no oracle", never an
// error: audits legitimately run against uncommitted docs. Callers auditing
// possibly-shallow checkouts must gate on isShallowRepo() first.
export function gitDatesOf(file, { cwd = process.cwd() } = {}) {
  let out;
  try {
    out = execFileSync("git", ["log", "--follow", "--format=%aI", "--", file], {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
  if (!out) return null;
  const dates = out.split("\n");
  return { first: dates[dates.length - 1], last: dates[0] };
}

// Extract declared dates from parsed frontmatter: top-level created/modified
// (MIF L1 style) with an L2 temporal block (temporal.created/modified) taking
// precedence when present. Returns { created, modified } (either may be
// undefined) — values passed through as-is, validated by toDate() at compare
// time.
export function declaredDatesOf(fm) {
  if (fm === null || typeof fm !== "object") return {};
  const t = fm.temporal;
  const fromTemporal = t && typeof t === "object" && !Array.isArray(t) ? t : {};
  return {
    created: fromTemporal.created ?? fm.created,
    modified: fromTemporal.modified ?? fm.modified,
  };
}

function toDate(v) {
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;
  if (typeof v !== "string" && typeof v !== "number") return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

// True when the corpus's dates cluster on a handful of calendar days — the
// bulk-import signature. With fewer than minFiles files there is not enough
// signal to call anything a cluster.
export function detectDateClustering(isoDates, { threshold = 0.8, minFiles = 10 } = {}) {
  const days = isoDates.map((d) => toDate(d)).filter(Boolean).map((d) => d.toISOString().slice(0, 10));
  if (days.length < minFiles) return false;
  const counts = new Map();
  for (const day of days) counts.set(day, (counts.get(day) ?? 0) + 1);
  const max = Math.max(...counts.values());
  return max / days.length >= threshold;
}

// Compare declared dates against git history for one file. Pure function —
// callers supply both sides plus whether the corpus's git dates cluster.
// Returns raw finding fragments ({check_id, severity, advisory, summary,
// recommendation, fixable}); the runner wraps them into schema findings.
//
// Severity policy: the only medium here is modified-before-created, which is
// internally contradictory with no git involved. Everything git-derived is
// low at most, and advisory whenever the corpus clusters.
export function checkTemporal({ declared, git, clustered = false, toleranceDays = 2 }) {
  const findings = [];
  const created = toDate(declared.created);
  const modified = toDate(declared.modified);
  const tolerance = toleranceDays * DAY_MS;

  if (created && modified && modified.getTime() < created.getTime()) {
    findings.push({
      check_id: "temporal-metadata",
      severity: "medium",
      confidence: "high", // internally contradictory, no external oracle involved
      advisory: false,
      summary: `declared modified (${declared.modified}) predates declared created (${declared.created})`,
      recommendation: "Correct whichever field is wrong; modified must never precede created.",
      fixable: false,
    });
  }

  if (git) {
    const gitLast = toDate(git.last);
    if (modified && gitLast && gitLast.getTime() - modified.getTime() > tolerance) {
      findings.push({
        check_id: "temporal-metadata",
        severity: "low",
        // git dates are a real but imperfect oracle; a clustered corpus is a
        // known-weak one -- never let these ship stamped high-confidence.
        confidence: clustered ? "low" : "medium",
        advisory: clustered,
        summary:
          `declared modified (${declared.modified}) is stale against the last git change (${git.last})` +
          (clustered ? " [advisory: corpus git dates cluster, weak oracle]" : ""),
        recommendation: "Update the modified field (and the temporal block if present) to reflect the real last substantive edit.",
        fixable: true,
      });
    }
    const gitFirst = toDate(git.first);
    if (created && gitFirst && created.getTime() - gitFirst.getTime() > tolerance) {
      findings.push({
        check_id: "temporal-metadata",
        severity: "low",
        confidence: "low",
        advisory: true, // a file can legitimately predate its git import
        summary:
          `declared created (${declared.created}) postdates the file's first git commit (${git.first}) [advisory]`,
        recommendation: "Confirm the created date reflects the document's real origin, not a later touch.",
        fixable: false,
      });
    }
  }
  return findings;
}
