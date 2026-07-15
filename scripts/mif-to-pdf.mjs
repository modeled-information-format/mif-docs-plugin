#!/usr/bin/env node
// mif-to-pdf.mjs — convert a MIF JSON-LD document to PDF, rendering its
// markdown `content` body with real typesetting (headings, bold, inline
// code, flat bullet lists, tables, links, and embedded raster/SVG figures)
// and embedding every MIF field as PDF metadata: a real Dublin-Core-plus-mif:
// namespace RDF/XML tree in a custom XMP stream (not a single opaque blob),
// plus the standard Info dictionary (best-effort mapped).
//
//   mif-to-pdf <doc.json> [--output out.pdf]
//
// Input is MIF JSON-LD ONLY — this script does not parse Markdown
// frontmatter. For a Markdown source, convert it first with the existing
// suite tooling:
//   node scripts/mif-convert.mjs emit-jsonld <doc.md> > <doc.json>
//   node scripts/mif-validate.mjs <doc.md> --level 1   # conformance gate
//
// Markdown support is scoped to this suite's own documented round-trip-safe
// subset (see CLAUDE.local.md): h1-h3, paragraphs, flat bullet lists,
// tables, inline code, bold, links/autolinks, plus image embeds
// (`![alt](path)` / `<img src="path" alt="...">`) since svg-charts and
// every genre that uses it produce those. Nested lists, blockquotes,
// footnotes, and raw HTML beyond `<img>` are out of scope by the same
// convention.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { basename, extname, dirname, resolve as resolvePath } from "node:path";
import { PDFDocument, PDFName, PDFString, PDFRawStream, StandardFonts, rgb } from "pdf-lib";

const PAGE_WIDTH = 612; // US Letter, points
const PAGE_HEIGHT = 792;
const MARGIN = 54;
const MAX_WIDTH = PAGE_WIDTH - MARGIN * 2;
const BODY_SIZE = 11;
const LINE_HEIGHT = 15;
const HEADING_SIZES = { 1: 18, 2: 15, 3: 13 };
const LIST_INDENT = 16;
const LINK_COLOR = rgb(0.08, 0.24, 0.72);
const TEXT_COLOR = rgb(0, 0, 0);
const XMP_NS = "https://mif-spec.dev/ns#";
const DC_NS = "http://purl.org/dc/elements/1.1/";
const XMP_CORE_NS = "http://ns.adobe.com/xap/1.0/";
const RDF_NS = "http://www.w3.org/1999/02/22-rdf-syntax-ns#";

function usageExit(code) {
  console.error("usage: mif-to-pdf <doc.json> [--output out.pdf]");
  process.exit(code);
}

function parseArgs(argv) {
  let file = null;
  let outPath = null;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--output") {
      i++;
      if (i >= argv.length) usageExit(2);
      outPath = argv[i];
    } else if (file === null) {
      file = argv[i];
    }
  }
  return { file, outPath };
}

function readJsonld(file) {
  let text;
  try {
    text = readFileSync(file, "utf8");
  } catch (e) {
    console.error(`mif-to-pdf: cannot read ${file}: ${e.message}`);
    process.exit(1);
  }
  let jsonld;
  try {
    jsonld = JSON.parse(text);
  } catch (e) {
    console.error(`mif-to-pdf: ${file} is not valid JSON: ${e.message}`);
    process.exit(1);
  }
  if (jsonld["@id"] === undefined || jsonld.conceptType === undefined || jsonld.created === undefined) {
    console.error(
      `mif-to-pdf: ${file} is missing a required MIF L1 field (@id/conceptType/created) — ` +
        "not a MIF JSON-LD document. For a Markdown source, convert it first with " +
        "`node scripts/mif-convert.mjs emit-jsonld <doc.md>` and gate it with `mif-validate`.",
    );
    process.exit(1);
  }
  return jsonld;
}

// ---------------------------------------------------------------------------
// Markdown: block parsing
// ---------------------------------------------------------------------------

function splitTableRow(line) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim());
}

