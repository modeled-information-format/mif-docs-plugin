#!/usr/bin/env node
// mif-provenance — witnessed provenance verbs over the capture hooks' session
// ledger (scripts/lib/provenance-stamp.mjs holds the shared core).
//
//   mif-provenance stamp  <file> [--session <id>] [--ledger <path>]
//   mif-provenance verify <file> [--session <id>] [--ledger <path>]
//   mif-provenance status [--session <id>] [--ledger <path>]
//
// `status` answers "is capture actually active for THIS session right now" -
// issue #90: hooks can silently never fire (a plugin update or a settings
// change enabling capture mid-session isn't guaranteed to be wired into an
// already-running session's dispatch), with no other signal from inside the
// session that anything is wrong. Named `status`, not `doctor`, to avoid
// colliding with the unrelated `scripts/doctor.mjs` (mif-cli/mif-mcp binary
// health, `npm run doctor`).
//
// Session selection: --session, else $CLAUDE_CODE_SESSION_ID (the same
// variable name the capture hooks record from), else — only when the
// ledger shows EXACTLY ONE session ever touched the file — that session.
// Ambiguity (several witnessing sessions) is an error demanding --session,
// never a guess: selection can only ever land on a session the ledger
// witnessed touching the document, so cross-session attribution is
// structurally impossible.
//
// Exit codes: 0 stamped/match (status: healthy); 1 verify drift (status:
// capture is on but this session's hooks have not witnessed anything yet, or
// this plugin's hooks.json has changed since this session's session_start —
// confirmed by direct repro (issue #90) to mean the running session may still
// be dispatching a stale hook set); 2 usage/environment error (also covers:
// session_start recorded a hooksHash but the current on-disk hooks.json can't
// be read at all — that is an environment problem, never reported healthy);
// 3 stamp declined (unwitnessed, non-conformant, would-regress).

import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  findGitDir,
  hooksManifestHash,
  ledgerPath,
  readLedger,
  sessionsTouching,
  sessionStartOf,
  SESSION_ENV_VAR,
} from "./lib/provenance-ledger.mjs";

// Siblings within this plugin: scripts/mif-provenance.mjs -> ../hooks/hooks.json.
const HOOKS_JSON_PATH = join(dirname(fileURLToPath(import.meta.url)), "..", "hooks", "hooks.json");
import { stampFile, verifyFile } from "./lib/provenance-stamp.mjs";
import { resolveProvenanceConfig } from "./lib/provenance-config.mjs";

function usage(msg) {
  if (msg) console.error(`mif-provenance: ${msg}`);
  console.error(
    "usage: mif-provenance stamp|verify <file> [--session <id>] [--ledger <path>]\n" +
      "       mif-provenance status [--session <id>] [--ledger <path>]",
  );
  process.exit(2);
}

const args = process.argv.slice(2);
const verb = args.shift();
if (verb !== "stamp" && verb !== "verify" && verb !== "status") {
  usage(`unknown verb: ${verb ?? "(none)"}`);
}

