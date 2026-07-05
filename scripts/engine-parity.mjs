#!/usr/bin/env node
// engine-parity.mjs — assert the node engine (scripts/lib/projection.mjs) and
// the mif-rs Rust engine agree on every document this repo's CI gates.
//
//   engine-parity <path-to-mif-cli> [--expected tests/fixtures/engine-parity/expected-disagreements.json]
//
// For each corpus file, the node verdict is schema + lossless round-trip (the
// same checks mif-validate.mjs runs, minus the level overlay the Rust engine
// does not implement yet — mif-rs#40). The Rust verdict is `mif-cli ingest`
// into a throwaway per-file store: the one Rust entry point that projects
// markdown, proves roundtrip_lossless, and schema-checks (mif-rs#39/#41 track
// pure alternatives). A disagreement is one engine VALID and the other
// INVALID.
//
// Fail-closed in every direction: exit non-zero (1) on any disagreement NOT
// in the expected list, on any expected disagreement that no longer
// disagrees (stale expectation: an upstream fix landed — prune the list), on
// any ledger entry naming a file the corpus never visited (orphaned
// expectation: the file moved or the globs drifted), and on harness faults
// (unreadable/unparseable ledger, schema not hydrated, binary that cannot
// run, or a suspiciously small corpus) — a setup problem must never render
// as a verdict, and an empty run must never render as PARITY OK. A bad
// invocation (missing binary path, run from the wrong directory) is a
// separate usage error (exit 2).
//
// The node engine is authoritative (ADR-0004): a disagreement is evidence for
// an upstream mif-rs issue, never a reason to change a document that the
// node gates accept.
import { execFileSync } from "node:child_process";
import { readFileSync, existsSync, mkdtempSync, rmSync, globSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { loadValidator, toJsonld, parseMarkdown, roundTripFromMarkdown } from "./lib/projection.mjs";

const args = process.argv.slice(2);
// Every --expected occurrence's value index is excluded from positional
// matching, not just the first, so a repeated flag can't misbind the
// binary path to a later flag's value.
const expectedValueIndexes = new Set(
  args.flatMap((a, i) => (a === "--expected" ? [i + 1] : [])),
);
const expIdx = args.lastIndexOf("--expected");
const expectedPath = expIdx >= 0 ? args[expIdx + 1] : "tests/fixtures/engine-parity/expected-disagreements.json";
const mifCli = args.find((a, i) => !a.startsWith("--") && !expectedValueIndexes.has(i));

function usageError(message) {
  console.error(`engine-parity: ${message}`);
  console.error("usage: engine-parity <path-to-mif-cli> [--expected <json>]");
  process.exit(2);
}
function harnessFault(message) {
  console.error(`engine-parity: ${message}`);
  process.exit(1);
}
if (!mifCli || !existsSync(mifCli)) usageError("mif-cli binary path missing or not found");
if (!existsSync("package.json") || !existsSync("docs")) usageError("run from the repo root");
// A missing or unparseable ledger is a harness fault (exit 1), grouped with
// the other setup problems below — not an invocation usage error (exit 2).
if (!existsSync(expectedPath)) harnessFault(`expected-disagreements file not found: ${expectedPath}`);

// The same corpus ci.yml gates with mif-validate (templates, docs trees, and
// CHANGELOG.md), plus docs/reference/skills/ (see mif-docs-plugin#32) and
// this suite's committed parity fixtures. skills/adr/templates are
// structured-MADR (not gated by mif-validate) and stay out, matching ci.yml.
const GLOBS = [
  "skills/*/templates/good.md",
  "docs/adr/*.md",
  "docs/architecture/*.md",
  "docs/runbooks/*.md",
  "docs/reference/*.md",
  "docs/reference/skills/*.md",
  "docs/explanation/*.md",
  "docs/tutorials/*.md",
  "docs/how-to/*.md",
  "CHANGELOG.md",
  "tests/fixtures/engine-parity/*.md",
];
const corpus = GLOBS.flatMap((g) => globSync(g)).filter((f) => f !== "skills/adr/templates/good.md").sort();

// A gutted corpus means the globs or the checkout are wrong, not that parity
// holds; refuse to declare PARITY OK over (near-)nothing.
const CORPUS_FLOOR = 50;
if (corpus.length < CORPUS_FLOOR) {
  harnessFault(`corpus resolved to ${corpus.length} files (< ${CORPUS_FLOOR}); refusing a vacuous run`);
}

let expected;
try {
  expected = new Map(JSON.parse(readFileSync(expectedPath, "utf8")).disagreements.map((d) => [d.file, d]));
} catch (e) {
  harnessFault(`cannot parse ${expectedPath}: ${e.message}`);
}

// Load the validator once, outside the loop: a hydration/setup failure is a
// harness abort, and must not be misread as ~100 per-document verdicts.
let validator;
try {
  validator = loadValidator();
} catch (e) {
  harnessFault(`cannot load the canonical schema (run hydrate-schema first): ${e.message}`);
}

function nodeVerdict(file) {
  try {
    const text = readFileSync(file, "utf8");
    const jsonld = toJsonld(parseMarkdown(text));
    if (!validator.validate(jsonld)) return { valid: false, why: "schema" };
    if (!roundTripFromMarkdown(text).lossless) return { valid: false, why: "round-trip" };
    return { valid: true };
  } catch (e) {
    return { valid: false, why: e.message };
  }
}

// Each file ingests into its own throwaway store so Rust verdicts cannot
// depend on prior store state or id collisions across corpus files.
function rustVerdict(file, dbDir, index) {
  try {
    execFileSync(mifCli, ["--format", "json", "ingest", file, "--db-path", join(dbDir, `parity-${index}.db`)], {
      stdio: ["ignore", "ignore", "pipe"],
    });
    return { valid: true };
  } catch (e) {
    // e.code set (e.g. ENOENT) means the binary never ran at all — a harness
    // fault, not an engine verdict. A signal-killed process (e.g. a crash on
    // this specific file, e.status === null with e.signal set) DID run, so
    // its non-conformant result is a real rust=invalid verdict for this file,
    // not a reason to abort the whole corpus.
    if (e.code) {
      rmSync(dbDir, { recursive: true, force: true });
      harnessFault(`cannot execute ${mifCli}: ${e.message}`);
    }
    if (e.signal) return { valid: false, why: `killed(${e.signal})` };
    let why = "unknown";
    try { why = JSON.parse(e.stderr.toString()).type.split("/errors/")[1]; } catch { /* keep unknown */ }
    return { valid: false, why };
  }
}

const dbDir = mkdtempSync(join(tmpdir(), "mif-parity-"));
const visited = new Set();
let agree = 0;
let expectedHits = 0;
let unexpectedCount = 0;
let staleCount = 0;

corpus.forEach((file, index) => {
  visited.add(file);
  const node = nodeVerdict(file);
  const rust = rustVerdict(file, dbDir, index);
  const disagrees = node.valid !== rust.valid;
  const exp = expected.get(file);
  if (disagrees && exp) {
    expectedHits++;
    console.log(`EXPECTED-DISAGREEMENT ${file} (node=${node.valid ? "valid" : node.why} rust=${rust.valid ? "valid" : rust.why}) [${exp.upstream}]`);
  } else if (disagrees) {
    unexpectedCount++;
    console.error(`DISAGREEMENT ${file}: node=${node.valid ? "valid" : `invalid(${node.why})`} rust=${rust.valid ? "valid" : `invalid(${rust.why})`}`);
  } else if (exp) {
    staleCount++;
    console.error(`STALE-EXPECTATION ${file}: engines now agree (${node.valid ? "valid" : "invalid"}); remove it from ${expectedPath}`);
  } else {
    agree++;
  }
});
rmSync(dbDir, { recursive: true, force: true });

// A ledger entry naming a file the corpus never visited is silent rot: the
// file moved, was deleted, or the globs drifted. Fail so the entry is fixed.
let orphanCount = 0;
for (const file of expected.keys()) {
  if (!visited.has(file)) {
    orphanCount++;
    console.error(`ORPHANED-EXPECTATION ${file}: not matched by any corpus glob; fix or remove it in ${expectedPath}`);
  }
}

console.log(`\nengine-parity: ${corpus.length} docs — agree: ${agree}  expected-disagreements: ${expectedHits}  unexpected: ${unexpectedCount}  stale-expectations: ${staleCount}  orphaned-expectations: ${orphanCount}`);
if (unexpectedCount || staleCount || orphanCount) {
  console.error("RESULT: PARITY FAILED");
  process.exit(1);
}
console.log("RESULT: PARITY OK (node engine authoritative; expected disagreements tracked upstream)");