const MARKDOWN_IMAGE_RE = /^\s*!\[([^\]]*)\]\(([^)\s]+)\)\s*$/;
const HTML_IMG_TAG_RE = /^\s*<img\s+([^>]*?)\/?>\s*$/i;

// Attributes are extracted independently (not as one combined regex) so
// attribute order never matters — a single greedy/optional-group regex here
// previously let a trailing wildcard swallow `alt="..."` whenever it came
// after `src="..."`, silently dropping every image's alt text.
function parseImageLine(line) {
  const md = line.match(MARKDOWN_IMAGE_RE);
  if (md) return { src: md[2], alt: md[1] };
  const tag = line.match(HTML_IMG_TAG_RE);
  if (!tag) return null;
  const src = tag[1].match(/\bsrc=["']([^"']+)["']/i);
  if (!src) return null;
  const alt = tag[1].match(/\balt=["']([^"']*)["']/i);
  return { src: src[1], alt: alt ? alt[1] : "" };
}

export function parseBlocks(markdown) {
  const lines = String(markdown).replace(/\r\n/g, "\n").split("\n");
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === "") {
      i++;
      continue;
    }

    const image = parseImageLine(line);
    if (image) {
      blocks.push({ type: "image", ...image });
      i++;
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.*)$/);
    if (heading) {
      blocks.push({ type: "heading", level: heading[1].length, text: heading[2].trim() });
      i++;
      continue;
    }

    if (/^\s*\|.*\|\s*$/.test(line) && i + 1 < lines.length && /^\s*\|?[\s:|-]+\|?\s*$/.test(lines[i + 1])) {
      const rows = [splitTableRow(line)];
      i += 2; // header + separator
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) {
        rows.push(splitTableRow(lines[i]));
        i++;
      }
      blocks.push({ type: "table", rows });
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s+/, "").trim());
        i++;
      }
      blocks.push({ type: "list", items });
      continue;
    }

    const paraLines = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !parseImageLine(lines[i]) &&
      !/^(#{1,3})\s+/.test(lines[i]) &&
      !/^[-*]\s+/.test(lines[i]) &&
      !/^\s*\|.*\|\s*$/.test(lines[i])
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    blocks.push({ type: "paragraph", text: paraLines.join(" ").trim() });
  }
  return blocks;
}

// ---------------------------------------------------------------------------
// Markdown: inline parsing (bold, inline code, links, autolinks)
// ---------------------------------------------------------------------------

