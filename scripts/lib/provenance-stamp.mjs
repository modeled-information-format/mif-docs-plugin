// provenance-stamp.mjs — the deterministic core behind both mif-provenance
// verbs (scripts/mif-provenance.mjs) and the hook-mediated auto path
// (hooks/provenance-post-tool-use.mjs).
//
// stamp writes ONLY ledger-witnessed fields into a document's frontmatter
// `provenance` block — `agent`, `agentVersion`, `wasGeneratedBy` (the session
// activity URN) — plus `trustLevel` from the fixed policy below. It never
// writes `confidence` (witness proves presence, never extent), declines when
// the ledger records no touch of the document by the given session, and
// modifies only the `provenance` block and the `modified` timestamp — by
// splicing exactly those lines of the raw frontmatter text, so every other
// byte of the file survives verbatim. Idempotent: identical ledger facts
// produce identical bytes.
//
// verify re-derives the expected block from the same ledger and reports
// match or drift per owned field. It never restamps. No model is in either
// path (the mif-validate precedent): identical document + ledger + config
// yield identical output.

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { dump as yamlDump, load as yamlLoad } from "js-yaml";

import {
  activityUrn,
  readLedger,
  sessionStartOf,
  touchesOf,
} from "./provenance-ledger.mjs";
import {
  checkLevel,
  loadValidator,
  parseMarkdown,
  roundTripFromMarkdown,
  toJsonld,
} from "./projection.mjs";

// Fixed trust policy: the ledger is a local, unsigned witness, so the ceiling
// is `user_stated` — never `verified`, which the MIF spec reserves for
// externally verifiable attestations. Not configurable by design.
export const STAMP_TRUST_LEVEL = "user_stated";

// The provenance fields this helper OWNS (writes on stamp, compares on
// verify). Everything else in an existing block is preserved untouched.
export const OWNED_FIELDS = ["agent", "agentVersion", "wasGeneratedBy", "trustLevel"];

// ---------------------------------------------------------------------------
// policy: ledger facts -> expected owned-field values
// ---------------------------------------------------------------------------
export function deriveExpected({ lines, sessionId, filePath }) {
  const touches = touchesOf(lines, filePath, sessionId).filter(
    (t) => typeof t.ts === "string" && t.ts,
  );
  if (!sessionId || touches.length === 0) return { witnessed: false };

  const start = sessionStartOf(lines, sessionId);
  const isStr = (v) => typeof v === "string" && v !== "";
  // ISO-8601 strings order lexicographically; the LATEST touch's model wins
  // (mid-session /model switches are real), falling back to the session line.
  const latestTouch = [...touches].sort((a, b) => (a.ts < b.ts ? -1 : 1)).at(-1);
  const model = [latestTouch?.model, start?.model].find(isStr) ?? null;
  const toolVersion = isStr(start?.toolVersion) ? start.toolVersion : null;

  const fields = {
    // The witnessing surface is the claude-code hook set; the model qualifies
    // the agent identifier when the ledger witnessed one.
    agent: model ? `claude-code/${model}` : "claude-code",
    wasGeneratedBy: { "@id": activityUrn(sessionId), "@type": "prov:Activity" },
    trustLevel: STAMP_TRUST_LEVEL,
  };
  // agentVersion only when witnessed — stamp never guesses a value, and an
  // unwitnessed field is omitted rather than invented.
  if (toolVersion) fields.agentVersion = toolVersion;

  // ISO-8601 strings order lexicographically, so max() is the latest touch.
  const modified = touches.map((t) => t.ts).sort().at(-1);
  return { witnessed: true, fields, modified };
}

// ---------------------------------------------------------------------------
// surgical frontmatter splicing
// ---------------------------------------------------------------------------
const FM_RE = /^---\n([\s\S]*?)\n---(\r?\n?[\s\S]*)$/;

function dumpTopLevel(key, value) {
  // Same dump options as projection.mjs's serializeMarkdown, so a stamped
  // block is byte-identical to what a full canonical serialization would
  // produce for the same subtree.
  return yamlDump({ [key]: value }, { lineWidth: -1, noRefs: true, sortKeys: false });
}

// Replace (or append) one top-level YAML key's block inside raw frontmatter
// text, leaving every other line verbatim. A top-level block runs from its
// `key:` line to the next column-0 line.
function spliceTopLevelKey(fmText, key, dumpedBlock) {
  const lines = fmText.split("\n");
  const keyRe = new RegExp(`^${key}[ \\t]*:`);
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    if (keyRe.test(lines[i])) {
      start = i;
      break;
    }
  }
  const block = dumpedBlock.replace(/\n$/, "").split("\n");
  if (start === -1) {
    return [...lines, ...block].join("\n");
  }
  let end = start + 1;
  while (end < lines.length && !/^\S/.test(lines[end])) end++;
  return [...lines.slice(0, start), ...block, ...lines.slice(end)].join("\n");
}

