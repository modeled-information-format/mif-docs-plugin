#!/usr/bin/env node
// mif-provenance capture hook — SessionStart.
//
// Records the session-level facts (tool, model, session id, runtime
// environment, host, repository state) later stamped into frontmatter by the
// mif-provenance skill and consumed by ledger readers. Consent-gated by the
// mifProvenance config resolver (fail-closed) and then FAIL-OPEN on every
// operational error: this hook may never block, delay, or alter a session.
// When capture is disabled it exits 0 silently before touching the
// filesystem beyond the three settings files — that ordering is the
// under-50ms disabled-path budget (no git discovery, no ledger I/O).
//
// Everything recorded is witnessed, never guessed: the payload's documented
// fields; the model from the payload when present (it is optional there) or
// from the vendor transcript's own record; the tool version from the CLI's
// exec path; the allow-listed runtime environment (credential-shaped names
// are never recorded); host facts; and the repository's branch/HEAD.

import { readFileSync } from "node:fs";
import { resolveProvenanceConfig } from "../scripts/lib/provenance-config.mjs";
import {
  appendLedgerLine,
  envFacts,
  findGitDir,
  gitFacts,
  modelFromTranscript,
  strOrNull as str,
  sysFacts,
  toolVersionFrom,
  SESSION_ENV_VAR,
} from "../scripts/lib/provenance-ledger.mjs";

try {
  const payload = JSON.parse(readFileSync(0, "utf8"));
  const cwd = str(payload?.cwd) ?? process.cwd();
  const cfg = resolveProvenanceConfig({ cwd });
  if (cfg.capture === true) {
    const gitDir = findGitDir(cwd);
    if (gitDir) {
      const transcriptPath = str(payload?.transcript_path);
      appendLedgerLine(gitDir, {
        event: "session_start",
        sessionId: str(payload?.session_id) ?? str(process.env[SESSION_ENV_VAR]),
        ts: new Date().toISOString(),
        tool: "claude-code",
        toolVersion: toolVersionFrom(),
        model: str(payload?.model) ?? modelFromTranscript(transcriptPath),
        source: str(payload?.source),
        sessionTitle: str(payload?.session_title),
        permissionMode: str(payload?.permission_mode),
        effort: str(payload?.effort) ?? str(process.env.CLAUDE_EFFORT),
        promptId: str(payload?.prompt_id),
        agentId: str(payload?.agent_id),
        agentType: str(payload?.agent_type),
        transcriptPath,
        cwd,
        env: envFacts(),
        sys: sysFacts(),
        git: gitFacts(gitDir),
      });
    }
  }
} catch {
  // fail open — observation must never break the session
}
process.exit(0);