const INLINE_RE = /\[([^\]]+)\]\(([^)\s]+)\)|<((?:https?:\/\/)[^>\s]+)>|`([^`]+)`|\*\*([^*]+)\*\*/g;

export function parseInline(text) {
  const runs = [];
  let last = 0;
  let m;
  INLINE_RE.lastIndex = 0;
  while ((m = INLINE_RE.exec(text))) {
    if (m.index > last) runs.push({ text: text.slice(last, m.index) });
    if (m[1] !== undefined) runs.push({ text: m[1], link: m[2] });
    else if (m[3] !== undefined) runs.push({ text: m[3], link: m[3] });
    else if (m[4] !== undefined) runs.push({ text: m[4], code: true });
    else if (m[5] !== undefined) runs.push({ text: m[5], bold: true });
    last = INLINE_RE.lastIndex;
  }
  if (last < text.length) runs.push({ text: text.slice(last) });
  return runs.filter((r) => r.text !== "");
}

// ---------------------------------------------------------------------------
// PDF rendering engine: word-wrap runs of mixed font/style into lines,
// paginate, draw, and register clickable link annotations.
// ---------------------------------------------------------------------------

function addLinkAnnotation(doc, page, x, y, width, height, url) {
  const context = doc.context;
  const action = context.obj({ Type: "Action", S: "URI" });
  action.set(PDFName.of("URI"), PDFString.of(url));
  const annot = context.obj({ Type: "Annot", Subtype: "Link", Border: [0, 0, 0] });
  annot.set(PDFName.of("Rect"), context.obj([x, y, x + width, y + height]));
  annot.set(PDFName.of("A"), action);
  page.node.addAnnot(context.register(annot));
}

// page.drawText({font}) re-embeds a fresh Font resource dict entry on every
// single call, even for the same already-embedded font object (pdf-lib's own
// PDFPage.setFont has a literal "TODO: Reuse ... if we've already added this"
// — it does not dedupe). Calling page.setFont() once per actual font change,
// then drawText() without a font option, reuses the page's current font key
// instead — this is what keeps the PDF from carrying dozens of duplicate
// font-dictionary entries for a handful of real fonts.
const currentPageFont = new WeakMap();
function drawTextTracked(page, text, { x, y, size, font, color }) {
  if (currentPageFont.get(page) !== font) {
    page.setFont(font);
    currentPageFont.set(page, font);
  }
  page.drawText(text, { x, y, size, color });
}

function makeRenderer(doc, fonts) {
  let page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  function newPage() {
    page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    y = PAGE_HEIGHT - MARGIN;
  }

  function ensureSpace(needed) {
    if (y - needed < MARGIN) newPage();
  }

  function fontFor(run) {
    if (run.code) return fonts.mono;
    if (run.bold) return fonts.bold;
    return fonts.regular;
  }

  function tokenize(runs, size) {
    const tokens = [];
    for (const run of runs) {
      const font = fontFor(run);
      for (const word of run.text.split(/\s+/).filter(Boolean)) {
        tokens.push({ text: word, font, size, link: run.link, code: run.code });
      }
    }
    return tokens;
  }

  function wrapTokens(tokens, maxWidth) {
    const lines = [];
    let cur = [];
    let curWidth = 0;
    for (const tok of tokens) {
      const w = tok.font.widthOfTextAtSize(tok.text, tok.size);
      const addW = cur.length ? tok.font.widthOfTextAtSize(" ", tok.size) + w : w;
      if (cur.length && curWidth + addW > maxWidth) {
        lines.push(cur);
        cur = [tok];
        curWidth = w;
      } else {
        curWidth += addW;
        cur.push(tok);
      }
    }
    if (cur.length) lines.push(cur);
    return lines;
  }

  function drawTokenLine(tokens, x, lineY = y) {
    let cx = x;
    let linkStart = null;
    let linkUrl = null;
    const flushLink = (endX) => {
      if (linkStart !== null) {
        addLinkAnnotation(doc, page, linkStart, lineY - 2, endX - linkStart, tokens[0]?.size + 3 || BODY_SIZE + 3, linkUrl);
        linkStart = null;
        linkUrl = null;
      }
    };
    for (let idx = 0; idx < tokens.length; idx++) {
      const tok = tokens[idx];
      if (idx > 0) cx += tok.font.widthOfTextAtSize(" ", tok.size);
      if ((tok.link ?? null) !== linkUrl) {
        flushLink(cx);
        if (tok.link) {
          linkStart = cx;
          linkUrl = tok.link;
        }
      }
      const color = tok.link ? LINK_COLOR : tok.code ? rgb(0.35, 0.1, 0.45) : TEXT_COLOR;
      drawTextTracked(page, tok.text, { x: cx, y: lineY, size: tok.size, font: tok.font, color });
      const w = tok.font.widthOfTextAtSize(tok.text, tok.size);
      if (tok.link) {
        page.drawLine({ start: { x: cx, y: lineY - 1.5 }, end: { x: cx + w, y: lineY - 1.5 }, thickness: 0.5, color: LINK_COLOR });
      }
      cx += w;
    }
    flushLink(cx);
  }

  function drawParagraphRuns(runs, { size = BODY_SIZE, x = MARGIN, maxWidth = MAX_WIDTH, lineHeight = null } = {}) {
    const lh = lineHeight ?? size * (LINE_HEIGHT / BODY_SIZE);
    const lines = wrapTokens(tokenize(runs, size), maxWidth);
    for (const lineTokens of lines) {
      ensureSpace(lh);
      drawTokenLine(lineTokens, x);
      y -= lh;
    }
    return lines.length * lh;
  }

  function drawHeading(text, level) {
    const size = HEADING_SIZES[level] ?? HEADING_SIZES[3];
    ensureSpace(size * 1.4 + 6);
    y -= 6;
    drawParagraphRuns([{ text, bold: true }], { size, lineHeight: size * 1.25 });
    y -= 4;
  }

  function drawParagraph(text) {
    drawParagraphRuns(parseInline(text));
    y -= LINE_HEIGHT / 2;
  }

  function drawList(items) {
    for (const item of items) {
      ensureSpace(LINE_HEIGHT);
      drawTextTracked(page, "•", { x: MARGIN, y, size: BODY_SIZE, font: fonts.regular, color: TEXT_COLOR });
      drawParagraphRuns(parseInline(item), { x: MARGIN + LIST_INDENT, maxWidth: MAX_WIDTH - LIST_INDENT });
    }
    y -= LINE_HEIGHT / 2;
  }

  function drawTable(rows) {
    if (rows.length === 0) return;
    const cellFont = { regular: fonts.regular, bold: fonts.bold };
    const cellSize = BODY_SIZE - 1;
    const cellPad = 4;
    const numCols = rows[0].length;
    const colWidth = MAX_WIDTH / numCols;
    // rows[0] is the header; parseBlocks already drops the markdown
    // separator row ("---|---") when it builds this array, so every
    // remaining row here is real data — nothing left to strip.
    const wrappedRows = rows.map((row, rIdx) =>
      row.map((cell) => {
        const font = rIdx === 0 ? cellFont.bold : cellFont.regular;
        return wrapTokens(tokenize(parseInline(cell), cellSize), colWidth - cellPad * 2).map((line) => ({ line, font }));
      }),
    );
    for (const wrappedRow of wrappedRows) {
      const rowLines = Math.max(...wrappedRow.map((c) => c.length), 1);
      const rowHeight = rowLines * (cellSize + 4) + cellPad * 2;
      ensureSpace(rowHeight);
      const rowTop = y;
      for (let c = 0; c < wrappedRow.length; c++) {
        const cellX = MARGIN + c * colWidth + cellPad;
        let cellY = rowTop - cellPad - cellSize;
        for (const { line } of wrappedRow[c]) {
          drawTokenLine(line, cellX, cellY);
          cellY -= cellSize + 4;
        }
      }
      page.drawLine({
        start: { x: MARGIN, y: rowTop - rowHeight },
        end: { x: MARGIN + MAX_WIDTH, y: rowTop - rowHeight },
        thickness: 0.5,
        color: rgb(0.6, 0.6, 0.6),
      });
      y = rowTop - rowHeight;
    }
    y -= LINE_HEIGHT / 2;
  }

  async function drawImageBlock(src, alt, baseDir) {
    const resolved = resolvePath(baseDir, src);
    if (!existsSync(resolved)) {
      ensureSpace(LINE_HEIGHT);
      drawParagraphRuns([{ text: `[missing figure: ${src}]`, code: true }]);
      return;
    }
    const ext = extname(resolved).toLowerCase();
    if (ext === ".svg") {
      drawSvgFigure(doc, fonts, () => page, (h) => ensureSpace(h), () => y, (ny) => { y = ny; }, resolved, alt);
      return;
    }
    const bytes = readFileSync(resolved);
    let image;
    try {
      image = ext === ".jpg" || ext === ".jpeg" ? await doc.embedJpg(bytes) : await doc.embedPng(bytes);
    } catch (e) {
      ensureSpace(LINE_HEIGHT);
      drawParagraphRuns([{ text: `[unsupported figure format: ${src} (${e.message})]`, code: true }]);
      return;
    }
    const scale = Math.min(1, MAX_WIDTH / image.width);
    const w = image.width * scale;
    const h = image.height * scale;
    ensureSpace(h + LINE_HEIGHT);
    page.drawImage(image, { x: MARGIN, y: y - h, width: w, height: h });
    y -= h + 4;
    if (alt) {
      drawParagraphRuns([{ text: alt }], { size: BODY_SIZE - 2 });
    }
    y -= LINE_HEIGHT / 2;
  }

  return { drawHeading, drawParagraph, drawList, drawTable, drawImageBlock, getY: () => y, setY: (v) => (y = v), ensureSpace, getPage: () => page };
}

// ---------------------------------------------------------------------------
// Minimal SVG renderer, scoped to what this suite's own svg-charts skill
// emits: rect/text/line/circle/path/polyline/polygon, class- or attribute-
// driven fill/font styling from a single inline <style> block, and <g
// transform="translate(dx,dy)"> grouping. Not a general SVG engine.
// ---------------------------------------------------------------------------

function parseSvgStyleBlock(svg) {
  const m = svg.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
  const rules = {};
  if (!m) return rules;
  const ruleRe = /\.([\w-]+)\s*\{([^}]*)\}/g;
  let rm;
  while ((rm = ruleRe.exec(m[1]))) {
    const props = {};
    for (const decl of rm[2].split(";")) {
      const [k, v] = decl.split(":").map((s) => s && s.trim());
      if (k && v) props[k] = v;
    }
    rules[rm[1]] = props;
  }
  return rules;
}

function svgColor(value) {
  if (!value || value === "none") return null;
  const hex = value.match(/^#([0-9a-fA-F]{6})$/);
  if (hex) {
    const n = parseInt(hex[1], 16);
    return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
  }
  return rgb(0, 0, 0);
}

function tokenizeSvgTags(svg) {
  const tags = [];
  const re = /<(\/?)([\w:-]+)((?:\s+[\w:-]+="[^"]*")*)\s*(\/?)>/g;
  let m;
  while ((m = re.exec(svg))) {
    const attrs = {};
    const attrRe = /([\w:-]+)="([^"]*)"/g;
    let am;
    while ((am = attrRe.exec(m[3]))) attrs[am[1]] = am[2];
    tags.push({ closing: m[1] === "/", name: m[2], attrs, selfClosing: m[4] === "/" });
  }
  return tags;
}

function drawSvgFigure(doc, fonts, getPage, ensureSpace, getY, setY, filePath, alt) {
  const svg = readFileSync(filePath, "utf8");
  const vb = svg.match(/viewBox="([\d.\s-]+)"/);
  const [, , svgW, svgH] = vb ? vb[1].trim().split(/\s+/).map(Number) : [0, 0, 640, 360];
  const scale = Math.min(1, MAX_WIDTH / svgW);
  const boxHeight = svgH * scale;
  ensureSpace(boxHeight + LINE_HEIGHT);
  const page = getPage();
  const topY = getY();
  const font = fonts.regular;
  const boldFont = fonts.bold;
  const styles = parseSvgStyleBlock(svg);

  const tags = tokenizeSvgTags(svg);
  const groupStack = [{ dx: 0, dy: 0 }];
  const offset = () => groupStack[groupStack.length - 1];
  const toPageXY = (svgX, svgY) => {
    const off = offset();
    return { px: MARGIN + (svgX + off.dx) * scale, py: topY - (svgY + off.dy) * scale };
  };

  for (const tag of tags) {
    if (tag.name === "g") {
      if (tag.closing) {
        if (groupStack.length > 1) groupStack.pop();
        continue;
      }
      const t = tag.attrs.transform?.match(/translate\(\s*([\d.-]+)[,\s]+([\d.-]+)\s*\)/);
      const parent = offset();
      groupStack.push({ dx: parent.dx + (t ? Number(t[1]) : 0), dy: parent.dy + (t ? Number(t[2]) : 0) });
      continue;
    }
    // <text> content is handled by a separate regex pass below — the tag
    // tokenizer above doesn't carry inner text nodes, only tag/attrs.
    if (tag.name === "rect") {
      const x = Number(tag.attrs.x ?? 0);
      const yv = Number(tag.attrs.y ?? 0);
      const w = Number(tag.attrs.width ?? 0);
      const h = Number(tag.attrs.height ?? 0);
      const fill = svgColor(tag.attrs.fill);
      if (fill && w > 0 && h > 0) {
        const { px, py } = toPageXY(x, yv + h);
        page.drawRectangle({ x: px, y: py, width: w * scale, height: h * scale, color: fill });
      }
    } else if (tag.name === "line") {
      const { px: x1, py: y1 } = toPageXY(Number(tag.attrs.x1 ?? 0), Number(tag.attrs.y1 ?? 0));
      const { px: x2, py: y2 } = toPageXY(Number(tag.attrs.x2 ?? 0), Number(tag.attrs.y2 ?? 0));
      page.drawLine({
        start: { x: x1, y: y1 },
        end: { x: x2, y: y2 },
        thickness: Number(tag.attrs["stroke-width"] ?? 1) * scale,
        color: svgColor(tag.attrs.stroke) ?? rgb(0, 0, 0),
      });
    } else if (tag.name === "circle") {
      const { px, py } = toPageXY(Number(tag.attrs.cx ?? 0), Number(tag.attrs.cy ?? 0));
      const r = Number(tag.attrs.r ?? 0) * scale;
      const fill = svgColor(tag.attrs.fill);
      page.drawCircle({ x: px, y: py, size: r, color: fill ?? undefined, borderColor: fill ? undefined : rgb(0, 0, 0) });
    } else if (tag.name === "path" && tag.attrs.d) {
      const { px, py } = toPageXY(0, 0);
      page.drawSvgPath(tag.attrs.d, { x: px, y: py, scale, color: svgColor(tag.attrs.fill) ?? rgb(0, 0, 0) });
    } else if ((tag.name === "polyline" || tag.name === "polygon") && tag.attrs.points) {
      const pts = tag.attrs.points.trim().split(/\s+/).map((p) => p.split(",").map(Number));
      if (pts.length) {
        const d = `M ${pts.map((p) => p.join(",")).join(" L ")}` + (tag.name === "polygon" ? " Z" : "");
        const { px, py } = toPageXY(0, 0);
        const fill = svgColor(tag.attrs.fill);
        page.drawSvgPath(d, { x: px, y: py, scale, color: fill ?? undefined, borderColor: fill ? undefined : rgb(0, 0, 0) });
      }
    }
  }

  // Second pass for <text> nodes: tag-stream alone drops inner text content,
  // so <text ...>content</text> is matched directly here, honoring the same
  // group-offset stack recomputed by walking tags in the same document order.
  const textRe = /<text\b([^>]*)>([\s\S]*?)<\/text>/g;
  let tm;
  const groupStack2 = [{ dx: 0, dy: 0 }];
  let searchIdx = 0;
  while ((tm = textRe.exec(svg))) {
    // Re-walk <g> open/close tags between the previous match and this one to
    // keep the offset stack in sync with document order.
    const between = svg.slice(searchIdx, tm.index);
    for (const gm of between.matchAll(/<(\/?)g\b([^>]*)>/g)) {
      if (gm[1] === "/") {
        if (groupStack2.length > 1) groupStack2.pop();
      } else {
        const t = gm[2].match(/translate\(\s*([\d.-]+)[,\s]+([\d.-]+)\s*\)/);
        const parent = groupStack2[groupStack2.length - 1];
        groupStack2.push({ dx: parent.dx + (t ? Number(t[1]) : 0), dy: parent.dy + (t ? Number(t[2]) : 0) });
      }
    }
    searchIdx = tm.index + tm[0].length;

    const attrStr = tm[1];
    const attrs = {};
    for (const am of attrStr.matchAll(/([\w:-]+)="([^"]*)"/g)) attrs[am[1]] = am[2];
    const cls = attrs.class ? styles[attrs.class] ?? {} : {};
    const size = Number(attrs["font-size"] ?? cls["font-size"]?.replace("px", "") ?? 12) * scale;
    const weight = attrs["font-weight"] ?? cls["font-weight"];
    const useFont = weight && Number(weight) >= 600 ? boldFont : font;
    const fillAttr = attrs.fill ?? cls.fill;
    const color = svgColor(fillAttr) ?? rgb(0, 0, 0);
    const content = tm[2].replace(/<[^>]+>/g, "").trim();
    if (!content) continue;
    // Uses groupStack2 (rebuilt in document order for this pass), not the
    // shape pass's groupStack — the two passes run independently.
    const off = groupStack2[groupStack2.length - 1];
    const anchoredX = MARGIN + (Number(attrs.x ?? 0) + off.dx) * scale;
    const anchoredY = topY - (Number(attrs.y ?? 0) + off.dy) * scale;
    let drawX = anchoredX;
    if (attrs["text-anchor"] === "end") drawX -= useFont.widthOfTextAtSize(content, size);
    else if (attrs["text-anchor"] === "middle") drawX -= useFont.widthOfTextAtSize(content, size) / 2;
    drawTextTracked(page, content, { x: drawX, y: anchoredY, size, font: useFont, color });
  }

  setY(topY - boxHeight - 4);
  if (alt) {
    const y2 = getY();
    drawTextTracked(page, alt, { x: MARGIN, y: y2, size: BODY_SIZE - 2, font, color: rgb(0.4, 0.4, 0.4) });
    setY(y2 - LINE_HEIGHT);
  }
  setY(getY() - LINE_HEIGHT / 2);
}

// ---------------------------------------------------------------------------
// Standard PDF Info dictionary — best-effort, lossy convenience mapping.
// ---------------------------------------------------------------------------

function setInfoDictionary(doc, jsonld, title) {
  doc.setTitle(title);
  const author = jsonld.entity?.name ?? jsonld.provenance?.wasAttributedTo?.["@id"];
  if (author) doc.setAuthor(String(author));
  if (jsonld.namespace) doc.setSubject(String(jsonld.namespace));
  if (Array.isArray(jsonld.tags) && jsonld.tags.length) doc.setKeywords(jsonld.tags.map(String));
  if (jsonld.provenance?.agent) doc.setCreator(String(jsonld.provenance.agent));
  doc.setProducer("mif-to-pdf (mif-docs-plugin)");
  if (jsonld.created) doc.setCreationDate(new Date(jsonld.created));
  doc.setModificationDate(new Date(jsonld.modified ?? jsonld.created));
}

// ---------------------------------------------------------------------------
// Rich structured XMP: real Dublin Core + a full typed mif: RDF/XML tree for
// every field (not one opaque blob), plus the complete raw JSON-LD retained
// verbatim under mif:rawDocument as the machine-checkable losslessness
// guarantee — every field is both individually inspectable AND provably
// recoverable in full.
// ---------------------------------------------------------------------------

function xmlEscape(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function sanitizeTag(key) {
  const stripped = key.replace(/^@/, "at-");
  return /^[A-Za-z_][\w.-]*$/.test(stripped) ? stripped : "field";
}

// Generic, lossless JS-value -> RDF/XML serializer: arrays become rdf:Seq,
// plain objects become nested rdf:Description, scalars become escaped text
// nodes. This is what makes every MIF field structurally present in the
// XMP tree, including future/unknown extension fields, without new code.
function valueToRdf(tag, value) {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) {
    const items = value.map((v) => `<rdf:li>${valueToRdfItem(v)}</rdf:li>`).join("");
    return `<mif:${tag}><rdf:Seq>${items}</rdf:Seq></mif:${tag}>`;
  }
  if (typeof value === "object") {
    const props = Object.entries(value)
      .map(([k, v]) => valueToRdf(sanitizeTag(k), v))
      .join("");
    return `<mif:${tag}><rdf:Description>${props}</rdf:Description></mif:${tag}>`;
  }
  return `<mif:${tag}>${xmlEscape(value)}</mif:${tag}>`;
}

function valueToRdfItem(value) {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    const props = Object.entries(value)
      .map(([k, v]) => valueToRdf(sanitizeTag(k), v))
      .join("");
    return `<rdf:Description>${props}</rdf:Description>`;
  }
  return xmlEscape(String(value));
}

function dcSeq(values) {
  return `<rdf:Seq>${values.map((v) => `<rdf:li>${xmlEscape(v)}</rdf:li>`).join("")}</rdf:Seq>`;
}

function dcAlt(value) {
  return `<rdf:Alt><rdf:li xml:lang="x-default">${xmlEscape(value)}</rdf:li></rdf:Alt>`;
}

function buildXmpPacket(jsonld, title) {
  const author = jsonld.entity?.name ?? jsonld.provenance?.wasAttributedTo?.["@id"];
  const dc = [
    title && `<dc:title>${dcAlt(title)}</dc:title>`,
    author && `<dc:creator>${dcSeq([String(author)])}</dc:creator>`,
    Array.isArray(jsonld.tags) && jsonld.tags.length && `<dc:subject>${dcSeq(jsonld.tags.map(String))}</dc:subject>`,
    jsonld.content && `<dc:description>${dcAlt(String(jsonld.content).slice(0, 500))}</dc:description>`,
    jsonld["@id"] && `<dc:identifier>${xmlEscape(jsonld["@id"])}</dc:identifier>`,
  ]
    .filter(Boolean)
    .join("\n      ");

  const xmpCore = [
    jsonld.created && `<xmp:CreateDate>${xmlEscape(jsonld.created)}</xmp:CreateDate>`,
    (jsonld.modified ?? jsonld.created) && `<xmp:ModifyDate>${xmlEscape(jsonld.modified ?? jsonld.created)}</xmp:ModifyDate>`,
  ]
    .filter(Boolean)
    .join("\n      ");

  // Full typed mif: tree — one real property per top-level MIF field.
  const mifFields = Object.entries(jsonld)
    .filter(([k]) => !["@context", "content"].includes(k))
    .map(([k, v]) => valueToRdf(sanitizeTag(k), v))
    .join("\n      ");

  const rawDocument = `<mif:rawDocument>${xmlEscape(JSON.stringify(jsonld))}</mif:rawDocument>`;

  return [
    `<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>`,
    `<x:xmpmeta xmlns:x="adobe:ns:meta/">`,
    `  <rdf:RDF xmlns:rdf="${RDF_NS}">`,
    `    <rdf:Description rdf:about="" xmlns:dc="${DC_NS}" xmlns:xmp="${XMP_CORE_NS}" xmlns:mif="${XMP_NS}">`,
    `      ${dc}`,
    `      ${xmpCore}`,
    `      ${mifFields}`,
    `      ${rawDocument}`,
    `    </rdf:Description>`,
    `  </rdf:RDF>`,
    `</x:xmpmeta>`,
    `<?xpacket end="w"?>`,
  ].join("\n");
}

function attachXmpMetadata(doc, jsonld, title) {
  const xmpBytes = new TextEncoder().encode(buildXmpPacket(jsonld, title));
  const streamDict = doc.context.obj({ Type: "Metadata", Subtype: "XML", Length: xmpBytes.length });
  const stream = PDFRawStream.of(streamDict, xmpBytes);
  const streamRef = doc.context.register(stream);
  doc.catalog.set(PDFName.of("Metadata"), streamRef);
}

// ---------------------------------------------------------------------------

async function main() {
  const { file, outPath } = parseArgs(process.argv.slice(2));
  if (!file) usageExit(2);

  const jsonld = readJsonld(file);
  const title = jsonld.title ?? jsonld["@id"];
  const output = outPath || `${basename(file, extname(file))}.pdf`;
  const baseDir = dirname(resolvePath(file));

  const doc = await PDFDocument.create();
  const fonts = {
    regular: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
    mono: await doc.embedFont(StandardFonts.Courier),
  };

  const renderer = makeRenderer(doc, fonts);
  renderer.drawHeading(title, 1);
  for (const block of parseBlocks(jsonld.content ?? "")) {
    if (block.type === "heading") renderer.drawHeading(block.text, block.level);
    else if (block.type === "paragraph") renderer.drawParagraph(block.text);
    else if (block.type === "list") renderer.drawList(block.items);
    else if (block.type === "table") renderer.drawTable(block.rows);
    else if (block.type === "image") await renderer.drawImageBlock(block.src, block.alt, baseDir);
  }

  setInfoDictionary(doc, jsonld, title);
  attachXmpMetadata(doc, jsonld, title);

  const bytes = await doc.save();
  writeFileSync(output, bytes);
  console.log(`mif-to-pdf: wrote ${output} (${bytes.length} bytes)`);
}

// Guarded so tests can `import { parseBlocks, parseInline }` from this file
// without triggering a CLI run (and its process.exit calls) as a side effect.
if (import.meta.url === `file://${process.argv[1]}`) main();
