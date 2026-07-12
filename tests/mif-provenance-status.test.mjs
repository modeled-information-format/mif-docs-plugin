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
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const cli = join(root, "scripts", "mif-provenance.mjs");

function fixture({ captureSetting, ledgerLines } = {}) {
  const base = mkdtempSync(join(tmpdir(), "prov-status-"));
  const home = join(base, "home");
  const cwd = join(base, "project");
  mkdirSync(join(home, ".claude"), { recursive: true });
  mkdirSync(cwd, { recursive: true });
  if (captureSetting !== undefined) {
    writeFileSync(join(home, ".claude", "settings.json"), JSON.stringify(captureSetting));
  }
  const ledgerFile = join(base, "session.jsonl");
  if (ledgerLines) {
    writeFileSync(ledgerFile, ledgerLines.map((l) => JSON.stringify(l)).join("\n") + "\n");
  }
  return { base, home, cwd, ledgerFile };
}

function runStatus({ home, cwd, ledgerFile, session, extraArgs = [] }) {
  const args = [cli, "status", "--ledger", ledgerFile, ...extraArgs];
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

test("status: no session id available (env unset, no --session) is a usage error, not a false healthy/unhealthy verdict", () => {
  const { base, home, cwd, ledgerFile } = fixture({ captureSetting: { mifProvenance: { capture: true, stamp: "auto" } } });
  try {
    const r = runStatus({ home, cwd, ledgerFile, session: undefined });
    assert.equal(r.status, 2, r.stderr);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});
