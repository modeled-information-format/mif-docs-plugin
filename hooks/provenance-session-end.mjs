#!/usr/bin/env node
// mif-provenance capture hook — SessionEnd.
//
// Writes the session's terminal line so ledger consumers can bound a
// session's activity window, with the repository state it ended on. Same
// postures as the other capture hooks: consent-gated fail-closed, then
// fail-open on every operational error, and the disabled path exits 0
// silently before any git or ledger I/O.

import { readFileSync } from "node:fs";
import { resolveProvenanceConfig } from "../scripts/lib/provenance-config.mjs";
import {
  appendLedgerLine,
  findGitDir,
  gitFacts,
} from "../scripts/lib/provenance-ledger.mjs";

const str = (v) => (typeof v === "string" && v !== "" ? v : null);

try {
  const payload = JSON.parse(readFileSync(0, "utf8"));
  const cwd = str(payload?.cwd) ?? process.cwd();
  const cfg = resolveProvenanceConfig({ cwd });
  if (cfg.capture === true) {
    const gitDir = findGitDir(cwd);
    if (gitDir) {
      appendLedgerLine(gitDir, {
        event: "session_end",
        sessionId: str(payload?.session_id) ?? str(process.env.CLAUDE_CODE_SESSION_ID),
        ts: new Date().toISOString(),
        reason: str(payload?.reason),
        permissionMode: str(payload?.permission_mode),
        promptId: str(payload?.prompt_id),
        git: gitFacts(gitDir),
      });
    }
  }
} catch {
  // fail open — observation must never break the session
}
process.exit(0);
