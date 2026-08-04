#!/usr/bin/env node
// check-doc-links.mjs -- the internal-link-resolution gate issue #10 proposed
// and was closed as completed for, but that was never actually added (#173).
// Fails CI when a docs-tree internal link does not resolve to a real
// Starlight page route -- catching both the `.md`-suffixed-link and the
// wrong-relative-depth defect classes, at every location, not just the ten
// #173 originally enumerated.
//
//   node scripts/check-doc-links.mjs [options]
//
// Options (all optional; defaults preserve this repo's own gate exactly):
//   --docs-root <dir>      Docs tree root to scan (default: docs)
//   --base <path>          Starlight site base the routes are served under
//                          (default: /mif-docs-plugin; pass "/" for a root site)
//   --astro-config <file>  Read the site base from this astro.config.mjs's
//                          `base:` instead of --base
//   --json                 Emit machine-readable JSON to stdout instead of the
//                          human report (same exit-code semantics)
//   --write                Apply the one mechanical fix class in place (drop a
//                          .md/.mdx suffix / add the trailing slash, only when
//                          the rewritten target provably resolves), then
//                          re-check and report what remains
//   --allow-non-kebab      Audit mode: report non-kebab-case doc paths as
//                          findings and keep checking with identity routing,
//                          instead of the default fail-closed abort
import { readFileSync, writeFileSync } from "node:fs";
import {
  listDocFiles,
  checkAll,
  buildRouteSet,
  suggestFixedTarget,
  readSiteBaseFromAstroConfig,
  splitFrontmatter,
  maskCode,
} from "./lib/doc-links.mjs";

function parseArgs(argv) {
  const flags = { json: false, write: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const needsValue = () => {
      if (i + 1 >= argv.length || argv[i + 1].startsWith("--")) {
        console.error(`check-doc-links: ${a} requires a value`);
        process.exit(2);
      }
      return argv[++i];
    };
    if (a === "--docs-root") flags.docsRoot = needsValue();
    else if (a === "--base") flags.siteBase = needsValue();
    else if (a === "--astro-config") flags.astroConfig = needsValue();
    else if (a === "--json") flags.json = true;
    else if (a === "--write") flags.write = true;
    else if (a === "--allow-non-kebab") flags.allowNonKebab = true;
    else {
      console.error(`check-doc-links: unknown argument "${a}"`);
      process.exit(2);
    }
  }
  return flags;
}

const flags = parseArgs(process.argv.slice(2));
if (flags.astroConfig && flags.siteBase === undefined) {
  flags.siteBase = readSiteBaseFromAstroConfig(flags.astroConfig);
}
const opts = { docsRoot: flags.docsRoot, siteBase: flags.siteBase, allowNonKebab: flags.allowNonKebab };
for (const k of Object.keys(opts)) if (opts[k] === undefined) delete opts[k];

// Delegates the whole listDocFiles -> checkKebabCase -> buildRouteSet ->
// checkFile sequence to lib/doc-links.mjs's own checkAll() -- the exact
// sequence tests/check-doc-links.test.mjs exercises -- so this CLI and the
// test suite can never independently drift on the actual checking logic;
// this file is reporting/exit-code/fix-application plumbing only.
function runCheck() {
  const files = listDocFiles(opts);
  const findings = checkAll(files, undefined, opts);
  return { files, findings };
}

let files;
let findings;
try {
  ({ files, findings } = runCheck());
} catch (e) {
  if (e.kebabProblems) {
    console.error("check-doc-links: non-kebab-case doc path segment(s) found -- the route model");
    console.error("(file path under the docs root -> Starlight route) cannot be trusted while these exist:");
    for (const p of e.kebabProblems) console.error(`  - ${p}`);
  } else {
    console.error(`check-doc-links: ${e.message}`);
  }
  process.exit(1);
}

