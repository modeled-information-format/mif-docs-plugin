// doctor.mjs (lib) -- pure, testable pieces of the mif-rs tooling doctor
// check (scripts/doctor.mjs). Kept separate from the CLI so PATH resolution
// and version comparison can be exercised without touching the real PATH or
// shelling out to a binary.
import { accessSync, constants } from "node:fs";
import { delimiter, join } from "node:path";

export function findOnPath(bin, { pathEnv = process.env.PATH || "", platform = process.platform } = {}) {
  const exe = platform === "win32" ? `${bin}.exe` : bin;
  const dirs = pathEnv.split(delimiter).filter(Boolean);
  for (const dir of dirs) {
    const candidate = join(dir, exe);
    try {
      accessSync(candidate, constants.X_OK);
      return candidate;
    } catch {
      // not on this PATH entry, keep looking
    }
  }
  return null;
}

// mif-cli prints "<name> X.Y.Z" on --version; mif-rs release tags are
// "vX.Y.Z". Returns null when either side is missing/unparseable -- callers
// must not report staleness when the comparison itself is unreliable (e.g.
// mif-mcp, which has no --version output to compare at all).
//
// `relation` is "behind", "ahead", or "match". Only "behind" is stale: a
// local build newer than the last tagged release (e.g. built from a dev
// commit) is not a problem, and reporting it the same way a truly outdated
// binary would be reported ("differs from latest") would misleadingly read
// as the same kind of warning in both directions.
export function compareVersions(localVersionOutput, latestTag) {
  if (!localVersionOutput || !latestTag) return null;
  const local = localVersionOutput.trim().split(/\s+/).pop();
  const latest = latestTag.replace(/^v/, "");
  const l = local.split(".").map(Number);
  const r = latest.split(".").map(Number);
  if (l.length !== 3 || r.length !== 3 || l.some(Number.isNaN) || r.some(Number.isNaN)) {
    return null;
  }
  let relation = "match";
  for (let i = 0; i < 3; i++) {
    if (l[i] < r[i]) { relation = "behind"; break; }
    if (l[i] > r[i]) { relation = "ahead"; break; }
  }
  return { local, latest, relation, stale: relation === "behind" };
}
