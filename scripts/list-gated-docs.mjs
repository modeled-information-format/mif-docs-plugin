#!/usr/bin/env node
// list-gated-docs.mjs -- print the shared corpus (scripts/lib/corpus.mjs) as
// one file path per line, so ci.yml and release.yml consume the exact same
// definition engine-parity.mjs does instead of hand-rolled bash find/glob
// logic that can independently drift (mif-docs-plugin#32/#34).
//
//   list-gated-docs --level 1|2|3
import { listTemplates, listL2Docs, listL3Docs } from "./lib/corpus.mjs";

const levelArg = process.argv.indexOf("--level");
const level = levelArg >= 0 ? process.argv[levelArg + 1] : undefined;

const listers = { "1": listTemplates, "2": listL2Docs, "3": listL3Docs };
const lister = listers[level];
if (!lister) {
  console.error(`list-gated-docs: usage: list-gated-docs --level 1|2|3 (got ${level ?? "(none)"})`);
  process.exit(2);
}

let files;
try {
  files = lister();
} catch (e) {
  console.error(`list-gated-docs: ${e.message}`);
  process.exit(1);
}
for (const f of files) console.log(f);
