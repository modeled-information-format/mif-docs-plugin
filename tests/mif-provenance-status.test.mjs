// Tests for the `mif-provenance status` verb (scripts/mif-provenance.mjs) -
// issue #90: hooks can silently never fire for an already-running session
// (a mid-session capture enable, or a mid-session plugin update), with no
// other in-session signal that anything is wrong. `status` is the self-check
// surface that answers "is capture actually active for THIS session".
//
// Spawns the real CLI (not the resolver directly - provenance-config.test.mjs
// already covers that unit) against an isolated {home, cwd} fixture, so a
// developer's own real ~/.claude(-personal)/settings.json never leaks in.

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, mkdirSync, readFileSync, symlinkSync, writeFileSync, rmSync } from "node:fs";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const cli = join(root, "scripts", "mif-provenance.mjs");

// A throwaway copy of just scripts/+hooks/ so the "hooks.json unreadable"
// test can delete it without touching this checkout's real, shared file
// (node --test runs files concurrently; other tests read the real hooks.json).
function makeHooksJsonMissingCopy() {
  const dir = mkdtempSync(join(tmpdir(), "mif-prov-status-hooksmissing-"));
  for (const sub of ["scripts", "hooks"]) {
    cpSync(join(root, sub), join(dir, sub), { recursive: true });
  }
  symlinkSync(join(root, "node_modules"), join(dir, "node_modules"));
  rmSync(join(dir, "hooks", "hooks.json"));
  return dir;
}

// The status verb resolves this plugin's hooks.json relative to its own
// script location (not $CLAUDE_PLUGIN_ROOT), so every test here hashes the
// SAME real, committed file the CLI itself will hash.
const REAL_HOOKS_HASH = `sha256:${createHash("sha256")
  .update(readFileSync(join(root, "hooks", "hooks.json")))
  .digest("hex")}`;

function fixture({ captureSetting, projectLocalSetting, ledgerLines } = {}) {
  const base = mkdtempSync(join(tmpdir(), "prov-status-"));
  const home = join(base, "home");
  const cwd = join(base, "project");
  mkdirSync(join(home, ".claude"), { recursive: true });
  mkdirSync(join(cwd, ".claude"), { recursive: true });
  if (captureSetting !== undefined) {
    writeFileSync(join(home, ".claude", "settings.json"), JSON.stringify(captureSetting));
  }
  if (projectLocalSetting !== undefined) {
    writeFileSync(join(cwd, ".claude", "settings.local.json"), JSON.stringify(projectLocalSetting));
  }
  const ledgerFile = join(base, "session.jsonl");
  if (ledgerLines) {
    writeFileSync(ledgerFile, ledgerLines.map((l) => JSON.stringify(l)).join("\n") + "\n");
  }
  return { base, home, cwd, ledgerFile };
}

function runStatus({ home, cwd, ledgerFile, session, extraArgs = [], cliPath = cli }) {
  const args = [cliPath, "status", "--ledger", ledgerFile, ...extraArgs];
  if (session) args.push("--session", session);
  return spawnSync("node", args, {
    cwd,
    encoding: "utf8",
    env: { ...process.env, HOME: home, CLAUDE_CONFIG_DIR: "", CLAUDE_CODE_SESSION_ID: "" },
  });
}

