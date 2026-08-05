// doc-links.mjs -- resolve every internal link found in a docs tree's *.md(x)
// files against the real Starlight route each doc file maps to, so
// scripts/check-doc-links.mjs can prove issue #173's AC1 ("the gate shall fail
// if the target does not resolve to a real page route") instead of the missing
// gate issue #10 was closed as having added.
//
// Route model: a Starlight site sets base: "<siteBase>" and (by default) no
// trailingSlash, so Starlight's default (every generated page route carries a
// trailing slash, index files map to their parent directory) is what a real
// deployed link must match. A file's route is computed purely from its path
// under the docs root -- the same identity mapping Astro's file-based routing
// uses -- which only holds if every path segment is lowercase-kebab-case; see
// checkKebabCase().
//
// Every exported function takes an optional trailing `opts` object
// ({docsRoot, siteBase, globs}) so the same route model can be checked against
// any Starlight docs tree (e.g. another repo's docs/ with a different site
// base), not only this plugin's own. Omitting opts preserves this repo's
// historical defaults exactly.
import { globSync } from "node:fs";
import { readFileSync } from "node:fs";
import { posix } from "node:path";

export const DOCS_GLOBS = ["docs/**/*.md", "docs/**/*.mdx"];
export const SITE_BASE = "/mif-docs-plugin";

// Normalize {docsRoot, siteBase, globs, readmeAsIndex} with this repo's
// values as defaults. siteBase keeps no trailing slash internally ("" means
// the site root), and docsRoot keeps no trailing slash so prefix-stripping
// is exact. readmeAsIndex defaults to false: most Starlight sites use only
// `index.md`/`index.mdx` as the directory-index convention, so treating
// README.md as one too is opt-in, not assumed (issue #213 -- a caller whose
// content-collection config re-slugs a SUBDIRECTORY README.md to its
// directory's route, e.g. via a custom `generateId`, passes
// readmeAsIndex: true to make this gate's route model match that reality).
// Subdirectory only: a docs-ROOT README.md is never the site index -- that
// route belongs to index.md/index.mdx -- so it keeps its own ordinary route
// (see routeForDocFile/checkKebabCase).
export function normalizeOptions(opts = {}) {
  const docsRoot = (opts.docsRoot ?? "docs").replace(/\/+$/, "");
  let siteBase = opts.siteBase ?? SITE_BASE;
  if (!siteBase.startsWith("/")) siteBase = `/${siteBase}`;
  siteBase = siteBase.replace(/\/+$/, "");
  const globs = opts.globs ?? [`${docsRoot}/**/*.md`, `${docsRoot}/**/*.mdx`];
  const readmeAsIndex = opts.readmeAsIndex ?? false;
  return { docsRoot, siteBase, globs, readmeAsIndex };
}

// Pull `base: "<path>"` out of an astro.config.mjs without executing it --
// a regex over the source is deliberate (the config may import packages this
// process shouldn't load). Fail loud when absent: a Starlight site with no
// explicit base serves from "/", and the caller should say so explicitly via
// siteBase: "/" rather than have it silently guessed.
export function readSiteBaseFromAstroConfig(configPath) {
  const src = readFileSync(configPath, "utf8");
  // Strip comments before matching, or a commented-out `// base: "/old"`
  // above the real one wins and silently poisons the whole route model.
  // Block comments go wholesale; line comments are cut only when the `//`
  // sits outside a string literal, so `site: "https://..."` survives.
  const noBlocks = src.replace(/\/\*[\s\S]*?\*\//g, " ");
  const code = noBlocks
    .split("\n")
    .map((line) => {
      let quote = null;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (quote) {
          if (ch === "\\") i++;
          else if (ch === quote) quote = null;
        } else if (ch === '"' || ch === "'" || ch === "`") {
          quote = ch;
        } else if (ch === "/" && line[i + 1] === "/") {
          return line.slice(0, i);
        }
      }
      return line;
    })
    .join("\n");
  const m = code.match(/\bbase:\s*["']([^"']+)["']/);
  if (!m) {
    throw new Error(`no base: "<path>" found in ${configPath} -- pass the site base explicitly`);
  }
  return m[1];
}

