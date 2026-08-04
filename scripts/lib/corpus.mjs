// corpus.mjs -- the one definition of which documents this suite gates with
// mif-validate, shared by ci.yml, release.yml, and engine-parity.mjs (via
// list-gated-docs.mjs for the two bash-driven workflows). Before this module
// existed, each of the three kept its own hand-written glob list and they
// silently disagreed: ci.yml's own L3 glob missed docs/reference/skills/
// until mif-docs-plugin#32 fixed it there alone, leaving engine-parity.mjs's
// copy to drift again on the next nested subdirectory. One list, three
// consumers, no hand-sync (mif-docs-plugin#34).
import { statSync, globSync, readFileSync } from "node:fs";
import { dirname, sep } from "node:path";
import { splitFrontmatter, isAdrCarveout } from "./mif-genre-signal.mjs";

function isDirectory(path) {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

// Content-based ADR carve-out (issue #203): a `type: adr` document in the
// gated trees is owned by the structured-madr Action (the adr-smadr CI job),
// not by mif-validate, which keys on conceptType — the same predicate the
// guard and the audit runner already share via mif-genre-signal.mjs.
// Unreadable files stay IN the corpus so mif-validate reports them instead of
// this filter silently swallowing them. A `type: adr` document the adr-smadr
// job cannot see fails closed in partitionL3Docs() (issue #209).
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

// The directory the adr-smadr CI job actually walks. Its `pattern: '*.md'`
// input is NON-recursive — the structured-madr Action resolves
// glob(join(path, pattern)) verbatim (src/validate.js in that repo) — so
// only direct children of this directory are ever seen by that gate. The
// fail-closed check in partitionL3Docs() enforces exactly that boundary.
export const ADR_GATE_DIR = "docs/adr";

// One walk of the L3 trees, split by gate ownership: `type: adr` documents
// belong to the adr-smadr job, everything else to mif-validate.
//
// Fail-closed the same way ci.yml's own guard did before this consolidation:
// a missing tree or an empty result is a setup problem, never a gate that
// silently validated nothing. isDirectory() (not existsSync) so a tree
// replaced by a same-named regular file is caught explicitly rather than
// silently resolving to zero files for that directory.
//
// Also fail-closed on gate coverage (issue #209): the carve-out predicate is
// content-based across every L3 tree, but the adr-smadr job only sees direct
// children of ADR_GATE_DIR. A `type: adr` document anywhere else — another
// L3 tree, or nested below docs/adr/ — would be carved out of the
// mif-validate corpus AND invisible to the adr-smadr job, i.e. validated by
// nothing with CI green. That arrangement throws here instead.
function partitionL3Docs() {
  for (const d of L3_DIRS) {
    if (!isDirectory(d)) throw new Error(`L3 doc directory missing: ${d}`);
  }
  const files = L3_DIRS.flatMap((d) => globSync(`${d}/**/*.md`)).sort();
  if (files.length === 0) {
    throw new Error(`no L3 doc files found under ${L3_DIRS.join(", ")} -- check paths`);
  }
  // Both fail-closed checks run on the PRE-filter list: an L3 tree holding
  // only ADRs (docs/adr) is present-and-owned-elsewhere, not silently empty.
  const adrDocs = files.filter((f) => isAdrDoc(f));
  // Separator-safe: globSync returns platform-native separators, and
  // ADR_GATE_DIR is a forward-slash literal (same normalization as
  // validate-plugin.mjs's labelFor).
  const ungated = adrDocs.filter((f) => dirname(f).split(sep).join("/") !== ADR_GATE_DIR);
  if (ungated.length > 0) {
    throw new Error(
      `type: adr document(s) outside the adr-smadr gate's coverage (${ADR_GATE_DIR}/*.md, non-recursive): ` +
        `${ungated.join(", ")} -- carved out of the mif-validate corpus but never seen by the adr-smadr ` +
        `job, so nothing would validate them. Move them to ${ADR_GATE_DIR}/ or drop the type: adr genre signal.`,
    );
  }
  const adrSet = new Set(adrDocs);
  return { mifDocs: files.filter((f) => !adrSet.has(f)), adrDocs };
}

export function listL3Docs() {
  return partitionL3Docs().mifDocs;
}

// The `type: adr` documents under the L3 trees — the complement of
// listL3Docs(), gated by the adr-smadr CI job (structured-madr Action in
// smadr strict + mif conformance modes), never by mif-validate.
export function listAdrDocs() {
  return partitionL3Docs().adrDocs;
}

export function listL2Docs() {
  return L2_GLOBS.flatMap((g) => globSync(g)).sort();
}

// The mif-validate corpus at any level -- what engine-parity.mjs asserts
// node/mif-rs agreement over. NOT every doc CI gates: the `type: adr`
// documents (listAdrDocs) and the adr template (ADR_TEMPLATE_CARVEOUT) are
// gated by the adr-smadr job instead; cross-cutting consumers that mean
// "every gated doc" want listAllGatedDocs().
export function listGatedDocs() {
  return [...listTemplates(), ...listL3Docs(), ...listL2Docs()].sort();
}

// Every document ANY CI job gates, regardless of which gate owns it: the
// mif-validate corpus plus the adr-smadr-owned docs (the `type: adr`
// documents and the adr template). Cross-cutting reports like
// provenance-corpus-check.mjs use this so the ADR carve-out (#203) cannot
// silently shrink their coverage -- an ADR's provenance matters just as much
// as any other gated doc's.
export function listAllGatedDocs() {
  return [...listGatedDocs(), ...listAdrDocs(), ADR_TEMPLATE_CARVEOUT].sort();
}
