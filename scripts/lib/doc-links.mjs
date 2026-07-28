// doc-links.mjs -- resolve every internal link found in docs/**/*.md(x) against
// the real Starlight route each doc file maps to, so scripts/check-doc-links.mjs
// can prove issue #173's AC1 ("the gate shall fail if the target does not
// resolve to a real page route") instead of the missing gate issue #10 was
// closed as having added.
//
// Route model: site/astro.config.mjs sets base: "/mif-docs-plugin" and no
// trailingSlash, so Starlight's default (every generated page route carries a
// trailing slash, index files map to their parent directory) is what a real
// deployed link must match. A file's route is computed purely from its path
// under docs/ -- the same identity mapping Astro's file-based routing uses --
// which only holds if every path segment is lowercase-kebab-case; see
// checkKebabCase().
import { globSync } from "node:fs";
import { readFileSync } from "node:fs";

export const DOCS_GLOBS = ["docs/**/*.md", "docs/**/*.mdx"];
export const SITE_BASE = "/mif-docs-plugin";

// Fail-closed the same way scripts/lib/corpus.mjs's listL3Docs()/listTemplates()
// do: an empty result is a setup problem (a renamed docs/ tree, a typo'd glob),
// never a gate that silently checked zero files.
export function listDocFiles() {
  const files = DOCS_GLOBS.flatMap((g) => globSync(g)).sort();
  if (files.length === 0) {
    throw new Error(`no doc files found under ${DOCS_GLOBS.join(", ")} -- check paths`);
  }
  return files;
}

const KEBAB_SEGMENT = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// The route each doc file maps to depends on every path segment being
// lowercase-kebab-case -- Astro's file-based routing lower-cases nothing, so
// a stray uppercase letter or underscore would silently mismap this gate's
// own route model against the real deployed route. Fail loud rather than
// silently resolve to a route that doesn't match reality.
export function checkKebabCase(files) {
  const problems = [];
  for (const f of files) {
    const rel = f.replace(/^docs\//, "");
    const segments = rel.split("/");
    const base = segments[segments.length - 1].replace(/\.mdx?$/, "");
    const toCheck = [...segments.slice(0, -1), base];
    for (const seg of toCheck) {
      if (seg === "index") continue; // literal Starlight index convention
      if (!KEBAB_SEGMENT.test(seg)) {
        problems.push(`${f}: path segment "${seg}" is not lowercase-kebab-case`);
      }
    }
  }
  return problems;
}

// docs/architecture/mif-provenance.md -> /mif-docs-plugin/architecture/mif-provenance/
// docs/index.mdx                      -> /mif-docs-plugin/
export function routeForDocFile(file) {
  const rel = file.replace(/^docs\//, "").replace(/\.mdx?$/, "");
  const slug = rel === "index" || rel.endsWith("/index") ? rel.replace(/(^|\/)index$/, "") : rel;
  return slug ? `${SITE_BASE}/${slug}/` : `${SITE_BASE}/`;
}

export function buildRouteSet(files) {
  return new Set(files.map(routeForDocFile));
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

const FRONTMATTER_RE = /^---\r?\n[\s\S]*?\r?\n---[ \t]*\r?\n/;

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
//   site/astro.config.mjs sets no explicit trailingSlash, so this may 301
//   rather than 404; never assert a 404 that hasn't been proven.
// 'not-found': no real route matches even after that allowance (covers both
//   wrong relative depth and a lingering .md/.mdx suffix no route serves).
export function classify(resolvedPath, routeSet) {
  if (routeSet.has(resolvedPath)) return "ok";
  if (!resolvedPath.endsWith("/") && routeSet.has(`${resolvedPath}/`)) return "non-canonical";
  return "not-found";
}

export function checkFile(file, content, routeSet) {
  const currentRoute = routeForDocFile(file);
  const links = extractLinks(file, content);
  const findings = [];
  for (const { target, line } of links) {
    const resolvedPath = resolveTarget(currentRoute, target);
    const status = classify(resolvedPath, routeSet);
    if (status !== "ok") {
      findings.push({ file, line, target, resolvedPath, status });
    }
  }
  return findings;
}

export function checkAll(files = listDocFiles(), readFile = (f) => readFileSync(f, "utf8")) {
  const kebabProblems = checkKebabCase(files);
  if (kebabProblems.length > 0) {
    const err = new Error("non-kebab-case doc filename(s) found -- the route model cannot be trusted");
    err.kebabProblems = kebabProblems;
    throw err;
  }
  const routeSet = buildRouteSet(files);
  const findings = [];
  for (const file of files) {
    findings.push(...checkFile(file, readFile(file), routeSet));
  }
  return findings;
}
