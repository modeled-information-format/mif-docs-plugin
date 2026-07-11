// provenance-config.mjs — the one consent surface for the mif-provenance
// helper (ADR-0005). Every capture hook and both skill verbs resolve their
// effective configuration through this module; nothing else reads the
// `mifProvenance` settings key.
//
// The key rides in Claude Code's own settings hierarchy, read from four
// files (ascending precedence for non-refusal values). The user scope
// honors $CLAUDE_CONFIG_DIR (Claude Code's relocatable config home, e.g.
// ~/.claude-personal) and reads BOTH the canonical user settings file and
// its local variant — a machine-wide refusal belongs in the file every other
// Claude Code setting lives in, and must be heard from there:
//
//   1. <config-dir>/settings.json           (user)
//   2. <config-dir>/settings.local.json     (user, local)
//   3. <project>/.claude/settings.json      (project, shared)
//   4. <project>/.claude/settings.local.json (project, local)
//
// Two keys, both defaulting to disabled:
//
//   mifProvenance.capture  boolean            default false
//   mifProvenance.stamp    "auto"|"ask"|"off" default "off"
//
// The refusal-wins carve-out: precedence orders only NON-refusal values. An
// explicit `capture: false` or `stamp: "off"` at ANY scope defeats an enable
// at every other scope, in both directions (a personal disable beats a
// project enable, and a project disable beats a personal enable). Refusal is
// absolute; there is no scope from which it can be overridden.
//
// One derived rule: stamping is defined over the capture ledger, so an
// effective `capture: false` normalizes `stamp` to "off" — a config that
// says { stamp: "auto" } without capture would otherwise look enabled while
// being structurally inert in the hook path.
//
// Fail closed: a malformed or unreadable settings file, or a `mifProvenance`
// value of the wrong shape, contributes an explicit refusal for the affected
// scope — a configuration error can never enable observation, and enablement
// elsewhere cannot ride over a consent surface that has become unreadable.
// A MISSING file (or a file without the key) is not a refusal: it simply
// contributes nothing, so the feature stays usable for users who configure
// it in only one place.
//
// Deterministic: identical file contents (and $CLAUDE_CONFIG_DIR value)
// yield an identical effective config.

import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export const PROVENANCE_DEFAULTS = Object.freeze({ capture: false, stamp: "off" });

const STAMP_MODES = new Set(["auto", "ask", "off"]);
const REFUSAL = Object.freeze({ capture: false, stamp: "off" });

// A scope's contribution: { capture: true|false|undefined, stamp: mode|undefined }
// where `false`/`"off"` are explicit refusals and `undefined` is "says nothing".
function readScope(filePath) {
  let text;
  try {
    text = readFileSync(filePath, "utf8");
  } catch (err) {
    // A file that is not there at all is simply an unconfigured scope. A file
    // that exists but cannot be read (EACCES, EISDIR, ...) is a consent
    // surface we cannot see — fail closed to refusal.
    if (err && err.code === "ENOENT") return { capture: undefined, stamp: undefined };
    return REFUSAL;
  }
  let settings;
  try {
    settings = JSON.parse(text);
  } catch {
    // Present but malformed: the consent surface at this scope is unreadable.
    return REFUSAL;
  }
  if (settings === null || typeof settings !== "object" || Array.isArray(settings)) {
    return REFUSAL;
  }
  const raw = settings.mifProvenance;
  if (raw === undefined) return { capture: undefined, stamp: undefined };
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    // The key exists but is not the documented object shape: refusal.
    return REFUSAL;
  }
  const out = { capture: undefined, stamp: undefined };
  if ("capture" in raw) {
    // Only literal true enables; false explicitly refuses, and a wrong-typed
    // value fails closed rather than guessing intent.
    out.capture = raw.capture === true;
  }
  if ("stamp" in raw) {
    out.stamp = typeof raw.stamp === "string" && STAMP_MODES.has(raw.stamp) ? raw.stamp : "off";
  }
  return out;
}

function scopeFiles({ cwd, home, env }) {
  const configDir =
    typeof env.CLAUDE_CONFIG_DIR === "string" && env.CLAUDE_CONFIG_DIR !== ""
      ? env.CLAUDE_CONFIG_DIR
      : join(home, ".claude");
  return [
    join(configDir, "settings.json"),
    join(configDir, "settings.local.json"),
    join(cwd, ".claude", "settings.json"),
    join(cwd, ".claude", "settings.local.json"),
  ];
}

export function resolveProvenanceConfig({
  cwd = process.cwd(),
  home = homedir(),
  env = process.env,
} = {}) {
  const scopes = scopeFiles({ cwd, home, env }).map(readScope);

  // capture: any explicit refusal wins; otherwise any explicit enable wins;
  // otherwise the built-in default (off).
  let capture = PROVENANCE_DEFAULTS.capture;
  if (scopes.some((s) => s.capture === false)) capture = false;
  else if (scopes.some((s) => s.capture === true)) capture = true;

  // stamp: any explicit "off" wins; otherwise the highest-precedence explicit
  // non-refusal mode (project-local > project > user-local > user);
  // otherwise off.
  let stamp = PROVENANCE_DEFAULTS.stamp;
  if (!scopes.some((s) => s.stamp === "off")) {
    for (const s of scopes) {
      if (s.stamp !== undefined) stamp = s.stamp;
    }
  }

  // Derived rule: no capture, no stamping (see header).
  if (!capture) stamp = "off";

  return { capture, stamp };
}
