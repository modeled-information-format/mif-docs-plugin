#!/usr/bin/env node
// check-doc-links.mjs -- the internal-link-resolution gate issue #10 proposed
// and was closed as completed for, but that was never actually added (#173).
// Fails CI when a docs/**/*.md(x) internal link does not resolve to a real
// Starlight page route -- catching both the `.md`-suffixed-link and the
// wrong-relative-depth defect classes, at every location, not just the ten
// #173 originally enumerated.
//
//   node scripts/check-doc-links.mjs
import { listDocFiles, checkAll } from "./lib/doc-links.mjs";

// Delegates the whole listDocFiles -> checkKebabCase -> buildRouteSet ->
// checkFile sequence to lib/doc-links.mjs's own checkAll() -- the exact
// sequence tests/check-doc-links.test.mjs exercises -- so this CLI and the
// test suite can never independently drift on the actual checking logic;
// this file is reporting/exit-code plumbing only.
let files;
let findings;
try {
  files = listDocFiles();
  findings = checkAll(files);
} catch (e) {
  if (e.kebabProblems) {
    console.error("check-doc-links: non-kebab-case doc path segment(s) found -- the route model");
    console.error("(file path under docs/ -> Starlight route) cannot be trusted while these exist:");
    for (const p of e.kebabProblems) console.error(`  - ${p}`);
  } else {
    console.error(`check-doc-links: ${e.message}`);
  }
  process.exit(1);
}

if (findings.length === 0) {
  console.log(`OK -- ${files.length} doc file(s) scanned, every internal link resolves to a real canonical route.`);
  process.exit(0);
}

const notFound = findings.filter((f) => f.status === "not-found");
const nonCanonical = findings.filter((f) => f.status === "non-canonical");

if (notFound.length > 0) {
  console.error(`${notFound.length} link(s) do not resolve to any real page route (404):`);
  for (const f of notFound) {
    console.error(`  - ${f.file}:${f.line} "${f.target}" -> ${f.resolvedPath}`);
  }
}
if (nonCanonical.length > 0) {
  console.error(`${nonCanonical.length} link(s) resolve to a real route but not in canonical trailing-slash form`);
  console.error("(may 301-redirect rather than 404 -- site/astro.config.mjs sets no explicit trailingSlash --");
  console.error("but should still be written in canonical form):");
  for (const f of nonCanonical) {
    console.error(`  - ${f.file}:${f.line} "${f.target}" -> ${f.resolvedPath} (want ${f.resolvedPath}/)`);
  }
}
console.error(`\nFAILED -- ${findings.length} broken internal link(s) across ${new Set(findings.map((f) => f.file)).size} file(s).`);
process.exit(1);
