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
// produce identical bytes. The write is atomic (temp file + rename in the
// same directory), so a concurrently-running reader — the parallel mif-guard
// hook validating the same just-written file — sees either the pre-stamp or
// the post-stamp bytes, both conformant, never a torn file. And the stamp
// witnesses its own rewrite: a `via: "stamp"` file_touch line records the
// post-stamp content hash, so the ledger's newest hash for a document always
// matches the bytes on disk.
//
// verify re-derives the expected block from the same ledger and reports
// match or drift per owned field (structurally — key order is formatting,
// not fact). It never restamps. No model is in either path (the mif-validate
// precedent): identical document + ledger + config yield identical output.

import { readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { dump as yamlDump, load as yamlLoad } from "js-yaml";

import {
  activityUrn,
  appendToLedgerFile,
  canonicalPath,
  fileFacts,
  readLedger,
  sessionStartOf,
  strOrNull,
  touchesOf,
} from "./provenance-ledger.mjs";
import { splitFrontmatter } from "./mif-genre-signal.mjs";
import {
  checkLevel,
  deepEqual,
  loadValidator,
  parseMarkdown,
  roundTripFromMarkdown,
  toJsonld,
  YAML_DUMP_OPTIONS,
} from "./projection.mjs";

// Fixed trust policy: the ledger is a local, unsigned witness, so the ceiling
// is `user_stated` — never `verified`, which the MIF spec reserves for
// externally verifiable attestations. Not configurable by design.
export const STAMP_TRUST_LEVEL = "user_stated";

// The provenance fields this helper OWNS (writes on stamp, compares on
// verify). Everything else in an existing block is preserved untouched.
const OWNED_FIELDS = ["agent", "agentVersion", "wasGeneratedBy", "trustLevel"];

// ---------------------------------------------------------------------------
// policy: ledger facts -> expected owned-field values
// ---------------------------------------------------------------------------
export function deriveExpected({ lines, sessionId, filePath }) {
  const touches = touchesOf(lines, filePath, sessionId).filter((t) => strOrNull(t.ts));
  if (!sessionId || touches.length === 0) return { witnessed: false };

  const start = sessionStartOf(lines, sessionId);
  // ISO-8601 strings order lexicographically; the LATEST touch's facts win
  // (mid-session /model switches are real), falling back to the session line.
  // The comparator honors the sort contract (returns 0 on equal ts) so the
  // sort stays stable: equal-timestamp touches keep ledger order and the
  // LATER LINE wins — exactly what the stamp self-witness (which reuses the
  // witnessed touch's ts) relies on.
  const latestTouch = [...touches]
    .sort((a, b) => (a.ts < b.ts ? -1 : a.ts > b.ts ? 1 : 0))
    .at(-1);
  const model = strOrNull(latestTouch.model) ?? strOrNull(start?.model);
  const toolVersion = strOrNull(latestTouch.toolVersion) ?? strOrNull(start?.toolVersion);

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

  return { witnessed: true, fields, modified: latestTouch.ts, model, toolVersion };
}

// ---------------------------------------------------------------------------
// surgical frontmatter splicing
// ---------------------------------------------------------------------------
function dumpTopLevel(key, value) {
  // The canonical dump options (projection.mjs), so a stamped block is
  // byte-identical to what a full canonical serialization would produce for
  // the same subtree.
  return yamlDump({ [key]: value }, YAML_DUMP_OPTIONS);
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

// ---------------------------------------------------------------------------
// validation plumbing (memoized: the auto-stamp hook and batch callers must
// not pay an ajv schema compile per file)
// ---------------------------------------------------------------------------
let cachedValidate = null;
function getValidator() {
  if (!cachedValidate) cachedValidate = loadValidator().validate;
  return cachedValidate;
}

function satisfiesLevel(text, level, validate) {
  let rt;
  try {
    rt = roundTripFromMarkdown(text);
  } catch {
    return false;
  }
  if (!rt.lossless || !validate(rt.jsonld1)) return false;
  return checkLevel(rt.jsonld1, level).length === 0;
}

// The highest MIF level (3..1) the document satisfies, or 0 if it is not
// schema-valid / round-trip-lossless at all.
export function highestSatisfiedLevel(text, validate = getValidator()) {
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
  const split = splitFrontmatter(text);
  if (!split) return { error: "no YAML frontmatter block" };
  const { fmText, rest } = split;

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
  // "@type" sits after ...existing so a foreign existing value can never
  // override the stamped block's type.
  const provenance = { ...existing, "@type": "Provenance", ...expected.fields };
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
// `lines` may carry a pre-read ledger to avoid re-parsing (batch callers).
export function stampFile({ filePath, ledgerFile, sessionId, lines }) {
  const target = canonicalPath(filePath);
  const ledgerLines = lines ?? readLedger(ledgerFile);
  const expected = deriveExpected({ lines: ledgerLines, sessionId, filePath: target });
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

  const validate = getValidator();
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

  // Never trade conformance for provenance: the stamped text must still
  // satisfy the level the document already held.
  if (!satisfiesLevel(built.text, before, validate)) {
    return {
      stamped: false,
      reason: "would-regress",
      detail: `stamping would drop the document below MIF L${before}`,
    };
  }

  const changed = built.text !== original;
  if (changed) {
    // Atomic replace: a concurrent reader (the parallel mif-guard hook) sees
    // whole pre-stamp or whole post-stamp bytes, never a torn file.
    const tmp = join(dirname(target), `.${basename(target)}.mif-provenance-tmp`);
    writeFileSync(tmp, built.text);
    try {
      renameSync(tmp, target);
    } catch (e) {
      try {
        unlinkSync(tmp);
      } catch {
        // leave nothing behind on the failure path if we can help it
      }
      return { stamped: false, reason: "unwritable", detail: e.message };
    }
    // Witness our own rewrite, so the ledger's newest hash for this document
    // matches the on-disk bytes. ts reuses the witnessed touch time the
    // stamp derived `modified` from — wall clock here would make re-stamps
    // derive a new `modified` and break byte idempotency.
    if (ledgerFile) {
      try {
        appendToLedgerFile(ledgerFile, {
          event: "file_touch",
          sessionId,
          ts: expected.modified,
          tool: "mif-provenance",
          via: "stamp",
          filePath: target,
          model: expected.model,
          toolVersion: expected.toolVersion,
          ...fileFacts(target),
        });
      } catch {
        // the stamp itself succeeded; a failed self-witness must not undo it
      }
    }
  }
  return { stamped: true, changed, fields: expected.fields, modified: expected.modified };
}

// ---------------------------------------------------------------------------
// verify
// ---------------------------------------------------------------------------
// Returns { verdict: "match" | "drift" | "unwitnessed", diffs: [...] } where
// each diff is { field, expected, actual }. Never writes anything.
// `lines` may carry a pre-read ledger to avoid re-parsing (batch callers).
export function verifyFile({ filePath, ledgerFile, sessionId, lines }) {
  const target = canonicalPath(filePath);
  const ledgerLines = lines ?? readLedger(ledgerFile);
  const expected = deriveExpected({ lines: ledgerLines, sessionId, filePath: target });
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
    return {
      verdict: "drift",
      diffs: [{ field: "(document)", expected: "parseable MIF markdown", actual: e.message }],
    };
  }
  const jsonld = toJsonld(doc);
  const actualProv =
    jsonld.provenance && typeof jsonld.provenance === "object" ? jsonld.provenance : {};

  const diffs = [];
  for (const field of OWNED_FIELDS) {
    const want = expected.fields[field] ?? null;
    const got = actualProv[field] ?? null;
    // Structural comparison: key order is YAML formatting, not a fact.
    if (!deepEqual(want, got)) {
      diffs.push({ field, expected: want, actual: got });
    }
  }
  return { verdict: diffs.length === 0 ? "match" : "drift", diffs };
}
