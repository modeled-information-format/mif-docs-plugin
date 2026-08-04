#!/usr/bin/env node
// provenance-corpus-check.mjs — witnessed-vs-asserted provenance coverage
// over a corpus of MIF documents (Story #67, the telemetry boundary).
//
//   provenance-corpus-check [--dir <path>] [--ledger <path>]
//
// Default corpus: the suite's own gated docs (scripts/lib/corpus.mjs — the
// same one definition ci.yml, release.yml and engine-parity.mjs consume), so
// this report can never disagree with the validation gates about what "the
// corpus" is. --dir switches to every .md under one tree instead.
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
//
// Idempotent at the byte level: identical inputs yield identical output — no
// timestamps, no environment echoes, deterministic ordering throughout. CI
// runs it twice and diffs to hold that property.

import { globSync } from "node:fs";

import { listGatedDocs } from "./lib/corpus.mjs";
import { readLedger } from "./lib/provenance-ledger.mjs";
import { classifyProvenance, modelOf } from "./lib/provenance-classify.mjs";

const args = process.argv.slice(2);
let dir;
let ledgerFile;
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === "--dir") dir = args[++i];
  else if (a === "--ledger") ledgerFile = args[++i];
  else {
    console.error(`provenance-corpus-check: unexpected argument: ${a}`);
    process.exit(2);
  }
}

const files = (dir ? globSync(`${dir}/**/*.md`) : listGatedDocs()).sort();
if (files.length === 0) {
  console.error(`provenance-corpus-check: no .md files found${dir ? ` under ${dir}` : ""}`);
  process.exit(1);
}

// The witnessed/asserted/none classification itself lives in
// lib/provenance-classify.mjs (shared with audit-deterministic.mjs).
// verify (against a ledger) only when asked for one; loaded lazily so the
// default CI run keeps zero heavy imports beyond js-yaml. The ledger is read
// and parsed ONCE for the whole corpus, not once per marked file.
let verify = null;
if (ledgerFile) {
  const { verifyFile } = await import("./lib/provenance-stamp.mjs");
  verify = { verifyFile, ledgerFile, lines: readLedger(ledgerFile) };
}

const rows = files.map((file) => classifyProvenance(file, verify));

function tally(keyOf) {
  const map = new Map();
  for (const r of rows) {
    if (r.status === "none") continue;
    const key = keyOf(r);
    const t = map.get(key) ?? { witnessed: 0, asserted: 0 };
    t[r.status] += 1;
    map.set(key, t);
  }
  return [...map.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
}

const counts = { witnessed: 0, asserted: 0, none: 0 };
for (const r of rows) counts[r.status] += 1;

const out = [];
out.push("mif-provenance corpus coverage");
out.push("==============================");
out.push("");
out.push(
  `files: ${rows.length} (witnessed ${counts.witnessed}, asserted ${counts.asserted}, none ${counts.none})`,
);
out.push(`ledger: ${ledgerFile ? "consulted" : "none supplied (stamp-marker classification only)"}`);
out.push("");
out.push("by agent:");
for (const [agent, t] of tally((r) => r.agent)) {
  out.push(`  ${agent}: witnessed ${t.witnessed}, asserted ${t.asserted}`);
}
out.push("");
out.push("by model:");
for (const [model, t] of tally((r) => modelOf(r.agent))) {
  out.push(`  ${model}: witnessed ${t.witnessed}, asserted ${t.asserted}`);
}
out.push("");
out.push("per file:");
for (const r of rows) {
  out.push(`  ${r.status.padEnd(9)} ${r.file}`);
}
console.log(out.join("\n"));
