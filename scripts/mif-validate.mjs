#!/usr/bin/env node
// mif-validate.mjs — deterministic MIF conformance gate (no LLM in the path).
//
//   mif-validate <doc.md|.json|.jsonld> [--level 1|2|3] [--no-roundtrip]
//
// Accepts EITHER input form. For markdown it projects to the canonical JSON-LD
// first. It then (1) validates that JSON-LD against the hydrated canonical
// schema, (2) enforces the requested level floor, and (3) verifies the
// markdown<->JSON-LD round-trip is lossless. Fail-closed: any failure exits
// non-zero. Identical input + identical resolved schema -> identical verdict.
import { readFileSync } from "node:fs";
import {
  parseMarkdown, toJsonld, roundTripFromMarkdown, roundTripFromJsonld,
  loadValidator, checkLevel,
} from "./lib/projection.mjs";

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--"));
const levelArg = args.indexOf("--level");
const level = levelArg >= 0 ? Number(args[levelArg + 1]) : 1;
const skipRoundtrip = args.includes("--no-roundtrip");

if (!file) {
  console.error("usage: mif-validate <file> [--level 1|2|3] [--no-roundtrip]");
  process.exit(2);
}

const isJson = /\.jsonl?d?$|\.json$/.test(file);
const failures = [];

// Render an ajv enum error's permitted values as a trailing hint. Non-enum
// errors, and enum errors ajv reported without a usable allowedValues array,
// render as the empty string so their message is left exactly as it was.
function allowedValuesHint(e) {
  const allowed = e.keyword === "enum" ? e.params?.allowedValues : undefined;
  if (!Array.isArray(allowed) || allowed.length === 0) return "";
  return ` (allowed: ${allowed.join(", ")})`;
}

let jsonld;
try {
  const text = readFileSync(file, "utf8");
  jsonld = isJson ? JSON.parse(text) : toJsonld(parseMarkdown(text));
} catch (e) {
  console.error(`mif-validate: cannot read/project ${file}: ${e.message}`);
  process.exit(1);
}

// 1. canonical JSON Schema check
let resolvedVersion = "unknown";
try {
  const v = loadValidator();
  resolvedVersion = v.resolvedVersion;
  if (!v.validate(jsonld)) {
    for (const e of v.validate.errors) {
      // ajv's default enum message ("must be equal to one of the allowed
      // values") never names the values — they live in params.allowedValues.
      // Naming them matters because this text is not just read by a human:
      // the fail-closed guard embeds it verbatim as the remediation
      // instruction fed back to the model (hooks/mif-guard.mjs), which is
      // useless for an enum violation if it never says what to choose from.
      // Sourced from the hydrated canonical schema at validation time, so it
      // cannot drift from the enum the way a hardcoded copy of it would.
      failures.push(`schema: ${e.instancePath || "(root)"} ${e.message}${allowedValuesHint(e)}`);
    }
  }
} catch (e) {
  // A schema that was never hydrated locally is an environment/tooling gap,
  // not a document-conformance failure — report and exit distinctly so a
  // caller (e.g. the fail-closed guard) doesn't tell the model to fix
  // frontmatter when the actual fix is `npm run hydrate-schema`.
  if (e.code === "SCHEMA_NOT_HYDRATED") {
    console.log(`mif-validate ${file}`);
    console.error(`  ERROR: cannot validate — ${e.message}`);
    process.exit(3);
  }
  failures.push(`schema: ${e.message}`);
}

// 2. level floor
const missing = (() => {
  try { return checkLevel(jsonld, level); }
  catch (e) { failures.push(`level: ${e.message}`); return []; }
})();
for (const m of missing) failures.push(`level ${level}: missing required field "${m}"`);

// 3. lossless round-trip (md <-> jsonld)
let rt = null;
if (!skipRoundtrip) {
  try {
    const text = readFileSync(file, "utf8");
    rt = isJson ? roundTripFromJsonld(JSON.parse(text)) : roundTripFromMarkdown(text);
    if (!rt.lossless) failures.push("round-trip: markdown<->jsonld is NOT lossless (information lost)");
  } catch (e) {
    failures.push(`round-trip: ${e.message}`);
  }
}

const rtStr = skipRoundtrip ? "skipped" : rt && rt.lossless ? "lossless" : "FAILED";
console.log(`mif-validate ${file}`);
console.log(`  schema: ${resolvedVersion}  level: ${level}  round-trip: ${rtStr}`);
if (failures.length) {
  console.error(`  RESULT: INVALID (${failures.length} failure${failures.length > 1 ? "s" : ""})`);
  for (const f of failures) console.error(`    - ${f}`);
  process.exit(1);
}
console.log(`  RESULT: VALID at MIF L${level} (schema-conformant + round-trip lossless)`);
