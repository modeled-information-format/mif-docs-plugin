// Tests for the mif-provenance capture hooks (hooks/provenance-*.mjs).
//
// These pin the Story #65 postures: disabled-silent (nothing written, nothing
// emitted, decided before any git/ledger I/O), error-open (any failure exits
// 0 and changes nothing), no-repo (capture disables outside a git repo), and
// the honest-capture happy path. The "ask" and "auto" mediated-stamp modes of
// the PostToolUse hook are pinned here too (Task #74); the stamp core's own
// behavior lives in provenance-stamp.test.mjs.

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { performance } from "node:perf_hooks";

import { resolveProvenanceConfig } from "../scripts/lib/provenance-config.mjs";

const root = join(new URL("..", import.meta.url).pathname);
const HOOKS = {
  start: join(root, "hooks", "provenance-session-start.mjs"),
  post: join(root, "hooks", "provenance-post-tool-use.mjs"),
  end: join(root, "hooks", "provenance-session-end.mjs"),
};

// A minimal MIF L1-conformant genre document (mirrors fixtures/good-l1.md).
const MIF_DOC = `---
id: 4f1d2c3b-aa10-4e7e-b9d2-0c9f8e7a6b5c
type: semantic
created: '2026-07-11T10:00:00Z'
modified: '2026-07-11T10:00:00Z'
namespace: _semantic/tests
title: Capture Fixture
summary: Fixture document for capture hook tests.
---

# Capture Fixture

Body content.
`;

// Isolated { home, project } pair; `settings` goes into .claude/settings.json;
// withGit controls whether the project is a git repository.
function fixture({ settings, withGit = true } = {}) {
  const base = mkdtempSync(join(tmpdir(), "prov-capture-"));
  const home = join(base, "home");
  const project = join(base, "project");
  mkdirSync(join(home, ".claude"), { recursive: true });
  mkdirSync(join(project, ".claude"), { recursive: true });
  if (withGit) mkdirSync(join(project, ".git"), { recursive: true });
  if (settings) writeFileSync(join(project, ".claude", "settings.json"), JSON.stringify(settings));
  return { base, home, project };
}

function runHook(hook, payload, { home, env = {} } = {}) {
  const spawnEnv = { ...process.env, HOME: home };
  delete spawnEnv.CI; // assertions differ under CI; tests opt in via env
  Object.assign(spawnEnv, env);
  return spawnSync("node", [hook], {
    input: JSON.stringify(payload),
    encoding: "utf8",
    env: spawnEnv,
  });
}

function ledgerLines(project) {
  const file = join(project, ".git", "ai-provenance", "session.jsonl");
  if (!existsSync(file)) return null;
  return readFileSync(file, "utf8")
    .trim()
    .split("\n")
    .map((l) => JSON.parse(l));
}

const ENABLED = { mifProvenance: { capture: true } };