// --write: apply the single mechanical fix class in place, then re-check.
//
// Replacement is POSITIONAL against a code-masked copy of each line, never a
// whole-line string substitution. Review verified three corruptions the
// naive split/join produced: `[a](index.md) [b](sub/index.md)` rewrote [b]
// to `sub/../` (a link that resolves back to its own page, which the
// re-check then calls OK); `/foo` + `/foo/bar` manufactured `/foo//bar`;
// and a `cat ./setup.md` code span got rewritten. Occurrence spans are
// therefore located in the masked line (code spans/fences are blanked, so a
// target inside one is never found), longest-target-first (so a shorter
// target can never match inside a longer one's span), and substituted back
// into the REAL line by exact range -- leaving every unfixable span
// byte-for-byte intact.
let written = null;
if (flags.write && findings.length > 0) {
  const routeSet = buildRouteSet(files, opts);
  const fileSet = new Set(files);
  written = { fixedFindings: 0, fixedFiles: 0, unfixable: 0 };
  const byFile = new Map();
  for (const f of findings) {
    if (!byFile.has(f.file)) byFile.set(f.file, []);
    byFile.get(f.file).push(f);
  }
  for (const [file, fileFindings] of byFile) {
    const content = readFileSync(file, "utf8");
    const lines = content.split("\n");
    // Mask exactly the way link extraction does, so "where a link can be"
    // is one definition: body code is blanked, frontmatter passes through.
    const { frontmatter, body } = splitFrontmatter(content);
    const maskedLines = (frontmatter + maskCode(body)).split("\n");
    let touched = false;
    const byLine = new Map();
    for (const f of fileFindings) {
      if (!f.target) {
        written.unfixable++; // non-kebab-path findings have no link to rewrite
        continue;
      }
      if (!byLine.has(f.line)) byLine.set(f.line, new Set());
      byLine.get(f.line).add(f.target); // dedup identical targets on a line
    }
    for (const [lineNo, targets] of byLine) {
      const idx = lineNo - 1;
      if (idx < 0 || idx >= lines.length) {
        written.unfixable += targets.size; // stale line info -- never write a guess
        continue;
      }
      const masked = maskedLines[idx] ?? lines[idx];
      const spans = [];
      for (const target of [...targets].sort((a, b) => b.length - a.length)) {
        const fixed = suggestFixedTarget(file, target, fileSet, routeSet, opts);
        let at = 0;
        let found = false;
        while ((at = masked.indexOf(target, at)) !== -1) {
          if (!spans.some((s) => at < s.end && at + target.length > s.start)) {
            spans.push({ start: at, end: at + target.length, fixed });
            found = true;
          }
          at += target.length;
        }
        if (!found || fixed === null) written.unfixable++;
        else written.fixedFindings++;
      }
      const applicable = spans.filter((s) => s.fixed !== null).sort((a, b) => a.start - b.start);
      if (applicable.length === 0) continue;
      let out = "";
      let pos = 0;
      for (const s of applicable) {
        out += lines[idx].slice(pos, s.start) + s.fixed;
        pos = s.end;
      }
      out += lines[idx].slice(pos);
      if (out !== lines[idx]) {
        lines[idx] = out;
        touched = true;
      }
    }
    if (touched) {
      writeFileSync(file, lines.join("\n"));
      written.fixedFiles++;
    }
  }
  ({ files, findings } = runCheck()); // the oracle re-run: what remains is real
}

if (flags.json) {
  // process.exitCode, never process.exit(): exit() does not wait for a piped
  // stdout to drain, which truncates large JSON payloads at the 64KB pipe
  // buffer (observed against a 316-finding corpus).
  console.log(
    JSON.stringify(
      {
        scanned: files.length,
        docsRoot: flags.docsRoot ?? "docs",
        siteBase: flags.siteBase ?? null,
        written,
        findings,
      },
      null,
      2,
    ),
  );
  process.exitCode = findings.length === 0 ? 0 : 1;
} else {
  reportHuman();
}

function reportHuman() {
  if (written) {
    console.log(
      `--write applied ${written.fixedFindings} mechanical fix(es) across ${written.fixedFiles} file(s); ` +
        `${written.unfixable} finding(s) had no safe mechanical fix.`,
    );
  }

  if (findings.length === 0) {
    console.log(`OK -- ${files.length} doc file(s) scanned, every internal link resolves to a real canonical route.`);
    return;
  }

  const notFound = findings.filter((f) => f.status === "not-found");
  const nonCanonical = findings.filter((f) => f.status === "non-canonical");
  const nonKebab = findings.filter((f) => f.status === "non-kebab-path");

  if (nonKebab.length > 0) {
    console.error(`${nonKebab.length} doc path(s) are not lowercase-kebab-case (route computed as-is; verify deliberately):`);
    for (const f of nonKebab) {
      console.error(`  - ${f.detail} -> ${f.resolvedPath}`);
    }
  }

  if (notFound.length > 0) {
    console.error(`${notFound.length} link(s) do not resolve to any real page route (404):`);
    for (const f of notFound) {
      console.error(`  - ${f.file}:${f.line} "${f.target}" -> ${f.resolvedPath}`);
    }
  }
  if (nonCanonical.length > 0) {
    console.error(`${nonCanonical.length} link(s) resolve to a real route but not in canonical trailing-slash form`);
    console.error("(may 301-redirect rather than 404 when the site sets no explicit trailingSlash --");
    console.error("but should still be written in canonical form):");
    for (const f of nonCanonical) {
      console.error(`  - ${f.file}:${f.line} "${f.target}" -> ${f.resolvedPath} (want ${f.resolvedPath}/)`);
    }
  }
  console.error(`\nFAILED -- ${findings.length} broken internal link(s) across ${new Set(findings.map((f) => f.file)).size} file(s).`);
  process.exitCode = 1;
}
