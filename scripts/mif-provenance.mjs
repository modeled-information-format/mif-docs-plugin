#!/usr/bin/env node
// mif-provenance — witnessed provenance verbs over the capture hooks' session
// ledger (scripts/lib/provenance-stamp.mjs holds the shared core).
//
//   mif-provenance stamp  <file> [--session <id>] [--ledger <path>]
//   mif-provenance verify <file> [--session <id>] [--ledger <path>]
//
// Session selection: --session, else $CLAUDE_SESSION_ID, else — only when the
// ledger shows EXACTLY ONE session ever touched the file — that session.
// Ambiguity (several witnessing sessions) is an error demanding --session,
// never a guess: selection can only ever land on a session the ledger
// witnessed touching the document, so cross-session attribution is
// structurally impossible.
//
// Exit codes: 0 stamped/match; 1 verify drift; 2 usage/environment error;
// 3 stamp declined (unwitnessed, non-conformant, would-regress).

import { resolve } from "node:path";
import {
  findGitDir,
  ledgerPath,
  readLedger,
  sessionsTouching,
} from "./lib/provenance-ledger.mjs";
import { stampFile, verifyFile } from "./lib/provenance-stamp.mjs";

function usage(msg) {
  if (msg) console.error(`mif-provenance: ${msg}`);
  console.error("usage: mif-provenance stamp|verify <file> [--session <id>] [--ledger <path>]");
  process.exit(2);
}

const args = process.argv.slice(2);
const verb = args.shift();
if (verb !== "stamp" && verb !== "verify") usage(`unknown verb: ${verb ?? "(none)"}`);

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

if (!session && process.env.CLAUDE_SESSION_ID) session = process.env.CLAUDE_SESSION_ID;
if (!session) {
  const witnesses = sessionsTouching(readLedger(ledger), target);
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
  const res = stampFile({ filePath: target, ledgerFile: ledger, sessionId: session });
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

const res = verifyFile({ filePath: target, ledgerFile: ledger, sessionId: session });
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
