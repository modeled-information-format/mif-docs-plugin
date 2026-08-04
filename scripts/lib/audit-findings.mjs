// audit-findings.mjs — the ONE pinned definition of an audit-docs finding
// payload (`mif-docs/audit-findings@1`), shared by scripts/audit-deterministic.mjs
// (which emits it) and the audit-docs skill (which validates every Agent
// batch's returned JSON against it before trusting a single finding).
//
// This schema exists because of a real failure: the 2026-07-30 gdlc audit's
// batch-1 agents returned a mix of YAML/JSON/numbered prose with several
// INVENTED check_id values, forcing the whole batch to be hand-summarized.
// The check_id enum below is closed; a payload naming any id outside it is
// invalid, full stop.

export const SCHEMA_ID = "mif-docs/audit-findings@1";

// The full 17-check registry. Tier is where the check is DECIDED:
//   deterministic — a script in this plugin is the oracle; an Agent must
//                   never be asked to (re-)decide these.
//   cross-doc     — one Agent call per check per audited set, never per file.
//   judgment      — batched per-file Agent calls.
// relationship-graph is split: its structural half (dangling targets) is
// deterministic; its semantic half (contradictory/missing edges) is cross-doc.
export const CHECKS = [
  { id: "frontmatter-schema", tier: "deterministic" },
  { id: "mif-level-gap", tier: "deterministic" },
  { id: "provenance-drift", tier: "deterministic" },
  { id: "link-integrity", tier: "deterministic" },
  { id: "ontology-reference", tier: "deterministic" },
  { id: "temporal-metadata", tier: "deterministic" },
  { id: "structural-formatting", tier: "deterministic" },
  { id: "duplication-drift", tier: "cross-doc" },
  { id: "relationship-graph", tier: "cross-doc" }, // structural half runs deterministically too
  { id: "coverage-gaps", tier: "cross-doc" },
  { id: "taxonomy-alignment", tier: "judgment" },
  { id: "editorial-voice", tier: "judgment" },
  { id: "genre-conformance", tier: "judgment" },
  { id: "temporal-staleness", tier: "judgment" },
  { id: "accuracy-corpus", tier: "judgment" },
  { id: "citation-validity", tier: "judgment" },
  { id: "accuracy-code", tier: "judgment" },
];

export const CHECK_IDS = CHECKS.map((c) => c.id);
export const CHECK_IDS_BY_TIER = Object.fromEntries(
  ["deterministic", "cross-doc", "judgment"].map((t) => [t, CHECKS.filter((c) => c.tier === t).map((c) => c.id)]),
);

const SEVERITIES = ["low", "medium", "high"];
const CONFIDENCES = ["low", "medium", "high"];

function isPlainObject(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function isStringArray(v) {
  return Array.isArray(v) && v.length > 0 && v.every((x) => typeof x === "string" && x.length > 0);
}

// Validate one finding object. Returns an array of error strings ([] = valid).
export function validateFinding(f, i = 0) {
  const errors = [];
  const at = `findings[${i}]`;
  if (!isPlainObject(f)) return [`${at}: not an object`];
  if (!CHECK_IDS.includes(f.check_id)) {
    errors.push(`${at}: check_id "${f.check_id}" is not in the closed registry (${CHECK_IDS.join(", ")})`);
  }
  if (!isStringArray(f.files)) errors.push(`${at}: files must be a non-empty array of paths`);
  if (!SEVERITIES.includes(f.severity)) errors.push(`${at}: severity must be one of ${SEVERITIES.join("/")}`);
  if (f.confidence !== undefined && !CONFIDENCES.includes(f.confidence)) {
    errors.push(`${at}: confidence must be one of ${CONFIDENCES.join("/")}`);
  }
  if (typeof f.summary !== "string" || !f.summary.trim()) errors.push(`${at}: summary must be a non-empty string`);
  if (typeof f.recommendation !== "string" || !f.recommendation.trim()) {
    errors.push(`${at}: recommendation must be a non-empty string`);
  }
  if (f.anchor !== undefined) {
    if (!isPlainObject(f.anchor)) errors.push(`${at}: anchor must be an object {line, excerpt}`);
    else if (f.anchor.line !== undefined && !Number.isInteger(f.anchor.line)) {
      errors.push(`${at}: anchor.line must be an integer`);
    }
  }
  for (const boolField of ["fixable", "immutable_doc", "supersession_candidate", "advisory"]) {
    if (f[boolField] !== undefined && typeof f[boolField] !== "boolean") {
      errors.push(`${at}: ${boolField} must be a boolean when present`);
    }
  }
  if (f.evidence !== undefined && typeof f.evidence !== "string") {
    errors.push(`${at}: evidence must be a string when present`);
  }
  return errors;
}

// Validate a whole payload (one Agent batch's return value, or the
// deterministic runner's output). Options:
//   expectedFiles — when given (the batch's assigned file list), enforce the
//     per-file accounting that makes batching auditable: files_audited must
//     equal the assignment, and every audited file must appear either in some
//     finding's `files` or in `files_clean` — a file the agent never mentions
//     is a file the agent cannot prove it read.
//   allowedCheckIds — restrict check_id further (e.g. judgment-tier only for
//     a per-file batch agent), on top of the closed registry.
// Returns { ok, errors }.
export function validateFindings(payload, { expectedFiles, allowedCheckIds } = {}) {
  const errors = [];
  if (!isPlainObject(payload)) return { ok: false, errors: ["payload is not an object"] };
  if (payload.schema !== SCHEMA_ID) {
    errors.push(`schema must be "${SCHEMA_ID}" (got ${JSON.stringify(payload.schema)})`);
  }
  if (!Array.isArray(payload.findings)) {
    errors.push("findings must be an array");
  } else {
    payload.findings.forEach((f, i) => errors.push(...validateFinding(f, i)));
    if (allowedCheckIds) {
      payload.findings.forEach((f, i) => {
        if (CHECK_IDS.includes(f?.check_id) && !allowedCheckIds.includes(f.check_id)) {
          errors.push(`findings[${i}]: check_id "${f.check_id}" is outside this call's allowed scope`);
        }
      });
    }
  }
  if (payload.files_clean !== undefined && !Array.isArray(payload.files_clean)) {
    errors.push("files_clean must be an array when present");
  }
  if (!isStringArray(payload.files_audited)) {
    errors.push("files_audited must be a non-empty array of paths");
  } else {
    // Assignment matching runs only against an explicit expectedFiles list,
    // but the every-file-accounted-for invariant always holds — defaulting
    // it to files_audited itself, so a payload can never claim a file was
    // audited while leaving it out of both files_clean and every finding
    // (review finding: the accounting previously ran only when a caller
    // passed expectedFiles, which nothing did).
    const audited = new Set(payload.files_audited);
    const expected = new Set(expectedFiles ?? payload.files_audited);
    if (expectedFiles) {
      for (const f of expected) if (!audited.has(f)) errors.push(`files_audited is missing assigned file ${f}`);
      for (const f of audited) if (!expected.has(f)) errors.push(`files_audited contains unassigned file ${f}`);
    }
    const accounted = new Set(payload.files_clean ?? []);
    if (Array.isArray(payload.findings)) {
      for (const f of payload.findings) {
        if (isStringArray(f?.files)) for (const file of f.files) accounted.add(file);
      }
    }
    for (const f of expected) {
      if (!accounted.has(f)) {
        errors.push(`file ${f} is neither in files_clean nor named by any finding -- unaccounted for`);
      }
    }
  }
  return { ok: errors.length === 0, errors };
}
