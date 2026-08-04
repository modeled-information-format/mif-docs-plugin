// corpus.mjs -- the one definition of which documents this suite gates with
// mif-validate, shared by ci.yml, release.yml, and engine-parity.mjs (via
// list-gated-docs.mjs for the two bash-driven workflows). Before this module
// existed, each of the three kept its own hand-written glob list and they
// silently disagreed: ci.yml's own L3 glob missed docs/reference/skills/
// until mif-docs-plugin#32 fixed it there alone, leaving engine-parity.mjs's
// copy to drift again on the next nested subdirectory. One list, three
// consumers, no hand-sync (mif-docs-plugin#34).
import { statSync, globSync, readFileSync } from "node:fs";
import { splitFrontmatter, isAdrCarveout } from "./mif-genre-signal.mjs";

function isDirectory(path) {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

// Content-based ADR carve-out (issue #203): a `type: adr` document anywhere in
// the gated trees is owned by the structured-madr Action (the adr-smadr CI
// job), not by mif-validate, which keys on conceptType — the same predicate
// the guard and the audit runner already share via mif-genre-signal.mjs.
// Unreadable files stay IN the corpus so mif-validate reports them instead of
// this filter silently swallowing them.
function isAdrDoc(path) {
  let text;
  try {
    text = readFileSync(path, "utf8");
  } catch {
    return false;
  }
  const split = splitFrontmatter(text);
  return split ? isAdrCarveout(split.fmText) : false;
}

export const TEMPLATE_GLOB = "skills/*/templates/good.md";
// The adr genre is fully aligned to structured-MADR (type: adr) and is
// validated by the structured-madr Action, not by mif-validate (which keys
// on conceptType).
export const ADR_TEMPLATE_CARVEOUT = "skills/adr/templates/good.md";

// Recursive globs: a file nested under any subdirectory of an L3 tree (like
// docs/reference/skills/) is always caught, so the drift #32 hit can't recur
// just because a tree grew a new subdirectory.
export const L3_DIRS = ["docs/adr", "docs/architecture", "docs/runbooks", "docs/reference", "docs/explanation"];

export const L2_GLOBS = ["docs/tutorials/*.md", "docs/how-to/*.md", "CHANGELOG.md"];

// Fail-closed: an empty result is a setup problem (a renamed/typo'd glob),
// never a gate that silently validated zero templates.
export function listTemplates() {
  const files = globSync(TEMPLATE_GLOB)
    .filter((f) => f !== ADR_TEMPLATE_CARVEOUT)
    .sort();
  if (files.length === 0) {
    throw new Error(`no templates found under ${TEMPLATE_GLOB} -- check paths`);
  }
  return files;
}

// Fail-closed the same way ci.yml's own guard did before this consolidation:
// a missing tree or an empty result is a setup problem, never a gate that
// silently validated nothing. isDirectory() (not existsSync) so a tree
// replaced by a same-named regular file is caught explicitly rather than
// silently resolving to zero files for that directory.
export function listL3Docs() {
  for (const d of L3_DIRS) {
    if (!isDirectory(d)) throw new Error(`L3 doc directory missing: ${d}`);
  }
  const files = L3_DIRS.flatMap((d) => globSync(`${d}/**/*.md`)).sort();
  if (files.length === 0) {
    throw new Error(`no L3 doc files found under ${L3_DIRS.join(", ")} -- check paths`);
  }
  // Fail-closed check runs on the PRE-filter list: an L3 tree holding only
  // ADRs (docs/adr) is present-and-owned-elsewhere, not silently empty.
  return files.filter((f) => !isAdrDoc(f));
}

// The `type: adr` documents under the L3 trees — the complement of
// listL3Docs()'s filter, gated by the adr-smadr CI job (structured-madr
// Action in smadr strict + mif conformance modes), never by mif-validate.
export function listAdrDocs() {
  for (const d of L3_DIRS) {
    if (!isDirectory(d)) throw new Error(`L3 doc directory missing: ${d}`);
  }
  return L3_DIRS.flatMap((d) => globSync(`${d}/**/*.md`))
    .sort()
    .filter((f) => isAdrDoc(f));
}

export function listL2Docs() {
  return L2_GLOBS.flatMap((g) => globSync(g)).sort();
}

// The full corpus this suite gates with mif-validate at any level -- what
// engine-parity.mjs asserts node/mif-rs agreement over.
export function listGatedDocs() {
  return [...listTemplates(), ...listL3Docs(), ...listL2Docs()].sort();
}
