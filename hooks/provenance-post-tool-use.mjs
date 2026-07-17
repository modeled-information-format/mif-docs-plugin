#!/usr/bin/env node
// mif-provenance capture hook — PostToolUse (Write|Edit|MultiEdit).
//
// Two jobs, deliberately in ONE process so their order is a fact rather than
// a scheduling accident:
//
//   1. CAPTURE — append a `file_touch` line for the just-written file to the
//      session ledger (consent: `mifProvenance.capture`).
//   2. MEDIATED STAMP (Story #66) — honor the resolved `stamp` mode for MIF
//      genre documents: "auto" stamps witnessed provenance without blocking
//      the write; "ask" surfaces the exact approval command and writes
//      nothing until it is explicitly run; "off" leaves stamping to explicit
//      skill invocation. Where no interactive surface exists (CI), "ask"
//      degrades to "off".
//
// The ledger a touch lands in is the FILE's own repository ledger (not the
// session cwd's): stamp/verify later resolve the ledger from the file, and a
// session whose cwd is one repo routinely writes into a sibling repo — the
// witness must live where the lookup happens.
//
// Postures: consent resolution is fail-closed (provenance-config.mjs, which
// also normalizes stamp to "off" when capture is off — everything below is
// gated on capture alone); every operational path after it is FAIL-OPEN —
// this hook exits 0 no matter what and never blocks a Write. The disabled
// path exits before any git discovery or file/ledger I/O. The stamp
// machinery (js-yaml, ajv via the projection module) is loaded via dynamic
// import only when a qualifying genre document meets an enabled stamp mode,
// keeping the capture-only path as light as mif-guard's.

import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveProvenanceConfig } from "../scripts/lib/provenance-config.mjs";
import {
  appendLedgerLine,
  canonicalPath,
  envFacts,
  findGitDir,
  gitFacts,
  hooksManifestHash,
  ledgerPath,
  modelFromTranscript,
  readLedger,
  sessionStartOf,
  strOrNull,
  sysFacts,
  toolVersionFrom,
  SESSION_ENV_VAR,
} from "../scripts/lib/provenance-ledger.mjs";
import { isMifGenreText } from "../scripts/lib/mif-genre-signal.mjs";

const CAPTURED_TOOLS = new Set(["Write", "Edit", "MultiEdit"]);

// This file's own directory is always where this plugin's hooks.json lives —
// resolved from import.meta.url the same way provenance-session-start.mjs
// does, so the drift hash synthesized below (issue #148) matches what the
// real SessionStart hook would have hashed.
const HOOKS_JSON_PATH = join(dirname(fileURLToPath(import.meta.url)), "hooks.json");

// CI detection for the ask-mode degradation: the conventional CI variable,
// but not the explicit "this is NOT CI" spellings some toolchains export.
function inCi(env = process.env) {
  const v = env.CI;
  return typeof v === "string" && v !== "" && v !== "false" && v !== "0";
}

