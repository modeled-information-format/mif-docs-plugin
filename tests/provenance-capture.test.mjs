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
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
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
  delete spawnEnv.CLAUDE_CONFIG_DIR; // the real machine's config dir must not hijack fixtures
  delete spawnEnv.CLAUDE_CODE_SESSION_ID; // ambient session id must not leak into fixtures
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

// issue #90 / #95: the mid-session ACTIVATION boundary itself, not just the
// off state and the on state in isolation (which every other test in this
// file already covers separately). Models: capture off at "session start"
// (no ledger, first Write), then flipped on mid-"session" (settings file
// edited in place, same project/session id), then the NEXT qualifying tool
// call. Scope, stated precisely: this proves each hook re-reads
// mifProvenance fresh from disk on every invocation rather than caching a
// stale resolution - the part of the activation gap that a direct subprocess
// invocation can actually exercise. It does NOT prove hooks newly added to
// hooks.json get wired into Claude Code's own live dispatch table for an
// already-running session - that half is Claude Code's own runtime
// internals, external to these scripts, and is #91/#96's repro instead.
test("mid-session activation: capture flipped on between two tool calls in the same project/session populates the ledger from the very next qualifying call", () => {
  const { base, home, project } = fixture(); // starts with NO settings file: capture off
  try {
    const doc = join(project, "doc.md");
    writeFileSync(doc, "# plain\n");

    // "Before": capture is off, this Write leaves no trace.
    const before = runHook(
      HOOKS.post,
      { session_id: "s-mid", cwd: project, tool_name: "Write", tool_input: { file_path: doc } },
      { home },
    );
    assert.equal(before.status, 0, before.stderr);
    assert.equal(ledgerLines(project), null, "capture is off - nothing recorded yet");

    // Mid-"session": flip capture on, in place, same project.
    writeFileSync(join(project, ".claude", "settings.json"), JSON.stringify(ENABLED));

    // "After": the very next qualifying tool call in the same session.
    const after = runHook(
      HOOKS.post,
      { session_id: "s-mid", cwd: project, tool_name: "Write", tool_input: { file_path: doc } },
      { home },
    );
    assert.equal(after.status, 0, after.stderr);
    const lines = ledgerLines(project);
    assert.ok(lines, "capture is on now - the ledger must exist");
    assert.equal(lines.length, 1, "exactly the one touch since capture flipped on");
    assert.equal(lines[0].event, "file_touch");
    assert.equal(lines[0].sessionId, "s-mid");
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

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
  // A bare {cwd, home} falls through to the REAL process.env for the third
  // param, and on any machine with $CLAUDE_CONFIG_DIR set (this workspace's
  // own documented convention) that leaks real personal settings straight
  // past the isolated `home` fixture above - the exact class of gap issue #90
  // is about. Pass an explicit empty env so this test is isolated regardless
  // of what's configured on the machine running it.
  const env = {};
  try {
    resolveProvenanceConfig({ cwd: project, home, env }); // warm the module
    const t0 = performance.now();
    const cfg = resolveProvenanceConfig({ cwd: project, home, env });
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
    const realHooksJson = readFileSync(join(root, "hooks", "hooks.json"));
    assert.equal(
      l.hooksHash,
      `sha256:${createHash("sha256").update(realHooksJson).digest("hex")}`,
      "issue #90: session_start hashes this plugin's OWN hooks.json so a later " +
        "mid-session change to it can be detected as drift",
    );
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
    // Recorded paths are canonical (symlink aliases like macOS /var -> /private/var flattened).
    assert.equal(lines[0].filePath, realpathSync(doc));
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
    const doc = join(project, "doc.md");
    writeFileSync(doc, "# notes\n");
    for (const [hook, payload] of [
      [HOOKS.start, { session_id: "s-abc", cwd: project }],
      [HOOKS.post, { session_id: "s-abc", cwd: project, tool_name: "Write", tool_input: { file_path: doc } }],
      [HOOKS.end, { session_id: "s-abc", cwd: project }],
    ]) {
      const r = runHook(hook, payload, { home });
      assert.equal(r.status, 0, r.stderr);
      assert.equal(r.stdout + r.stderr, "");
    }
    assert.ok(!existsSync(join(project, ".git")), "no store may be invented outside a repo");
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test("a touch is witnessed in the FILE's repository ledger, not the session cwd's", () => {
  // Regression: the first draft resolved the ledger from the session cwd, so
  // a session parked in one directory writing into a sibling repo recorded
  // the touch where stamp/verify would never look.
  const { base, home, project } = fixture({ settings: ENABLED, withGit: false });
  try {
    const repo = join(base, "sibling-repo");
    mkdirSync(join(repo, ".git"), { recursive: true });
    const doc = join(repo, "doc.md");
    writeFileSync(doc, "# in the sibling repo\n");
    const r = runHook(
      HOOKS.post,
      { session_id: "s-abc", cwd: project, tool_name: "Write", tool_input: { file_path: doc } },
      { home },
    );
    assert.equal(r.status, 0, r.stderr);
    const ledger = join(repo, ".git", "ai-provenance", "session.jsonl");
    assert.ok(existsSync(ledger), "the witness lives where the lookup happens: the file's repo");
    // `project` (the session cwd here) is itself outside any git repository -
    // issue #148's exact shape - so this ledger also gets a synthesized
    // session_start ahead of the file_touch; see the dedicated #148 tests
    // below for that behavior on its own.
    const lines = ledgerLines(repo);
    const touch = lines.find((l) => l.event === "file_touch");
    assert.ok(touch, "the touch itself is still witnessed");
    assert.equal(touch.sessionId, "s-abc");
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

// Issue #148: a session launched from a cwd that is not itself inside any git
// repository (the modeled-information-format workspace's own layout: a bare
// root, clones under repos/, worktrees under worktrees/) means the real
// SessionStart hook — which resolves its git dir from that launch cwd — has
// nowhere to write and writes nothing, anywhere. Every per-repo ledger the
// session later touches via PostToolUse would otherwise carry captures for a
// session whose session_start was never recorded anywhere, indistinguishable
// from the issue #90 broken-wiring signal. PostToolUse now detects that
// specific, narrow condition and synthesizes/replays a session_start line
// into the touched file's own repo ledger before the file_touch it precedes.
test("issue #148: PostToolUse synthesizes a session_start line when the session's launch cwd is outside any git repository", () => {
  const { base, home, project } = fixture({ settings: ENABLED, withGit: false });
  try {
    const repo = join(base, "sibling-repo");
    mkdirSync(join(repo, ".git"), { recursive: true });
    const doc = join(repo, "doc.md");
    writeFileSync(doc, "# in the sibling repo\n");
    const r = runHook(
      HOOKS.post,
      {
        session_id: "s-nongit",
        cwd: project,
        tool_name: "Write",
        tool_input: { file_path: doc },
        prompt_id: "p-1",
        permission_mode: "acceptEdits",
      },
      { home },
    );
    assert.equal(r.status, 0, r.stderr);
    const lines = ledgerLines(repo);
    assert.equal(lines.length, 2, "a synthesized session_start precedes the file_touch");
    const [start, touch] = lines;
    assert.equal(start.event, "session_start");
    assert.equal(start.sessionId, "s-nongit");
    assert.equal(start.tool, "claude-code");
    assert.equal(start.cwd, project, "the session's real launch cwd is recorded, even though it isn't this repo");
    assert.equal(
      start.synthesizedFrom,
      "post-tool-use:non-git-launch-cwd",
      "readers must be able to tell this apart from a real SessionStart witness",
    );
    assert.equal(start.permissionMode, "acceptEdits");
    assert.equal(start.promptId, "p-1");
    assert.match(start.ts, /^\d{4}-\d{2}-\d{2}T/);
    assert.ok(start.git, "the repo's own git facts are witnessed, same as a real session_start");
    assert.ok(
      Object.hasOwn(start, "source") && start.source === null,
      "synthesized lines keep the same key shape as a real session_start: source present, explicitly null",
    );
    assert.ok(
      Object.hasOwn(start, "sessionTitle") && start.sessionTitle === null,
      "synthesized lines keep the same key shape as a real session_start: sessionTitle present, explicitly null",
    );
    assert.equal(touch.event, "file_touch");
    assert.equal(touch.sessionId, "s-nongit");
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test("issue #148: no duplicate session_start synthesized across repeated touches in the same session", () => {
  const { base, home, project } = fixture({ settings: ENABLED, withGit: false });
  try {
    const repo = join(base, "sibling-repo");
    mkdirSync(join(repo, ".git"), { recursive: true });
    const doc = join(repo, "doc.md");
    writeFileSync(doc, "# first\n");
    for (const body of ["# first\n", "# second\n"]) {
      writeFileSync(doc, body);
      const r = runHook(
        HOOKS.post,
        { session_id: "s-nongit", cwd: project, tool_name: "Write", tool_input: { file_path: doc } },
        { home },
      );
      assert.equal(r.status, 0, r.stderr);
    }
    const lines = ledgerLines(repo);
    const starts = lines.filter((l) => l.event === "session_start");
    const touches = lines.filter((l) => l.event === "file_touch");
    assert.equal(starts.length, 1, "exactly one synthesized session_start, however many touches followed");
    assert.equal(touches.length, 2);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test("issue #148: no synthesis (and the ordinary #90 wiring warning still fires) when the session's launch cwd IS inside a git repository", () => {
  // Same missing-session_start shape as the #90 test above, but pinning that
  // the #148 synthesis path is genuinely narrow: it must never fire, and the
  // pre-existing wiring warning must still, when the session cwd is itself a
  // real git repo (the ENABLED fixture's default withGit: true) rather than
  // outside one entirely.
  const { base, home, project } = fixture({
    settings: { mifProvenance: { capture: true, stamp: "auto" } },
  });
  try {
    const doc = join(project, "doc.md");
    writeFileSync(doc, MIF_DOC);
    const r = runHook(
      HOOKS.post,
      { session_id: "s-gitcwd-nostart", cwd: project, tool_name: "Write", tool_input: { file_path: doc } },
      { home },
    );
    assert.equal(r.status, 0, r.stderr);
    const lines = ledgerLines(project);
    assert.ok(
      !lines.some((l) => l.event === "session_start"),
      "no session_start is synthesized when the launch cwd is a real git repo",
    );
    assert.ok(lines.some((l) => l.event === "file_touch" && l.via === "Write"));
    const parsed = JSON.parse(r.stdout.trim());
    assert.match(
      parsed.hookSpecificOutput.additionalContext,
      /no session_start entry/,
      "the #90 wiring warning still applies to this different, genuinely-broken-wiring shape",
    );
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

// Issue #155: the #90 wiring warning's suggested `status` command used a bare
// `scripts/mif-provenance.mjs` literal, relative to the plugin root — but the
// hook fires (and the message is read) in the CONSUMING project's cwd, where
// that relative path cannot resolve (MODULE_NOT_FOUND). It must carry the
// same CLAUDE_PLUGIN_ROOT prefix the "ask"/"auto" messages already use.
test("issue #155: the #90 wiring warning's suggested status command is CLAUDE_PLUGIN_ROOT-prefixed, not a bare relative path", () => {
  const { base, home, project } = fixture({
    settings: { mifProvenance: { capture: true, stamp: "auto" } },
  });
  try {
    const doc = join(project, "doc.md");
    writeFileSync(doc, MIF_DOC);
    const r = runHook(
      HOOKS.post,
      { session_id: "s-gitcwd-nostart-155", cwd: project, tool_name: "Write", tool_input: { file_path: doc } },
      { home, env: { CLAUDE_PLUGIN_ROOT: "/fake/plugin/root" } },
    );
    assert.equal(r.status, 0, r.stderr);
    const parsed = JSON.parse(r.stdout.trim());
    assert.match(
      parsed.hookSpecificOutput.additionalContext,
      /\/fake\/plugin\/root\/scripts\/mif-provenance\.mjs status/,
      "the suggested command must be resolvable from the consumer project's cwd, not a bare relative path",
    );
    assert.doesNotMatch(
      parsed.hookSpecificOutput.additionalContext,
      /run `node scripts\/mif-provenance\.mjs status`/,
      "the un-prefixed bare-relative-path form of the command must not remain",
    );
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test("a relative payload file_path is normalized against the payload cwd at capture", () => {
  const { base, home, project } = fixture({ settings: ENABLED });
  try {
    writeFileSync(join(project, "notes.md"), "# notes\n");
    const r = runHook(
      HOOKS.post,
      { session_id: "s-abc", cwd: project, tool_name: "Write", tool_input: { file_path: "notes.md" } },
      { home },
    );
    assert.equal(r.status, 0, r.stderr);
    const line = ledgerLines(project)[0];
    assert.ok(line.filePath.endsWith("/notes.md"), line.filePath);
    assert.ok(line.filePath.startsWith("/"), "recorded paths are absolute and canonical");
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('CI="false" is not a CI environment: stamp "ask" still asks', () => {
  const { base, home, project } = fixture({
    settings: { mifProvenance: { capture: true, stamp: "ask" } },
  });
  try {
    const doc = join(project, "doc.md");
    writeFileSync(doc, MIF_DOC);
    const r = runHook(
      HOOKS.post,
      { session_id: "s-ask", cwd: project, tool_name: "Write", tool_input: { file_path: doc } },
      { home, env: { CI: "false" } },
    );
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /mif-provenance\.mjs stamp/, "the explicit not-CI spelling keeps ask interactive");
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
    rmSync(base, { recursive: true, force: true });
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

test('stamp "auto": stamps a witnessed MIF document without blocking the write', async () => {
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
    // The stamp witnesses its own rewrite: the newest ledger hash matches disk.
    const lines = ledgerLines(project);
    const last = lines.at(-1);
    assert.equal(last.via, "stamp");
    const { createHash } = await import("node:crypto");
    const diskHash = "sha256:" + createHash("sha256").update(readFileSync(doc)).digest("hex");
    assert.equal(last.contentHash, diskHash, "the ledger's newest hash matches the stamped bytes");
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('stamp "auto": warns via additionalContext when this session has no session_start line yet (issue #90)', () => {
  const { base, home, project } = fixture({
    settings: { mifProvenance: { capture: true, stamp: "auto" } },
  });
  try {
    const doc = join(project, "doc.md");
    writeFileSync(doc, MIF_DOC);
    // No session-start hook run for "s-nostart" - simulating hooks that
    // silently never wired in for this session's SessionStart event.
    const r = runHook(
      HOOKS.post,
      { session_id: "s-nostart", cwd: project, tool_name: "Write", tool_input: { file_path: doc } },
      { home },
    );
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /hookSpecificOutput/);
    const parsed = JSON.parse(r.stdout.trim());
    assert.match(parsed.hookSpecificOutput.additionalContext, /no session_start entry/);
    assert.match(parsed.hookSpecificOutput.additionalContext, /restart your Claude Code session/);
    // The warning never blocks the stamp itself.
    assert.match(readFileSync(doc, "utf8"), /wasGeneratedBy:/);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('stamp "auto": stays silent when this session DOES have a session_start line', () => {
  const { base, home, project } = fixture({
    settings: { mifProvenance: { capture: true, stamp: "auto" } },
  });
  try {
    const startRes = runHook(
      HOOKS.start,
      { session_id: "s-started", cwd: project },
      { home },
    );
    assert.equal(startRes.status, 0, startRes.stderr);
    const doc = join(project, "doc.md");
    writeFileSync(doc, MIF_DOC);
    const r = runHook(
      HOOKS.post,
      { session_id: "s-started", cwd: project, tool_name: "Write", tool_input: { file_path: doc } },
      { home },
    );
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.stdout, "", "no warning once session_start has been witnessed for this session");
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('stamp "ask": prepends the wiring warning to the approval message when session_start is missing', () => {
  const { base, home, project } = fixture({
    settings: { mifProvenance: { capture: true, stamp: "ask" } },
  });
  try {
    const doc = join(project, "doc.md");
    writeFileSync(doc, MIF_DOC);
    const r = runHook(
      HOOKS.post,
      { session_id: "s-ask-nostart", cwd: project, tool_name: "Write", tool_input: { file_path: doc } },
      { home },
    );
    assert.equal(r.status, 0, r.stderr);
    const parsed = JSON.parse(r.stdout.trim());
    assert.match(parsed.hookSpecificOutput.additionalContext, /no session_start entry/);
    assert.match(parsed.hookSpecificOutput.additionalContext, /stamp mode is "ask"/);
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

// Issue #108: a decline inside the mediated auto-stamp path (unwitnessed,
// not-conformant, would-regress, or a thrown error) used to be fully
// silent — indistinguishable, from inside the session, from capture being
// broken outright. It must now surface via additionalContext, the same
// fail-loud-never-fail-closed posture the #90 wiringWarning already uses.
test('stamp "auto": warns via additionalContext when stampFile declines (issue #108)', () => {
  const { base, home, project } = fixture({
    settings: { mifProvenance: { capture: true, stamp: "auto" } },
  });
  try {
    const startRes = runHook(HOOKS.start, { session_id: "s-declined", cwd: project }, { home });
    assert.equal(startRes.status, 0, startRes.stderr);
    const doc = join(project, "doc.md");
    // Genre-signaled (`type: semantic`) but not schema-conformant: mirrors
    // provenance-stamp.test.mjs's "declines a non-conformant document"
    // fixture, so stampFile returns { stamped: false, reason: "not-conformant" }.
    writeFileSync(doc, "---\ntype: semantic\n---\n\nNo id, no created.\n");
    const r = runHook(
      HOOKS.post,
      { session_id: "s-declined", cwd: project, tool_name: "Write", tool_input: { file_path: doc } },
      { home, env: { CLAUDE_PLUGIN_ROOT: "/fake/plugin/root" } },
    );
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /hookSpecificOutput/);
    const parsed = JSON.parse(r.stdout.trim());
    assert.match(parsed.hookSpecificOutput.additionalContext, /stamp mode is "auto"/);
    assert.match(parsed.hookSpecificOutput.additionalContext, /declined/);
    assert.match(parsed.hookSpecificOutput.additionalContext, /not-conformant/);
    // The suggested command must be runnable from the user's project cwd,
    // not the plugin root — so it needs the CLAUDE_PLUGIN_ROOT prefix, same
    // as the "ask" branch already does (review finding on #109).
    assert.match(
      parsed.hookSpecificOutput.additionalContext,
      /\/fake\/plugin\/root\/scripts\/mif-provenance\.mjs verify/,
    );
    // The decline never blocks or mutates the write.
    assert.equal(readFileSync(doc, "utf8"), "---\ntype: semantic\n---\n\nNo id, no created.\n");
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});