if (verb === "status") {
  let session;
  let ledger;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--session") session = args[++i];
    else if (a === "--ledger") ledger = args[++i];
    else usage(`unexpected argument: ${a}`);
  }
  if (!session) session = process.env[SESSION_ENV_VAR];

  const cfg = resolveProvenanceConfig();
  console.log(`mifProvenance.capture: ${cfg.capture}`);
  console.log(`mifProvenance.stamp:   ${cfg.stamp}`);

  if (!ledger) {
    const gitDir = findGitDir(process.cwd());
    if (!gitDir) usage(`${process.cwd()} is not inside a git repository and no --ledger was given`);
    ledger = ledgerPath(gitDir);
  }

  if (!cfg.capture) {
    console.log("capture is off - nothing recorded, nothing expected.");
    process.exit(0);
  }
  if (!session) {
    console.log(
      `capture is on, but $${SESSION_ENV_VAR} is not set and no --session was given - cannot check this session's ledger entries.`,
    );
    process.exit(2);
  }

  const lines = readLedger(ledger);
  const start = sessionStartOf(lines, session);
  console.log(`session:               ${session}`);
  console.log(`ledger file:           ${ledger}`);
  if (start) {
    console.log(`session_start witnessed at: ${start.ts ?? "(no timestamp field)"}`);
    if (start.hooksHash) {
      const currentHooksHash = hooksManifestHash(HOOKS_JSON_PATH);
      if (!currentHooksHash) {
        console.log(
          `this plugin's hooks.json could not be read at ${HOOKS_JSON_PATH} - the drift ` +
            "check cannot run (environment/installation problem, not a healthy verdict).",
        );
        process.exit(2);
      }
      if (start.hooksHash !== currentHooksHash) {
        console.log(
          "this plugin's hooks.json has changed since this session started - the running " +
            "session may still be dispatching the hook set it loaded at start. Restart your " +
            "Claude Code session to pick up the change.",
        );
        process.exit(1);
      }
    }
    console.log("hooks are wired and witnessing this session.");
    process.exit(0);
  }
  console.log("no session_start line found for this session in the ledger.");
  console.log(
    "hooks have not fired for this session yet - if you just enabled capture or updated " +
      "this plugin, restart your Claude Code session.",
  );
  process.exit(1);
}

let file;
let session;
let ledger;
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === "--session") session = args[++i];
  else if (a === "--ledger") ledger = args[++i];
  else if (!file) file = a;
  else usage(`unexpected argument: ${a}`);
}
if (!file) usage("missing <file>");
const target = resolve(file);

if (!ledger) {
  const gitDir = findGitDir(target);
  if (!gitDir) usage(`${target} is not inside a git repository and no --ledger was given`);
  ledger = ledgerPath(gitDir);
}

// One ledger read serves session inference and the verb itself.
const ledgerLines = readLedger(ledger);
if (!session && process.env[SESSION_ENV_VAR]) session = process.env[SESSION_ENV_VAR];
if (!session) {
  const witnesses = sessionsTouching(ledgerLines, target);
  if (witnesses.length === 1) {
    session = witnesses[0];
  } else if (witnesses.length > 1) {
    usage(
      `${witnesses.length} sessions touched this file (${witnesses.join(", ")}); pass --session`,
    );
  }
  // zero witnesses: fall through with session undefined — stamp declines and
  // verify reports unwitnessed, each with its own message and exit code.
}

if (verb === "stamp") {
  const res = stampFile({ filePath: target, ledgerFile: ledger, sessionId: session, lines: ledgerLines });
  if (!res.stamped) {
    console.error(`DECLINED (${res.reason}): ${res.detail}`);
    process.exit(3);
  }
  console.log(`STAMPED${res.changed ? "" : " (already current — no bytes changed)"}: ${target}`);
  console.log(`  session:  ${session}`);
  console.log(`  agent:    ${res.fields.agent}`);
  if (res.fields.agentVersion) console.log(`  version:  ${res.fields.agentVersion}`);
  console.log(`  activity: ${res.fields.wasGeneratedBy["@id"]}`);
  console.log(`  trust:    ${res.fields.trustLevel} (fixed policy ceiling — unsigned local ledger)`);
  console.log(`  modified: ${res.modified}`);
  process.exit(0);
}

const res = verifyFile({ filePath: target, ledgerFile: ledger, sessionId: session, lines: ledgerLines });
if (res.verdict === "match") {
  console.log(`MATCH: ${target} provenance is exactly what the ledger witnesses (deterministic verdict — no model in the path)`);
  process.exit(0);
}
if (res.verdict === "unwitnessed") {
  console.error(`DRIFT (unwitnessed): ${res.detail}`);
  process.exit(1);
}
console.error(`DRIFT: ${target} provenance does not match the ledger-derived expectation:`);
for (const d of res.diffs) {
  console.error(`  ${d.field}: expected ${JSON.stringify(d.expected)}, found ${JSON.stringify(d.actual)}`);
}
console.error("verify never restamps; run the stamp verb explicitly to reconcile.");
process.exit(1);