// Fail-closed the same way scripts/lib/corpus.mjs's listL3Docs()/listTemplates()
// do: an empty result is a setup problem (a renamed docs tree, a typo'd glob),
// never a gate that silently checked zero files.
export function listDocFiles(opts = {}) {
  const { globs } = normalizeOptions(opts);
  const files = globs.flatMap((g) => globSync(g)).sort();
  if (files.length === 0) {
    throw new Error(`no doc files found under ${globs.join(", ")} -- check paths`);
  }
  return files;
}

const KEBAB_SEGMENT = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function relUnderRoot(file, docsRoot) {
  const prefix = `${docsRoot}/`;
  return file.startsWith(prefix) ? file.slice(prefix.length) : file;
}

// The route each doc file maps to depends on every path segment being
// lowercase-kebab-case -- Astro's file-based routing lower-cases nothing, so
// a stray uppercase letter or underscore would silently mismap this gate's
// own route model against the real deployed route. Fail loud rather than
// silently resolve to a route that doesn't match reality.
export function checkKebabCase(files, opts = {}) {
  const { docsRoot, readmeAsIndex } = normalizeOptions(opts);
  const problems = [];
  for (const f of files) {
    const rel = relUnderRoot(f, docsRoot);
    const segments = rel.split("/");
    const base = segments[segments.length - 1].replace(/\.mdx?$/, "");
    const toCheck = [...segments.slice(0, -1), base];
    const lastIndex = toCheck.length - 1;
    // README-as-index is a SUBDIRECTORY convention (mirrors the real-world
    // config that motivated it, research-harness-template's generateId:
    // `segs.length > 1 && /^README$/i.test(...)`) -- a docs-ROOT README.md
    // gets its own ordinary route (e.g. /readme/), never the site root,
    // because the root route already belongs to index.md/mdx. Applying the
    // exemption there too silently collided the two into one route (issue
    // #213 review follow-up, round 2). This flag means exactly "this file
    // IS the nested-README-as-index case" -- not merely "this file is
    // nested" -- so the loop below only needs to check segment position,
    // never re-derive the README-ness itself (Copilot review, round 2).
    const isReadmeIndexFile = readmeAsIndex && toCheck.length > 1 && base.toLowerCase() === "readme";
    toCheck.forEach((seg, i) => {
      if (seg === "index") return; // literal Starlight index convention
      // The README-as-index exemption applies only to the file's own
      // basename (the last segment) -- a directory literally named
      // "README" is not the convention readmeAsIndex models and must still
      // fail loud, or a route like /adr/README/foo/ reaches the model
      // unflagged (issue #213 review follow-up, round 1).
      if (isReadmeIndexFile && i === lastIndex) return;
      if (!KEBAB_SEGMENT.test(seg)) {
        problems.push(`${f}: path segment "${seg}" is not lowercase-kebab-case`);
      }
    });
  }
  return problems;
}

// docs/architecture/mif-provenance.md -> /mif-docs-plugin/architecture/mif-provenance/
// docs/index.mdx                      -> /mif-docs-plugin/
// docs/adr/README.md                  -> /mif-docs-plugin/adr/  (only with readmeAsIndex: true)
// docs/README.md                      -> /mif-docs-plugin/README/  (a docs-ROOT README is
//                                        never the index, with or without readmeAsIndex)
export function routeForDocFile(file, opts = {}) {
  const { docsRoot, siteBase, readmeAsIndex } = normalizeOptions(opts);
  const rel = relUnderRoot(file, docsRoot).replace(/\.mdx?$/, "");
  // README-as-index is a SUBDIRECTORY convention only -- a docs-root
  // README.md gets its own ordinary route (e.g. /readme/), never the site
  // root, which already belongs to index.md/mdx. `/README$/i` (requires a
  // preceding "/") deliberately excludes the bare root-level "README" case
  // that `(^|\/)README$` would otherwise also match (issue #213 review
  // follow-up, round 2 -- mirrors research-harness-template's own
  // generateId: `segs.length > 1 && /^README$/i.test(...)`).
  const isNestedReadme = readmeAsIndex && /\/README$/i.test(rel);
  const isIndex = rel === "index" || rel.endsWith("/index") || isNestedReadme;
  const indexRe = isNestedReadme ? /\/README$/i : /(^|\/)index$/;
  const slug = isIndex ? rel.replace(indexRe, "") : rel;
  return slug ? `${siteBase}/${slug}/` : `${siteBase}/`;
}