// The highest MIF level (3..1) the document satisfies, or 0 if it is not
// schema-valid / round-trip-lossless at all.
export function highestSatisfiedLevel(text, validate) {
  let rt;
  try {
    rt = roundTripFromMarkdown(text);
  } catch {
    return 0;
  }
  if (!rt.lossless || !validate(rt.jsonld1)) return 0;
  for (const level of [3, 2, 1]) {
    if (checkLevel(rt.jsonld1, level).length === 0) return level;
  }
  return 0;
}

function buildStampedText(text, expected) {
  const m = text.match(FM_RE);
  if (!m) return { error: "no YAML frontmatter block" };
  const [, fmText, rest] = m;

  let fm;
  try {
    fm = yamlLoad(fmText) || {};
  } catch (e) {
    return { error: `frontmatter is not parseable YAML: ${e.message}` };
  }

  const existing =
    fm.provenance && typeof fm.provenance === "object" && !Array.isArray(fm.provenance)
      ? fm.provenance
      : {};
  const provenance = { "@type": "Provenance", ...existing, ...expected.fields };
  // Owned fields the ledger did not witness are removed, never carried over
  // as unwitnessed assertions inside a witnessed block.
  for (const f of OWNED_FIELDS) {
    if (!(f in expected.fields)) delete provenance[f];
  }

  let newFm = spliceTopLevelKey(fmText, "provenance", dumpTopLevel("provenance", provenance));
  newFm = spliceTopLevelKey(newFm, "modified", dumpTopLevel("modified", expected.modified));
  return { text: `---\n${newFm}\n---${rest}` };
}

// ---------------------------------------------------------------------------
// stamp
// ---------------------------------------------------------------------------
// Returns one of:
//   { stamped: true,  changed: boolean, fields, modified }
//   { stamped: false, reason: "unwitnessed" | "not-conformant" | ..., detail? }
export function stampFile({ filePath, ledgerFile, sessionId }) {
  const target = resolve(filePath);
  const lines = readLedger(ledgerFile);
  const expected = deriveExpected({ lines, sessionId, filePath: target });
  if (!expected.witnessed) {
    return {
      stamped: false,
      reason: "unwitnessed",
      detail: `the ledger records no touch of ${target} by session ${sessionId ?? "(none)"}`,
    };
  }

  let original;
  try {
    original = readFileSync(target, "utf8");
  } catch (e) {
    return { stamped: false, reason: "unreadable", detail: e.message };
  }

  const { validate } = loadValidator();
  const before = highestSatisfiedLevel(original, validate);
  if (before === 0) {
    return {
      stamped: false,
      reason: "not-conformant",
      detail: "the document does not validate as MIF before stamping; fix it first (mif-validate)",
    };
  }

  const built = buildStampedText(original, expected);
  if (built.error) return { stamped: false, reason: "unstampable", detail: built.error };

  const after = highestSatisfiedLevel(built.text, validate);
  if (after < before) {
    // Never trade conformance for provenance: leave the file untouched.
    return {
      stamped: false,
      reason: "would-regress",
      detail: `stamping would drop the document from MIF L${before} to L${after}`,
    };
  }

  const changed = built.text !== original;
  if (changed) writeFileSync(target, built.text);
  return { stamped: true, changed, fields: expected.fields, modified: expected.modified };
}

// ---------------------------------------------------------------------------
// verify
// ---------------------------------------------------------------------------
// Returns { verdict: "match" | "drift" | "unwitnessed", diffs: [...] } where
// each diff is { field, expected, actual }. Never writes anything.
export function verifyFile({ filePath, ledgerFile, sessionId }) {
  const target = resolve(filePath);
  const lines = readLedger(ledgerFile);
  const expected = deriveExpected({ lines, sessionId, filePath: target });
  if (!expected.witnessed) {
    return {
      verdict: "unwitnessed",
      diffs: [],
      detail: `the ledger records no touch of ${target} by session ${sessionId ?? "(none)"}`,
    };
  }

  let doc;
  try {
    doc = parseMarkdown(readFileSync(target, "utf8"));
  } catch (e) {
    return { verdict: "drift", diffs: [{ field: "(document)", expected: "parseable MIF markdown", actual: e.message }] };
  }
  const jsonld = toJsonld(doc);
  const actualProv =
    jsonld.provenance && typeof jsonld.provenance === "object" ? jsonld.provenance : {};

  const diffs = [];
  for (const field of OWNED_FIELDS) {
    const want = expected.fields[field];
    const got = actualProv[field];
    if (JSON.stringify(want ?? null) !== JSON.stringify(got ?? null)) {
      diffs.push({ field, expected: want ?? null, actual: got ?? null });
    }
  }
  return { verdict: diffs.length === 0 ? "match" : "drift", diffs };
}
