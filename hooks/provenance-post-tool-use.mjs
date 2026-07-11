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
import { dirname, resolve } from "node:path";
import { resolveProvenanceConfig } from "../scripts/lib/provenance-config.mjs";
import {
  appendLedgerLine,
  canonicalPath,
  findGitDir,
  gitFacts,
  ledgerPath,
  modelFromTranscript,
  strOrNull,
  toolVersionFrom,
  SESSION_ENV_VAR,
} from "../scripts/lib/provenance-ledger.mjs";
import { isMifGenreText } from "../scripts/lib/mif-genre-signal.mjs";

const CAPTURED_TOOLS = new Set(["Write", "Edit", "MultiEdit"]);

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

  if (cfg.stamp === "ask") {
    // The approval surface is the conversation: nothing is written unless the
    // suggested command is explicitly run, on the user's say-so.
    process.stdout.write(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "PostToolUse",
          additionalContext:
            `mif-provenance: stamp mode is "ask" and this session's ledger witnessed ${filePath}. ` +
            `To approve stamping witnessed provenance into it, run: ` +
            `node ${process.env.CLAUDE_PLUGIN_ROOT ?? "."}/scripts/mif-provenance.mjs stamp "${filePath}" --session ${sessionId}. ` +
            `This requires the human user's explicit approval in this conversation; ` +
            `in an unattended run, treat it as denied.`,
        },
      }) + "\n",
    );
    return;
  }

  // stamp === "auto": stamp silently; a decline (unwitnessed, non-MIF,
  // validation regression) or any error is swallowed — fail open. stampFile
  // itself witnesses its own rewrite with a `via: "stamp"` ledger line, so
  // the latest recorded contentHash always matches the on-disk bytes.
  const { stampFile } = await import("../scripts/lib/provenance-stamp.mjs");
  stampFile({ filePath, ledgerFile: ledgerPath(gitDir), sessionId });
}

try {
  await main();
} catch {
  // fail open — observation must never break the session
}
process.exit(0);