test("disabled-silent: no config -> exit 0, nothing emitted, nothing written", () => {
  const { base, home, project } = fixture();
  try {
    for (const hook of Object.values(HOOKS)) {
      const r = runHook(hook, { session_id: "s-1", cwd: project }, { home });
      assert.equal(r.status, 0, `${hook}: ${r.stderr}`);
      assert.equal(r.stdout, "");
      assert.equal(r.stderr, "");
    }
    assert.equal(ledgerLines(project), null, "no ledger may exist when capture is off");
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test("disabled path decides within the 50ms budget, before any git/ledger I/O", () => {
  // The budget is a property of the DECISION, not of node's process startup
  // (which varies by machine and dwarfs the work itself). The structural
  // guarantee in every hook is that the config resolution — three small file
  // reads — happens first and an off verdict returns before findGitDir or
  // any ledger I/O runs; here we pin that the decision itself is far inside
  // 50ms. The behavioral half (nothing written, nothing emitted) is the test
  // above.
  const { base, home, project } = fixture();
  try {
    resolveProvenanceConfig({ cwd: project, home }); // warm the module
    const t0 = performance.now();
    const cfg = resolveProvenanceConfig({ cwd: project, home });
    const elapsed = performance.now() - t0;
    assert.deepEqual(cfg, { capture: false, stamp: "off" });
    assert.ok(elapsed < 50, `disabled decision took ${elapsed.toFixed(1)}ms (budget 50ms)`);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test("session_start appends witnessed session facts when enabled", () => {
  const { base, home, project } = fixture({ settings: ENABLED });
  try {
    const r = runHook(
      HOOKS.start,
      {
        session_id: "s-abc",
        cwd: project,
        model: "claude-test-1",
        source: "startup",
        permission_mode: "acceptEdits",
        prompt_id: "p-1",
      },
      {
        home,
        env: {
          CLAUDE_CODE_EXECPATH: "/opt/claude/versions/9.9.9",
          CLAUDE_EFFORT: "high",
          CLAUDE_CODE_ENTRYPOINT: "cli",
          AI_AGENT: "claude-code_9-9-9_agent",
        },
      },
    );
    assert.equal(r.status, 0, r.stderr);
    const lines = ledgerLines(project);
    assert.equal(lines.length, 1);
    const l = lines[0];
    assert.equal(l.event, "session_start");
    assert.equal(l.sessionId, "s-abc");
    assert.equal(l.tool, "claude-code");
    assert.equal(l.model, "claude-test-1");
    assert.equal(l.toolVersion, "9.9.9", "version derived from the CLI exec path");
    assert.equal(l.permissionMode, "acceptEdits");
    assert.equal(l.effort, "high");
    assert.equal(l.promptId, "p-1");
    assert.equal(l.env.CLAUDE_CODE_ENTRYPOINT, "cli", "runtime env is captured structurally");
    assert.equal(l.env.AI_AGENT, "claude-code_9-9-9_agent");
    assert.equal(l.sys.platform, process.platform, "host facts are witnessed");
    assert.ok(l.sys.nodeVersion.startsWith("v"));
    assert.match(l.ts, /^\d{4}-\d{2}-\d{2}T/);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test("credential-shaped environment names are never recorded, regardless of prefix", () => {
  const { base, home, project } = fixture({ settings: ENABLED });
  try {
    const r = runHook(
      HOOKS.start,
      { session_id: "s-abc", cwd: project },
      {
        home,
        env: {
          ANTHROPIC_API_KEY: "sk-ant-secret",
          CLAUDE_CODE_OAUTH_TOKEN: "tok-secret",
          CLAUDE_CODE_ENTRYPOINT: "cli",
        },
      },
    );
    assert.equal(r.status, 0, r.stderr);
    const l = ledgerLines(project)[0];
    const flat = JSON.stringify(l);
    assert.ok(!flat.includes("sk-ant-secret"), "API keys must never reach the ledger");
    assert.ok(!flat.includes("tok-secret"), "tokens must never reach the ledger");
    assert.equal(l.env.CLAUDE_CODE_ENTRYPOINT, "cli", "non-secret runtime env still lands");
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test("session_start falls back to the transcript's own model record when the payload omits it", () => {
  const { base, home, project } = fixture({ settings: ENABLED });
  try {
    const transcript = join(base, "transcript.jsonl");
    writeFileSync(
      transcript,
      [
        JSON.stringify({ type: "user", message: { role: "user" } }),
        JSON.stringify({ type: "assistant", message: { model: "<synthetic>" } }),
        JSON.stringify({ type: "assistant", message: { model: "claude-from-transcript" } }),
        JSON.stringify({ type: "system" }),
      ].join("\n") + "\n",
    );
    const r = runHook(
      HOOKS.start,
      { session_id: "s-abc", cwd: project, transcript_path: transcript },
      { home },
    );
    assert.equal(r.status, 0, r.stderr);
    const l = ledgerLines(project)[0];
    assert.equal(l.model, "claude-from-transcript", "newest real model line wins");
    assert.equal(l.transcriptPath, transcript);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test("PostToolUse appends a file_touch for the written file when enabled", () => {
  const { base, home, project } = fixture({ settings: ENABLED });
  try {
    const doc = join(project, "notes.md");
    writeFileSync(doc, "# plain notes\n");
    // Give the repo a resolvable HEAD so git facts are witnessed.
    writeFileSync(join(project, ".git", "HEAD"), "ref: refs/heads/feat/x\n");
    mkdirSync(join(project, ".git", "refs", "heads", "feat"), { recursive: true });
    writeFileSync(join(project, ".git", "refs", "heads", "feat", "x"), "a".repeat(40) + "\n");
    const r = runHook(
      HOOKS.post,
      {
        session_id: "s-abc",
        cwd: project,
        tool_name: "Write",
        tool_input: { file_path: doc },
        prompt_id: "p-2",
        permission_mode: "default",
      },
      { home },
    );
    assert.equal(r.status, 0, r.stderr);
    const lines = ledgerLines(project);
    assert.equal(lines.length, 1);
    assert.equal(lines[0].event, "file_touch");
    assert.equal(lines[0].filePath, doc);
    assert.equal(lines[0].via, "Write");
    assert.equal(lines[0].sessionId, "s-abc");
    assert.equal(lines[0].promptId, "p-2");
    assert.equal(lines[0].permissionMode, "default");
    assert.equal(lines[0].git.branch, "feat/x");
    assert.equal(lines[0].git.headSha, "a".repeat(40));
    assert.match(lines[0].contentHash, /^sha256:[0-9a-f]{64}$/, "the touched bytes are hashed");
    assert.equal(lines[0].contentBytes, 14);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test("session_end appends the terminal line when enabled", () => {
  const { base, home, project } = fixture({ settings: ENABLED });
  try {
    const r = runHook(HOOKS.end, { session_id: "s-abc", cwd: project, reason: "exit" }, { home });
    assert.equal(r.status, 0, r.stderr);
    const lines = ledgerLines(project);
    assert.equal(lines.length, 1);
    assert.equal(lines[0].event, "session_end");
    assert.equal(lines[0].reason, "exit");
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test("no-repo: enabled but outside any git repository -> exit 0, nothing written", () => {
  const { base, home, project } = fixture({ settings: ENABLED, withGit: false });
  try {
    const r = runHook(HOOKS.start, { session_id: "s-abc", cwd: project }, { home });
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.stdout + r.stderr, "");
    assert.ok(!existsSync(join(project, ".git")), "no store may be invented outside a repo");
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test("error-open: an unwritable ledger path exits 0 and blocks nothing", () => {
  const { base, home, project } = fixture({ settings: ENABLED });
  try {
    // Occupy the ledger directory's path with a FILE so mkdir/append throw.
    writeFileSync(join(project, ".git", "ai-provenance"), "in the way");
    const r = runHook(HOOKS.start, { session_id: "s-abc", cwd: project }, { home });
    assert.equal(r.status, 0, "the hook must fail open");
    assert.equal(r.stdout + r.stderr, "");
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test("error-open: a malformed payload exits 0 silently", () => {
  const { base, home } = fixture({ settings: ENABLED });
  try {
    for (const hook of Object.values(HOOKS)) {
      const r = spawnSync("node", [hook], {
        input: "not json at all",
        encoding: "utf8",
        env: { ...process.env, HOME: home },
      });
      assert.equal(r.status, 0, `${hook} must fail open on a bad payload`);
    }
  } finally {
    rmSync(join(home, ".."), { recursive: true, force: true });
  }
});

test('stamp "ask": emits the approval command as context and writes no provenance', () => {
  const { base, home, project } = fixture({
    settings: { mifProvenance: { capture: true, stamp: "ask" } },
  });
  try {
    const doc = join(project, "doc.md");
    writeFileSync(doc, MIF_DOC);
    const r = runHook(
      HOOKS.post,
      { session_id: "s-ask", cwd: project, tool_name: "Write", tool_input: { file_path: doc } },
      { home },
    );
    assert.equal(r.status, 0, r.stderr);
    const out = JSON.parse(r.stdout);
    assert.match(out.hookSpecificOutput.additionalContext, /mif-provenance\.mjs stamp/);
    assert.match(out.hookSpecificOutput.additionalContext, /--session s-ask/);
    assert.equal(readFileSync(doc, "utf8"), MIF_DOC, "ask never writes without approval");
    assert.equal(ledgerLines(project).length, 1, "the touch itself is still captured");
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('stamp "ask" degrades to "off" where no interactive surface exists (CI)', () => {
  const { base, home, project } = fixture({
    settings: { mifProvenance: { capture: true, stamp: "ask" } },
  });
  try {
    const doc = join(project, "doc.md");
    writeFileSync(doc, MIF_DOC);
    const r = runHook(
      HOOKS.post,
      { session_id: "s-ask", cwd: project, tool_name: "Write", tool_input: { file_path: doc } },
      { home, env: { CI: "1" } },
    );
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.stdout, "", "headless ask emits nothing");
    assert.equal(readFileSync(doc, "utf8"), MIF_DOC);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('stamp "auto": stamps a witnessed MIF document without blocking the write', () => {
  const { base, home, project } = fixture({
    settings: { mifProvenance: { capture: true, stamp: "auto" } },
  });
  try {
    const doc = join(project, "doc.md");
    writeFileSync(doc, MIF_DOC);
    const r = runHook(
      HOOKS.post,
      { session_id: "s-auto", cwd: project, tool_name: "Write", tool_input: { file_path: doc } },
      { home },
    );
    assert.equal(r.status, 0, r.stderr);
    const stamped = readFileSync(doc, "utf8");
    assert.match(stamped, /wasGeneratedBy:/);
    assert.match(stamped, /urn:mif:activity:claude-code-session:s-auto/);
    assert.match(stamped, /trustLevel: user_stated/);
    assert.doesNotMatch(stamped, /confidence/);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('stamp "auto" leaves a plain (non-genre) markdown file alone', () => {
  const { base, home, project } = fixture({
    settings: { mifProvenance: { capture: true, stamp: "auto" } },
  });
  try {
    const doc = join(project, "README.md");
    writeFileSync(doc, "# plain readme\n");
    const r = runHook(
      HOOKS.post,
      { session_id: "s-auto", cwd: project, tool_name: "Write", tool_input: { file_path: doc } },
      { home },
    );
    assert.equal(r.status, 0, r.stderr);
    assert.equal(readFileSync(doc, "utf8"), "# plain readme\n");
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});
