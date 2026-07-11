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
// Postures: consent resolution is fail-closed (provenance-config.mjs); every
// operational path after it is FAIL-OPEN — this hook exits 0 no matter what
// and never blocks a Write. The disabled path (capture off and stamp off)
// exits before any git discovery or ledger I/O — that ordering is the
// under-50ms disabled-path budget. The stamp machinery (js-yaml, ajv via the
// projection module) is loaded via dynamic import only when a qualifying
// genre document meets an enabled stamp mode, keeping the capture-only path
// as light as mif-guard's.

import { readFileSync } from "node:fs";
import { resolveProvenanceConfig } from "../scripts/lib/provenance-config.mjs";
import {
  appendLedgerLine,
  fileFacts,
  findGitDir,
  gitFacts,
  ledgerPath,
  modelFromTranscript,
} from "../scripts/lib/provenance-ledger.mjs";
import { MIF_IDENTITY_SIGNAL_KEYS } from "../scripts/lib/mif-identity-signal-keys.mjs";

const str = (v) => (typeof v === "string" && v !== "" ? v : null);

const CAPTURED_TOOLS = new Set(["Write", "Edit", "MultiEdit"]);

// Same genre-signal detection as hooks/mif-guard.mjs: top-level identity or
// genre keys, with the structured-MADR `type: adr` carve-out (those documents
// are owned by the structured-madr validator, not the MIF pipeline).
function isMifGenreDoc(filePath) {
  if (!filePath.endsWith(".md")) return false;
  let content;
  try {
    content = readFileSync(filePath, "utf8");
  } catch {
    return false;
  }
  const fm = content.match(/^---\n([\s\S]*?)\n---/);
  if (!fm) return false;
  const front = fm[1];
  if (/(^|\n)type[ \t]*:[ \t]*adr\b/.test(front)) return false;
  const GENRE_KEYS = ["diataxis_type", "x-ontology", "ontology"];
  const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const bareKeyPattern = [...GENRE_KEYS, ...MIF_IDENTITY_SIGNAL_KEYS].map(escapeRegExp).join("|");
  return (
    new RegExp(`(^|\\n)(${bareKeyPattern})[ \\t]*:`).test(front) ||
    /(^|\n)type[ \t]*:[ \t]*(semantic|episodic|procedural|tutorial|how-to|reference|explanation|runbook|playbook|changelog|decision-record)\b/.test(
      front,
    )
  );
}

async function main() {
  const payload = JSON.parse(readFileSync(0, "utf8"));
  const cwd = typeof payload?.cwd === "string" && payload.cwd ? payload.cwd : process.cwd();
  const cfg = resolveProvenanceConfig({ cwd });
  if (cfg.capture !== true && cfg.stamp === "off") return; // disabled-silent fast path

  const toolName = payload?.tool_name;
  const filePath = payload?.tool_input?.file_path;
  if (!CAPTURED_TOOLS.has(toolName) || typeof filePath !== "string" || !filePath) return;

  const gitDir = findGitDir(cwd);
  if (!gitDir) return; // outside a git repository, capture disables — no alternative store

  const sessionId = str(payload?.session_id) ?? str(process.env.CLAUDE_CODE_SESSION_ID);

  if (cfg.capture === true) {
    // Per-touch facts: the model that did the touching (the transcript is
    // authoritative and mid-session /model switches are real), which prompt
    // and agent it happened under, the repo state, and a hash of the bytes
    // actually written — so a consumer can later prove whether today's file
    // is still what this session produced. Never the content itself.
    appendLedgerLine(gitDir, {
      event: "file_touch",
      sessionId,
      ts: new Date().toISOString(),
      tool: "claude-code",
      via: toolName,
      filePath,
      model: modelFromTranscript(str(payload?.transcript_path)),
      promptId: str(payload?.prompt_id),
      permissionMode: str(payload?.permission_mode),
      effort: str(payload?.effort) ?? str(process.env.CLAUDE_EFFORT),
      agentId: str(payload?.agent_id),
      agentType: str(payload?.agent_type),
      git: gitFacts(gitDir),
      ...fileFacts(filePath),
    });
  }

  // Mediated stamp path. Stamping needs a witnessed touch, so without capture
  // there is nothing to stamp from — the verbs decline on their own, but we
  // avoid even loading them.
  if (cfg.capture !== true || cfg.stamp === "off" || !sessionId) return;
  if (!isMifGenreDoc(filePath)) return;

  if (cfg.stamp === "ask") {
    // No interactive surface (CI/headless): behave exactly as "off".
    if (process.env.CI) return;
    // The approval surface is the conversation: nothing is written unless the
    // suggested command is explicitly run.
    process.stdout.write(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "PostToolUse",
          additionalContext:
            `mif-provenance: stamp mode is "ask" and this session's ledger witnessed ${filePath}. ` +
            `To approve stamping witnessed provenance into it, run: ` +
            `node ${process.env.CLAUDE_PLUGIN_ROOT ?? "."}/scripts/mif-provenance.mjs stamp "${filePath}" --session ${sessionId}. ` +
            `Do not run it without the user's explicit approval.`,
        },
      }) + "\n",
    );
    return;
  }

  // stamp === "auto": stamp silently; a decline (unwitnessed, non-MIF,
  // validation regression) or any error is swallowed — fail open.
  const { stampFile } = await import("../scripts/lib/provenance-stamp.mjs");
  stampFile({ filePath, ledgerFile: ledgerPath(gitDir), sessionId });
}

try {
  await main();
} catch {
  // fail open — observation must never break the session
}
process.exit(0);