async function main() {
  const payload = JSON.parse(readFileSync(0, "utf8"));
  const cwd = strOrNull(payload?.cwd) ?? process.cwd();
  const cfg = resolveProvenanceConfig({ cwd });
  if (cfg.capture !== true) return; // disabled-silent fast path (stamp is off by derivation)

  const toolName = payload?.tool_name;
  const rawPath = strOrNull(payload?.tool_input?.file_path);
  if (!CAPTURED_TOOLS.has(toolName) || !rawPath) return;

  // Normalize at capture time: absolute against the payload cwd, symlink
  // aliases flattened — so a later lookup from any process/cwd matches.
  const filePath = canonicalPath(resolve(cwd, rawPath));

  // The witness lives in the touched FILE's repository.
  const gitDir = findGitDir(dirname(filePath));
  if (!gitDir) return; // outside a git repository, capture disables — no alternative store

  const sessionId = strOrNull(payload?.session_id) ?? strOrNull(process.env[SESSION_ENV_VAR]);
  const ledgerFile = ledgerPath(gitDir);

  // Issue #148: the SessionStart hook resolves ITS git dir from the
  // session's own launch cwd, not from any touched file. When that launch
  // cwd is not itself inside a git repository — the common shape of a bare
  // multi-repo workspace root (clones under repos/, worktrees under
  // worktrees/) — findGitDir(cwd) there returns null and SessionStart writes
  // nothing, anywhere: no ledger this session ever touches can get a
  // session_start line from it, which is indistinguishable from broken hook
  // wiring (issue #90) to `mif-provenance status` or the wiring warning
  // below. That is a genuinely different, unrecoverable-by-restart case from
  // the already-documented "session parked in repo A, editing repo B" shape
  // (docs/reference/provenance-ledger.md's "Which repository" section),
  // where a real session_start DID land somewhere, just not in every ledger
  // this session touches — so this check is deliberately narrow: only when
  // the launch cwd is confirmed non-git. Detected and replayed here, at the
  // first touch to THIS repo's ledger, rather than warned about — it is
  // expected topology, not a defect to restart away.
  const sessionLaunchedOutsideGit = sessionId ? !findGitDir(cwd) : false;
  let ledgerLines = null; // lazily read at most once per invocation
  const readLedgerOnce = () => (ledgerLines ??= readLedger(ledgerFile));

  if (sessionLaunchedOutsideGit && !sessionStartOf(readLedgerOnce(), sessionId)) {
    appendLedgerLine(gitDir, {
      event: "session_start",
      sessionId,
      ts: new Date().toISOString(),
      tool: "claude-code",
      toolVersion: toolVersionFrom(),
      model: modelFromTranscript(strOrNull(payload?.transcript_path)),
      permissionMode: strOrNull(payload?.permission_mode),
      effort: strOrNull(payload?.effort) ?? strOrNull(process.env.CLAUDE_EFFORT),
      promptId: strOrNull(payload?.prompt_id),
      agentId: strOrNull(payload?.agent_id),
      agentType: strOrNull(payload?.agent_type),
      transcriptPath: strOrNull(payload?.transcript_path),
      cwd,
      env: envFacts(),
      sys: sysFacts(),
      git: gitFacts(gitDir),
      hooksHash: hooksManifestHash(HOOKS_JSON_PATH),
      // Marks this line as replayed by PostToolUse rather than witnessed by
      // the real SessionStart hook, and why — `status` reads this to explain
      // the line instead of just reporting it as ordinarily healthy.
      synthesizedFrom: "post-tool-use:non-git-launch-cwd",
    });
    ledgerLines = null; // force a fresh read below so it sees the line just appended
  }

  // Read BEFORE this touch is appended below: a missing session_start for
  // this session, even though a capture hook is running right now, is a
  // strong signal hook wiring is incomplete for this session (issue #90) —
  // e.g. a mid-session plugin update or capture-enable that wired SOME
  // hooks but not all. This never changes the fail-open behavior below,
  // it only decides whether to say something. The warning can only ever
  // surface downstream when stamping is enabled (the "off" early-return
  // below never reaches it), so skip this extra full-ledger read entirely
  // on the capture-only path — that's the path this file's header promises
  // stays as light as mif-guard's. (The synthesis above already forced one
  // read when the launch cwd is non-git; this reuses it instead of reading
  // twice.)
  const sessionStartMissing =
    cfg.stamp !== "off" &&
    !!sessionId &&
    !sessionStartOf(sessionLaunchedOutsideGit ? readLedgerOnce() : readLedger(ledgerFile), sessionId);

  // One read serves the hash, the size, and the genre check.
  let contentBuf = null;
  try {
    contentBuf = readFileSync(filePath);
  } catch {
    // File vanished between the Write and this hook; witness the touch
    // without content facts.
  }

  appendLedgerLine(gitDir, {
    event: "file_touch",
    sessionId,
    ts: new Date().toISOString(),
    tool: "claude-code",
    via: toolName,
    filePath,
    // Per-touch facts: the model that did the touching (the transcript is
    // authoritative and mid-session /model switches are real), the tool
    // version (so stamps derive agentVersion even when this repo's ledger
    // never saw a session_start), which prompt/agent it happened under, the
    // repo state, and a hash of the bytes actually written — never the
    // content itself.
    model: modelFromTranscript(strOrNull(payload?.transcript_path)),
    toolVersion: toolVersionFrom(),
    promptId: strOrNull(payload?.prompt_id),
    permissionMode: strOrNull(payload?.permission_mode),
    effort: strOrNull(payload?.effort) ?? strOrNull(process.env.CLAUDE_EFFORT),
    agentId: strOrNull(payload?.agent_id),
    agentType: strOrNull(payload?.agent_type),
    git: gitFacts(gitDir),
    contentBytes: contentBuf ? contentBuf.length : null,
    contentHash: contentBuf
      ? `sha256:${createHash("sha256").update(contentBuf).digest("hex")}`
      : null,
  });

  // Mediated stamp path — only for MIF genre documents.
  if (cfg.stamp === "off" || !sessionId || !contentBuf) return;
  if (cfg.stamp === "ask" && inCi()) return; // no interactive surface: behave as "off"
  if (!isMifGenreText(contentBuf.toString("utf8"))) return;

  // issue #90: a missing session_start for this session, even while a
  // capture hook is running right now, means hook wiring may be incomplete
  // (e.g. only some of a mid-session plugin update's hooks got wired in).
  // Fail-loud, never fail-closed: this only adds a message, it never changes
  // whether stamping proceeds below.
  const wiringWarning = sessionStartMissing
    ? `mif-provenance: this session's ledger has no session_start entry for ${sessionId}, even though ` +
      `a capture hook just ran for ${filePath}. If you enabled capture or updated this plugin mid-session, ` +
      `hook wiring may be incomplete - run \`node scripts/mif-provenance.mjs status\` to check, or restart ` +
      `your Claude Code session to be sure.`
    : null;

  if (cfg.stamp === "ask") {
    // The approval surface is the conversation: nothing is written unless the
    // suggested command is explicitly run, on the user's say-so.
    const askMessage =
      `mif-provenance: stamp mode is "ask" and this session's ledger witnessed ${filePath}. ` +
      `To approve stamping witnessed provenance into it, run: ` +
      `node ${process.env.CLAUDE_PLUGIN_ROOT ?? "."}/scripts/mif-provenance.mjs stamp "${filePath}" --session ${sessionId}. ` +
      `This requires the human user's explicit approval in this conversation; ` +
      `in an unattended run, treat it as denied.`;
    process.stdout.write(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "PostToolUse",
          additionalContext: wiringWarning ? `${wiringWarning}\n\n${askMessage}` : askMessage,
        },
      }) + "\n",
    );
    return;
  }

  // stamp === "auto": stamp silently on success (no message — success needs
  // no narration). A decline (unwitnessed, non-conformant, would-regress,
  // unwritable) or any thrown error is still fail-open — the write itself is
  // never blocked or undone — but issue #108: it must never again be
  // SILENT. Every failure path here surfaces an additionalContext message,
  // the same fail-loud-never-fail-closed posture the #90 wiringWarning above
  // already established for hook-wiring gaps; this closes the matching gap
  // for stamp-call failures that occur even when wiring is fully correct.
  let declineWarning = null;
  const pluginRoot = process.env.CLAUDE_PLUGIN_ROOT ?? ".";
  try {
    const { stampFile } = await import("../scripts/lib/provenance-stamp.mjs");
    const result = stampFile({ filePath, ledgerFile: ledgerPath(gitDir), sessionId });
    if (!result.stamped) {
      declineWarning =
        `mif-provenance: stamp mode is "auto" but stamping ${filePath} was declined ` +
        `(${result.reason}${result.detail ? `: ${result.detail}` : ""}). The document keeps ` +
        `whatever provenance it already had; run \`node ${pluginRoot}/scripts/mif-provenance.mjs verify ` +
        `"${filePath}" --session ${sessionId}\` to see the details, or \`stamp\` in place of \`verify\` to retry.`;
    }
  } catch (e) {
    declineWarning =
      `mif-provenance: stamp mode is "auto" but stamping ${filePath} threw (${e?.message ?? e}). ` +
      `The document keeps whatever provenance it already had; run ` +
      `\`node ${pluginRoot}/scripts/mif-provenance.mjs stamp "${filePath}" --session ${sessionId}\` ` +
      `to retry and see the error directly.`;
  }

  const message = [wiringWarning, declineWarning].filter(Boolean).join("\n\n");
  if (message) {
    process.stdout.write(
      JSON.stringify({
        hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: message },
      }) + "\n",
    );
  }
}

try {
  await main();
} catch {
  // fail open — observation must never break the session
}
process.exit(0);