test("status: capture off reports the off state and exits 0", () => {
  const { base, home, cwd, ledgerFile } = fixture({ captureSetting: { mifProvenance: { capture: false } } });
  try {
    const r = runStatus({ home, cwd, ledgerFile, session: "s1" });
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /capture is off/);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test("status: capture on but no session_start line exits 1 with the restart message", () => {
  const { base, home, cwd, ledgerFile } = fixture({ captureSetting: { mifProvenance: { capture: true, stamp: "auto" } } });
  try {
    const r = runStatus({ home, cwd, ledgerFile, session: "s1" });
    assert.equal(r.status, 1, r.stderr);
    assert.match(r.stdout, /no session_start line found/);
    assert.match(r.stdout, /restart your Claude Code session/);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test("status: stamp explicitly off with no session_start line exits 0 with the working-as-designed message (issue #121)", () => {
  const { base, home, cwd, ledgerFile } = fixture({
    captureSetting: { mifProvenance: { capture: true, stamp: "off" } },
  });
  try {
    const r = runStatus({ home, cwd, ledgerFile, session: "s1" });
    assert.equal(r.status, 0, r.stderr);
    assert.doesNotMatch(r.stdout, /no session_start line found/);
    assert.match(r.stdout, /no session_start line is expected/);
    assert.match(r.stdout, /stamping is disabled by configuration/);
    assert.doesNotMatch(r.stdout, /hooks have not fired/);
    assert.doesNotMatch(r.stdout, /restart your Claude Code session/);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test("status: project-local settings.local.json stamp off (the issue #121 scenario) beats a user-scope enable and exits 0", () => {
  const { base, home, cwd, ledgerFile } = fixture({
    captureSetting: { mifProvenance: { capture: true, stamp: "auto" } },
    projectLocalSetting: { mifProvenance: { stamp: "off" } },
  });
  try {
    const r = runStatus({ home, cwd, ledgerFile, session: "s1" });
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /stamping is disabled by configuration/);
    assert.doesNotMatch(r.stdout, /hooks have not fired/);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test("status: capture on with a matching session_start line exits 0 as healthy", () => {
  const { base, home, cwd, ledgerFile } = fixture({
    captureSetting: { mifProvenance: { capture: true, stamp: "auto" } },
    ledgerLines: [{ v: 1, event: "session_start", sessionId: "s1", ts: "2026-01-01T00:00:00Z" }],
  });
  try {
    const r = runStatus({ home, cwd, ledgerFile, session: "s1" });
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /hooks are wired and witnessing this session/);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test("status: capture on with a synthesized session_start line (issue #148) reports healthy and explains the synthesis", () => {
  const { base, home, cwd, ledgerFile } = fixture({
    captureSetting: { mifProvenance: { capture: true, stamp: "auto" } },
    ledgerLines: [
      {
        v: 1,
        event: "session_start",
        sessionId: "s1",
        ts: "2026-01-01T00:00:00Z",
        synthesizedFrom: "post-tool-use:non-git-launch-cwd",
      },
    ],
  });
  try {
    const r = runStatus({ home, cwd, ledgerFile, session: "s1" });
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /hooks are wired and witnessing this session/);
    assert.match(r.stdout, /synthesized by PostToolUse/);
    assert.match(r.stdout, /not a wiring problem/);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test("status: capture on with a session_start for a DIFFERENT session still exits 1", () => {
  const { base, home, cwd, ledgerFile } = fixture({
    captureSetting: { mifProvenance: { capture: true, stamp: "auto" } },
    ledgerLines: [{ v: 1, event: "session_start", sessionId: "some-other-session", ts: "2026-01-01T00:00:00Z" }],
  });
  try {
    const r = runStatus({ home, cwd, ledgerFile, session: "s1" });
    assert.equal(r.status, 1, r.stderr);
    assert.match(r.stdout, /no session_start line found/);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test("status: hooksHash matching the real hooks.json exits 0 with no drift message", () => {
  const { base, home, cwd, ledgerFile } = fixture({
    captureSetting: { mifProvenance: { capture: true, stamp: "auto" } },
    ledgerLines: [
      { v: 1, event: "session_start", sessionId: "s1", ts: "2026-01-01T00:00:00Z", hooksHash: REAL_HOOKS_HASH },
    ],
  });
  try {
    const r = runStatus({ home, cwd, ledgerFile, session: "s1" });
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /hooks are wired and witnessing this session/);
    assert.doesNotMatch(r.stdout, /changed since this session started/);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test("status: hooksHash differing from the real hooks.json (issue #90) exits 1 with the restart-to-pick-up-changes message", () => {
  const { base, home, cwd, ledgerFile } = fixture({
    captureSetting: { mifProvenance: { capture: true, stamp: "auto" } },
    ledgerLines: [
      {
        v: 1,
        event: "session_start",
        sessionId: "s1",
        ts: "2026-01-01T00:00:00Z",
        hooksHash: "sha256:0000000000000000000000000000000000000000000000000000000000000",
      },
    ],
  });
  try {
    const r = runStatus({ home, cwd, ledgerFile, session: "s1" });
    assert.equal(r.status, 1, r.stderr);
    assert.match(r.stdout, /this plugin's hooks\.json has changed since this session started/);
    assert.match(r.stdout, /[Rr]estart your Claude Code session/);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test("status: hooksHash recorded but the current hooks.json can't be read is an environment error (exit 2), never a false-healthy verdict", () => {
  const copyDir = makeHooksJsonMissingCopy();
  const { base, home, cwd, ledgerFile } = fixture({
    captureSetting: { mifProvenance: { capture: true, stamp: "auto" } },
    ledgerLines: [
      { v: 1, event: "session_start", sessionId: "s1", ts: "2026-01-01T00:00:00Z", hooksHash: REAL_HOOKS_HASH },
    ],
  });
  try {
    const r = runStatus({ home, cwd, ledgerFile, session: "s1", cliPath: join(copyDir, "scripts", "mif-provenance.mjs") });
    assert.equal(r.status, 2, r.stderr);
    assert.match(r.stdout, /hooks\.json could not be read/);
    assert.doesNotMatch(r.stdout, /hooks are wired and witnessing this session/);
  } finally {
    rmSync(base, { recursive: true, force: true });
    rmSync(copyDir, { recursive: true, force: true });
  }
});

test("status: a session_start line with no hooksHash field (pre-#104 ledger) skips the drift check gracefully", () => {
  const { base, home, cwd, ledgerFile } = fixture({
    captureSetting: { mifProvenance: { capture: true, stamp: "auto" } },
    ledgerLines: [{ v: 1, event: "session_start", sessionId: "s1", ts: "2026-01-01T00:00:00Z" }],
  });
  try {
    const r = runStatus({ home, cwd, ledgerFile, session: "s1" });
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /hooks are wired and witnessing this session/);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test("status: no session id available (env unset, no --session) is a usage error, not a false healthy/unhealthy verdict", () => {
  const { base, home, cwd, ledgerFile } = fixture({ captureSetting: { mifProvenance: { capture: true, stamp: "auto" } } });
  try {
    const r = runStatus({ home, cwd, ledgerFile, session: undefined });
    assert.equal(r.status, 2, r.stderr);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});
