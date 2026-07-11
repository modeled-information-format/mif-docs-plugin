// mif-genre-signal.mjs — the ONE definition of "is this markdown a MIF genre
// document" plus the raw frontmatter split both detectors need, shared by
// hooks/mif-guard.mjs, hooks/provenance-post-tool-use.mjs, and the corpus
// report. Before this module the guard and the provenance hook each carried a
// verbatim copy of the same predicate, held equal only by a comment — the
// exact single-definition discipline mif-identity-signal-keys.mjs (issue #50)
// established for the key list, extended to the whole predicate.
//
// Deliberately dependency-light (this file + mif-identity-signal-keys.mjs
// only): both hooks run on EVERY Write/Edit tool call and must not drag in
// js-yaml/ajv to answer a regex question.

import { MIF_IDENTITY_SIGNAL_KEYS } from "./mif-identity-signal-keys.mjs";

// Raw frontmatter split, CRLF-tolerant exactly like projection.mjs's
// parseMarkdown (whose stricter LF-only copies in early drafts declared CRLF
// documents conformant-yet-unstampable). Returns { fmText, rest } or null.
export function splitFrontmatter(text) {
  const m = String(text).match(/^---\r?\n([\s\S]*?)\r?\n---(\r?\n?[\s\S]*)$/);
  return m ? { fmText: m[1], rest: m[2] } : null;
}

// Genre-specific keys treated as MIF signals in their own right, beyond the
// canonical identity keys projection.mjs owns (a legacy Diátaxis marker and
// the ontology binding keys).
const GENRE_KEYS = ["diataxis_type", "x-ontology", "ontology"];

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const BARE_KEY_RE = new RegExp(
  `(^|\\n)(${[...GENRE_KEYS, ...MIF_IDENTITY_SIGNAL_KEYS].map(escapeRegExp).join("|")})[ \\t]*:`,
);
const TYPE_VALUE_RE =
  /(^|\n)type[ \t]*:[ \t]*(semantic|episodic|procedural|tutorial|how-to|reference|explanation|runbook|playbook|changelog|decision-record)\b/;
const ADR_CARVEOUT_RE = /(^|\n)type[ \t]*:[ \t]*adr\b/;

// The structured-MADR `type: adr` genre is owned by the structured-madr
// validator, not the MIF pipeline — both the guard and the provenance hook
// leave it alone.
export function isAdrCarveout(fmText) {
  return ADR_CARVEOUT_RE.test(fmText);
}

// The genre signal must be a TOP-LEVEL frontmatter key (column 0): a nested
// `metadata:\n  type: reference` must not trigger (mif-guard regression).
export function hasGenreSignal(fmText) {
  return BARE_KEY_RE.test(fmText) || TYPE_VALUE_RE.test(fmText);
}

// Full-document convenience used by the provenance hook and corpus tooling:
// markdown with frontmatter that carries a genre signal and is not the adr
// carve-out.
export function isMifGenreText(text) {
  const split = splitFrontmatter(text);
  if (!split) return false;
  return !isAdrCarveout(split.fmText) && hasGenreSignal(split.fmText);
}
