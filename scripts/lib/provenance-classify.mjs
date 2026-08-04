// provenance-classify.mjs — the witnessed/asserted/none classification core
// shared by scripts/provenance-corpus-check.mjs (the Story #67 telemetry
// report) and scripts/audit-deterministic.mjs (the audit-docs provenance-drift
// check), so the two can never drift on what "witnessed" means.
//
// Classification per document:
//   witnessed — the provenance block carries the stamp marker (a
//               `wasGeneratedBy` activity URN under the claude-code-session
//               namespace), and, when a ledger is supplied, a verify pass
//               against it confirms the block (a drifted block downgrades to
//               asserted: the marker alone is a claim, the ledger is the
//               witness).
//   asserted  — a provenance block is present without witness.
//   none      — no provenance block.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { load as yamlLoad } from "js-yaml";

import { ACTIVITY_URN_PREFIX } from "./provenance-ledger.mjs";
import { splitFrontmatter } from "./mif-genre-signal.mjs";

export function provenanceOf(file) {
  let text;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    return null;
  }
  const split = splitFrontmatter(text);
  if (!split) return null;
  let fm;
  try {
    fm = yamlLoad(split.fmText);
  } catch {
    return null;
  }
  const p = fm?.provenance;
  return p && typeof p === "object" && !Array.isArray(p) ? p : null;
}

export function isMarked(prov) {
  const id = prov?.wasGeneratedBy?.["@id"];
  return typeof id === "string" && id.startsWith(ACTIVITY_URN_PREFIX);
}

// Only the stamp policy's own `claude-code/<model>` agent format carries a
// WITNESSED model component; any other agent string (e.g. an asserted
// `anthropic/claude-code`) does not name a model this classification can
// trust.
export function modelOf(agent) {
  return agent.startsWith("claude-code/") ? agent.slice("claude-code/".length) : "(unspecified)";
}

// Classify one file. `verify` is optional: { verifyFile, ledgerFile, lines }
// — supplied only when a ledger should act as the witness; the caller loads
// lib/provenance-stamp.mjs and reads the ledger ONCE for the whole corpus,
// never once per file.
export function classifyProvenance(file, verify = null) {
  const prov = provenanceOf(file);
  let status = "none";
  if (prov) {
    status = "asserted";
    if (isMarked(prov)) {
      if (verify) {
        const sessionId = prov.wasGeneratedBy["@id"].slice(ACTIVITY_URN_PREFIX.length);
        const v = verify.verifyFile({
          filePath: resolve(file),
          ledgerFile: verify.ledgerFile,
          sessionId,
          lines: verify.lines,
        });
        status = v.verdict === "match" ? "witnessed" : "asserted";
      } else {
        status = "witnessed";
      }
    }
  }
  return {
    file,
    status,
    agent: typeof prov?.agent === "string" && prov.agent ? prov.agent : "(unattributed)",
  };
}