export function buildRouteSet(files, opts = {}) {
  return new Set(files.map((f) => routeForDocFile(f, opts)));
}

// readmeAsIndex (issue #213 review follow-up): a directory holding BOTH
// index.md and README.md maps two real files onto one route -- buildRouteSet
// silently absorbs this into a single Set entry, which is exactly the
// "route model cannot be trusted" condition checkKebabCase already exists to
// catch (a --write repair using the collided routeSet could point a link at
// the wrong one of the two files, or a real link to either could resolve
// as "ok" while actually landing on its sibling's content on the deployed
// site). Only meaningful when readmeAsIndex is set; with it off, index and
// README never collide because README maps to its own literal route.
export function checkRouteCollisions(files, opts = {}) {
  const { readmeAsIndex } = normalizeOptions(opts);
  if (!readmeAsIndex) return [];
  const byRoute = new Map();
  for (const f of files) {
    const route = routeForDocFile(f, opts);
    if (!byRoute.has(route)) byRoute.set(route, []);
    byRoute.get(route).push(f);
  }
  const problems = [];
  for (const [route, group] of byRoute) {
    if (group.length > 1) {
      problems.push(`${group.sort().join(" and ")} both resolve to route ${route} -- README-as-index collides with an index file in the same directory`);
    }
  }
  return problems;
}

// Mask fenced code blocks (``` or ~~~) with equal-length whitespace -- never
// delete -- so every later line-number computation still points at the real
// source line. A naive strip-and-reindex approach is what produced a wrong
// line number for docs/reference/skills/mif-provenance.md during this gate's
// own development; masking in place avoids the whole class of bug.
export function maskFencedBlocks(content) {
  const lines = content.split("\n");
  let inFence = false;
  let fenceChar = null;
  let fenceLen = 0;
  const out = lines.map((line) => {
    const trimmed = line.trimStart();
    if (!inFence) {
      const m = trimmed.match(/^(`{3,}|~{3,})/);
      if (m) {
        inFence = true;
        fenceChar = m[1][0];
        fenceLen = m[1].length;
        return " ".repeat(line.length);
      }
      return line;
    }
    const closeRe = new RegExp(`^\\${fenceChar}{${fenceLen},}[ \\t]*$`);
    if (closeRe.test(trimmed)) {
      inFence = false;
    }
    return " ".repeat(line.length);
  });
  return out.join("\n");
}

// Mask inline `code spans` the same length-preserving way, so a link-shaped
// string used purely as illustrative text inside backticks (e.g. the literal
// `` `![alt](path)` `` at docs/reference/skills/mif-to-pdf.md:162) is never
// mistaken for a real link to resolve. Single-line spans only -- this repo's
// docs/ corpus does not use multi-line or double-backtick inline spans
// (verified by grep at authorship time); a genuine future multi-line span
// would simply not be masked, which is a safe failure direction (a false
// positive to investigate, never a silently-skipped real link).
export function maskInlineCode(content) {
  return content
    .split("\n")
    .map((line) => line.replace(/(`+)((?:(?!\1)[^\n])*?)\1/g, (m) => " ".repeat(m.length)))
    .join("\n");
}

export function maskCode(content) {
  return maskInlineCode(maskFencedBlocks(content));
}

// The trailing newline after the closing `---` is optional -- a file whose
// frontmatter ends at EOF (an editor that omits the final newline) still
// splits correctly, matching scripts/lib/mif-genre-signal.mjs's own
// splitFrontmatter(), which allows the same thing.
const FRONTMATTER_RE = /^---\r?\n[\s\S]*?\r?\n---[ \t]*(?:\r?\n|$)/;

export function splitFrontmatter(content) {
  const m = content.match(FRONTMATTER_RE);
  if (!m) return { frontmatter: "", body: content, bodyOffset: 0 };
  return { frontmatter: m[0], body: content.slice(m[0].length), bodyOffset: m[0].length };
}

function lineNumberAt(content, index) {
  let line = 1;
  for (let i = 0; i < index; i++) {
    if (content[i] === "\n") line++;
  }
  return line;
}

// A target is internal (checkable against the route set) unless it carries a
// URI scheme (http:, https:, mailto:, ...), is protocol-relative (//host/...),
// or is a pure same-page anchor (#heading) with nothing to resolve.
export function isInternalTarget(raw) {
  const t = raw.trim();
  if (!t) return false;
  if (/^[a-z][a-z0-9+.-]*:/i.test(t)) return false;
  if (t.startsWith("//")) return false;
  if (t.startsWith("#")) return false;
  // A query-only href (?foo=bar) targets the current page with parameters;
  // stripping the query left "" which resolveTarget coerced to "/" -- a
  // false 404 against the site root (flagged on PR #176, fixed here).
  if (t.startsWith("?")) return false;
  return true;
}

// Inline markdown links [text](target) -- excludes image syntax ![alt](target)
// via the negative lookbehind, since an image target resolves against static
// assets, not doc routes, and is out of this gate's scope.
function extractMarkdownLinks(text) {
  const found = [];
  const re = /(?<!!)\[([^\]]*)\]\(([^)]+)\)/gd;
  for (const m of text.matchAll(re)) {
    const [start] = m.indices[2];
    found.push({ target: m[2], index: start });
  }
  return found;
}

// Reference-style link definitions: [label]: target -- idiomatic in this
// repo's ADRs (docs/adr/0004, docs/adr/0005) and NOT handled by a naive
// inline-link-only extractor, which is exactly the coverage gap that made
// this a live 404 class.
function extractReferenceDefs(text) {
  const found = [];
  const re = /^[ \t]{0,3}\[([^\]]+)\]:[ \t]*<?([^\s>]+)>?/gmd;
  for (const m of text.matchAll(re)) {
    const [start] = m.indices[2];
    found.push({ target: m[2], index: start });
  }
  return found;
}

// <LinkCard href="target" ...> JSX attributes (docs/index.mdx's CardGrid).
function extractLinkCardHrefs(text) {
  const found = [];
  const re = /<LinkCard\b[^>]*\bhref="([^"]+)"/gd;
  for (const m of text.matchAll(re)) {
    const [start] = m.indices[1];
    found.push({ target: m[1], index: start });
  }
  return found;
}

// Frontmatter `link:` scalar values (docs/index.mdx's hero.actions). Scanned
// line-by-line against the RAW frontmatter text (never YAML-parsed, so there
// is no line-number reconstruction to get wrong) with an explicit
// block-scalar skip so the large inline SVG under hero.image.html: | is never
// mistaken for link text -- its own attribute-like strings (fill="...",
// stroke="...") are not hrefs and must never be scanned.
function extractFrontmatterLinks(frontmatter) {
  const found = [];
  if (!frontmatter) return found;
  const lines = frontmatter.split("\n");
  let skipBelowIndent = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const indentMatch = line.match(/^(\s*)/);
    const indent = indentMatch[1].length;
    if (skipBelowIndent !== null) {
      if (line.trim() === "" || indent > skipBelowIndent) continue;
      skipBelowIndent = null; // block scalar ended; fall through to process this line normally
    }
    const blockScalarStart = line.match(/^(\s*)\S+:\s*[|>][+-]?\s*$/);
    if (blockScalarStart) {
      skipBelowIndent = blockScalarStart[1].length;
      continue;
    }
    const linkMatch = line.match(/^\s*link:\s*(.+?)\s*$/);
    if (linkMatch) {
      const value = linkMatch[1].replace(/^['"]|['"]$/g, "");
      found.push({ target: value, index: i, isFrontmatterLine: true });
    }
  }
  return found;
}

export function extractLinks(file, content) {
  const { frontmatter, body, bodyOffset } = splitFrontmatter(content);
  const maskedBody = maskCode(body);
  const results = [];

  for (const { target, index } of extractMarkdownLinks(maskedBody)) {
    results.push({ target, line: lineNumberAt(content, bodyOffset + index) });
  }
  for (const { target, index } of extractReferenceDefs(maskedBody)) {
    results.push({ target, line: lineNumberAt(content, bodyOffset + index) });
  }
  for (const { target, index } of extractLinkCardHrefs(maskedBody)) {
    results.push({ target, line: lineNumberAt(content, bodyOffset + index) });
  }
  for (const { target, isFrontmatterLine, index } of extractFrontmatterLinks(frontmatter)) {
    if (isFrontmatterLine) {
      results.push({ target, line: index + 1 }); // frontmatter starts at file line 1
    }
  }
  return results.filter((r) => isInternalTarget(r.target));
}

// Resolve target against the page's own canonical route the way a browser
// resolves a relative href -- RFC 3986 resolution via the URL API, never
// hand-rolled path-joining, so ".." depth math matches real navigation
// exactly (this project's actual bug class: a `../foo/` link written for a
// route WITHOUT the implicit trailing-slash directory segment).
export function resolveTarget(currentRoute, target) {
  const invalidBase = "https://doc-links.invalid";
  const base = new URL(currentRoute, invalidBase);
  const resolved = new URL(target.split(/[?#]/)[0] || "/", base);
  return resolved.pathname;
}

// 'ok': exact canonical route match.
// 'non-canonical': resolves to a real route missing only its trailing slash --
//   a site with no explicit trailingSlash config may 301 rather than 404;
//   never assert a 404 that hasn't been proven.
// 'not-found': no real route matches even after that allowance (covers both
//   wrong relative depth and a lingering .md/.mdx suffix no route serves).
export function classify(resolvedPath, routeSet) {
  if (routeSet.has(resolvedPath)) return "ok";
  if (!resolvedPath.endsWith("/") && routeSet.has(`${resolvedPath}/`)) return "non-canonical";
  return "not-found";
}

// Propose the mechanical rewrite for a broken target, or null when no safe
// single deterministic correction exists (in which case the finding stays a
// human's to resolve -- this function must never guess). Two rewrite classes,
// both verified against the route set before being returned, both preserving
// any ?query/#anchor suffix:
//
// 1. File-relative intent (the dominant real-world class): a `.md`/`.mdx`
//    target written the way GitHub's web renderer resolves it -- relative to
//    the SOURCE FILE's directory. Under Starlight's trailing-slash routes the
//    same string resolves one directory too deep AND with a dead suffix, so
//    both must be repaired together: locate the target file the author meant,
//    then emit the correct route-relative link to its real route.
// 2. Route-relative repair: the target already resolves to the right place
//    except for a lingering `.md`/`.mdx` suffix or a missing trailing slash.
export function suggestFixedTarget(file, target, files, routeSet, opts = {}) {
  const m = target.match(/^([^?#]*)([?#].*)?$/);
  const path = m[1];
  const suffix = m[2] ?? "";
  if (!path) return null;
  const currentRoute = routeForDocFile(file, opts);

  if (/\.mdx?$/.test(path) && !path.startsWith("/")) {
    const fileSet = files instanceof Set ? files : new Set(files);
    const joined = posix.normalize(posix.join(posix.dirname(file), path));
    if (fileSet.has(joined)) {
      const targetRoute = routeForDocFile(joined, opts);
      const rel = posix.relative(currentRoute, targetRoute);
      const candidate = rel === "" ? "./" : `${rel}/`;
      if (routeSet.has(resolveTarget(currentRoute, candidate))) return candidate + suffix;
    }
  }

  let candidate = path.replace(/\.mdx?$/, "");
  if (!candidate.endsWith("/")) candidate += "/";
  if (candidate === path) return null; // nothing changed -- not this fix class
  if (routeSet.has(resolveTarget(currentRoute, candidate))) return candidate + suffix;
  return null;
}

// mdLinksRewritten (issue #213): some Starlight sites wire a build-time
// remark/rehype plugin (e.g. astro-rehype-relative-markdown-links) that
// resolves GitHub-style file-relative `.md`/`.mdx` links to their real route
// at build time -- deliberately, so the same source also renders correctly
// on GitHub. For such a site, a `.md`-suffixed link is not a defect; it is
// the intended, dual-purpose form, and the only real question is whether it
// points at a real file. Opt-in and default false: the historical model
// (every `.md`-suffixed link is a defect the gate must catch, issue #173)
// stays exactly as-is for every caller that doesn't set this.
function isRewrittenMdLink(file, target, fileSet, opts) {
  if (!opts.mdLinksRewritten) return false;
  const m = target.match(/^([^?#]*)([?#].*)?$/);
  const path = m[1];
  if (!path || path.startsWith("/") || !/\.mdx?$/.test(path)) return false;
  const joined = posix.normalize(posix.join(posix.dirname(file), path));
  return fileSet.has(joined);
}

// fileSet is optional and only consulted when opts.mdLinksRewritten is set
// (isRewrittenMdLink no-ops without it) -- a caller that passes
// mdLinksRewritten: true but omits fileSet silently gets the pre-#213
// behavior (every .md-suffixed link checked, none exempted) rather than an
// error. checkAll (the only caller in this codebase) always supplies it; a
// new direct caller of checkFile wanting the exemption must pass it too.
export function checkFile(file, content, routeSet, opts = {}, fileSet = null) {
  const currentRoute = routeForDocFile(file, opts);
  const links = extractLinks(file, content);
  const findings = [];
  for (const { target, line } of links) {
    if (fileSet && isRewrittenMdLink(file, target, fileSet, opts)) continue;
    const resolvedPath = resolveTarget(currentRoute, target);
    const status = classify(resolvedPath, routeSet);
    if (status !== "ok") {
      findings.push({ file, line, target, resolvedPath, status });
    }
  }
  return findings;
}

export function checkAll(files, readFile = (f) => readFileSync(f, "utf8"), opts = {}) {
  const resolvedFiles = files ?? listDocFiles(opts);
  const fileSet = new Set(resolvedFiles);
  const findings = [];
  const kebabProblems = checkKebabCase(resolvedFiles, opts);
  if (kebabProblems.length > 0) {
    // Default: fail closed -- the route model cannot be trusted, so refuse to
    // assert anything about link resolution (this repo's own CI gate).
    // allowNonKebab: audit mode -- report each offending path as its own
    // finding and keep checking the rest of the corpus with identity routing,
    // so one route anomaly (e.g. a docs/README.md) doesn't abort a whole
    // audit that exists to report exactly such anomalies.
    if (!opts.allowNonKebab) {
      const err = new Error("non-kebab-case doc filename(s) found -- the route model cannot be trusted");
      err.kebabProblems = kebabProblems;
      throw err;
    }
    for (const p of kebabProblems) {
      const file = p.slice(0, p.indexOf(":"));
      findings.push({
        file,
        line: 1,
        target: null,
        resolvedPath: routeForDocFile(file, opts),
        status: "non-kebab-path",
        detail: p,
      });
    }
  }
  const collisionProblems = checkRouteCollisions(resolvedFiles, opts);
  if (collisionProblems.length > 0) {
    // Same fail-closed-by-default / allowNonKebab-audit-mode split as the
    // kebab-case check above -- a route collision is the same "the model
    // cannot be trusted" condition, just a different cause.
    if (!opts.allowNonKebab) {
      const err = new Error("README-as-index route collision(s) found -- the route model cannot be trusted");
      err.collisionProblems = collisionProblems;
      throw err;
    }
    for (const p of collisionProblems) {
      const [firstFile] = p.split(" and ");
      findings.push({
        file: firstFile,
        line: 1,
        target: null,
        resolvedPath: routeForDocFile(firstFile, opts),
        status: "route-collision",
        detail: p,
      });
    }
  }
  const routeSet = buildRouteSet(resolvedFiles, opts);
  for (const file of resolvedFiles) {
    findings.push(...checkFile(file, readFile(file), routeSet, opts, fileSet));
  }
  return findings;
}
