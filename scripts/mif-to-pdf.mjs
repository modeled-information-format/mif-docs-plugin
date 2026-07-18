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
// Markdown support is deliberately scoped to what mif-validate's own
// markdown<->JSON-LD projection (scripts/lib/projection.mjs) round-trips
// losslessly: h1-h3, paragraphs, flat bullet lists, tables, inline code,
// bold, links/autolinks, plus image embeds (`![alt](path)` /
// `<img src="path" alt="...">`) since svg-charts and every genre that uses
// it produce those. Constructs outside that round-trip-safe subset are
// still handled defensively, since real documents (e.g. the default
// embedded-Mermaid convention most genres use for charts) contain them:
// fenced code blocks render as a literal monospace block, EXCEPT a
// ```mermaid fence, which renders as a real diagram image via a live
// Mermaid layout engine (a Puppeteer-controlled headless Chromium — see
// renderMermaidToPng); on any render failure it falls back to the same
// literal-source-text rendering as every other language. Single-level
// blockquotes render with their `>` marker stripped. Nested lists,
// footnotes, and raw HTML beyond `<img>` are still out of scope.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { basename, extname, dirname, resolve as resolvePath } from "node:path";
import { pathToFileURL } from "node:url";
import {
  PDFDocument,
  PDFName,
  PDFString,
  PDFHexString,
  PDFRawStream,
  StandardFonts,
  rgb,
  pushGraphicsState,
  popGraphicsState,
  beginText,
  endText,
  showText,
  setFontAndSize,
  setTextRenderingMode,
  TextRenderingMode,
} from "pdf-lib";
import puppeteer from "puppeteer";
import { renderMermaid } from "@mermaid-js/mermaid-cli";

// Renders one Mermaid diagram to PNG bytes using a real Mermaid layout
// engine running in a Puppeteer-controlled browser (see main() for the
// shared browser instance's lifecycle). PNG output is auto-cropped to the
// diagram's real bounding box, so a generous fixed viewport costs nothing
// for small diagrams. quadrantChart specifically needs an explicit
// chartWidth/chartHeight bump too, not just a bigger viewport: it does not
// wrap long quadrant labels, and its own internal layout (not the
// screenshot canvas) is what determines whether a long label overlaps a
// neighboring element or the diagram's own bounding box — verified against
// a real 48-character quadrant label that was clipped mid-word at the
// default chart size and rendered fully once chartWidth/chartHeight were
// widened.
async function renderMermaidToPng(browser, definition) {
  const { data } = await renderMermaid(browser, definition, "png", {
    viewport: { width: 1400, height: 1000, deviceScaleFactor: 2 },
    backgroundColor: "white",
    mermaidConfig: { quadrantChart: { chartWidth: 900, chartHeight: 700 } },
  });
  return Buffer.from(data);
}

const PAGE_WIDTH = 612; // US Letter, points
const PAGE_HEIGHT = 792;
const MARGIN = 54;
const MAX_WIDTH = PAGE_WIDTH - MARGIN * 2;
// A figure scaled to fit width alone can still be taller than a fresh page's
// usable height, in which case even a page break can't make it fit — it
// would draw past the bottom margin and clip silently. Capping by height too
// (using the full usable height of an empty page, not just what's left on
// the current one) guarantees a figure never exceeds what a page can hold.
const MAX_HEIGHT = PAGE_HEIGHT - MARGIN * 2;
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

    // CommonMark trims the info string, so both "```mermaid" and the
    // space-separated "``` mermaid" are valid fence-open lines.
    const fence = line.match(/^```\s*(\S*)\s*$/);
    if (fence) {
      const lang = fence[1] || null;
      const codeLines = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++; // consume the closing fence
      blocks.push({ type: "codeblock", lang, lines: codeLines });
      continue;
    }

    if (/^>\s?/.test(line)) {
      // A fence opening immediately inside a blockquote (`> ```lang`) is
      // unwrapped into its own code block (stripping the `> ` prefix from
      // every line first) rather than swallowed as blockquote prose — the
      // same literal-marker-leaking failure this file's unnested fence
      // handling above already fixes, recurring one level deeper.
      const innerFence = line.replace(/^>\s?/, "").match(/^```\s*(\S*)\s*$/);
      if (innerFence) {
        const lang = innerFence[1] || null;
        const codeLines = [];
        i++;
        while (i < lines.length && !/^>\s?```\s*$/.test(lines[i])) {
          codeLines.push(lines[i].replace(/^>\s?/, ""));
          i++;
        }
        if (i < lines.length) i++; // consume the closing fence line
        blocks.push({ type: "codeblock", lang, lines: codeLines });
        continue;
      }

      const quoteLines = [];
      while (i < lines.length && /^>\s?/.test(lines[i]) && !/^>\s?```/.test(lines[i])) {
        quoteLines.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      blocks.push({ type: "blockquote", text: quoteLines.join(" ").trim() });
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
      !/^\s*\|.*\|\s*$/.test(lines[i]) &&
      !/^```\s*\S*\s*$/.test(lines[i]) &&
      !/^>\s?/.test(lines[i])
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
// Every text-show call in this file goes through here, and each one sets
// its own absolute position (Tm) rather than advancing from the previous
// call — so a trailing space costs nothing visually (nothing downstream
// measures the width of what was actually drawn; wrapping/positioning math
// runs on the pre-space string). Without it, the raw PDF content stream has
// no whitespace between one word/line's Tj operator and the next: a naive
// extractor (copy-paste in most PDF viewers, non-layout-mode pdftotext,
// screen readers, most real-world PDF-to-text pipelines) reads the words of
// an entire page run together with zero separation. Geometric tools like
// `pdftotext -layout` reconstruct spacing from X/Y deltas and hide this —
// that reconstruction is not what most consumers of "the text in this PDF"
// actually use.
//
// This closes word-level smashing everywhere, but NOT line/row-boundary
// loss: only spaces separate every call, and a naive extractor has no way
// to distinguish "next word on this line" from "next line entirely".
// Line/row boundaries are restored by drawLineBreak below — see its
// comment for why drawText itself cannot do it.
function drawTextTracked(page, text, { x, y, size, font, color }) {
  if (currentPageFont.get(page) !== font) {
    page.setFont(font);
    currentPageFont.set(page, font);
  }
  page.drawText(`${text} `, { x, y, size, color });
}

// Emits an invisible text-show operation whose shown string is a single
// literal newline byte into the page's content stream:
//
//   q BT /F<key> <size> Tf 3 Tr <0A> Tj ET Q
//
// pdf-lib's high-level drawText cannot produce this: it splits its input
// on `\n` and discards the character itself before it ever reaches the
// shown content (the newline degrades to an empty `<> Tj`, verified
// empirically against the real content stream — issue #142). So the
// operators are pushed directly. Text rendering mode 3 (Invisible)
// guarantees no glyph is ever painted regardless of how the font maps
// byte 0x0A, and the q/Q wrapper keeps the mode (and font) change from
// leaking into subsequent draws — while naive text extractors (copy-paste
// in most PDF viewers, non-layout pdftotext, screen readers, anything
// that concatenates shown strings in stream order) see a real line
// separator. This is what makes multi-line code blocks and multi-row
// tables distinguishable line-by-line/row-by-row in extracted text, which
// a trailing space alone cannot do.
//
// The explicit Tf matters for validity: a Tj with no font set in the
// current graphics state is malformed PDF, and drawText's own Tf is
// wrapped in q/Q so it does not survive into this operation. page.fontKey
// is pdf-lib-internal state (the resource key page.setFont registered),
// but it is the only handle to the current font's resource name, and
// pdf-lib is exact-pinned in package.json. The font/size tracking mirrors
// drawTextTracked so no duplicate font resources are created.
//
// The resource key is snapshotted into a local `fontKey` and guarded before
// use: the setFont() call above populates it in every path that runs today,
// but rather than depend on that internal contract holding forever, a
// falsy key skips the invisible break entirely instead of emitting a
// malformed `<> Tf` / `Tj`. Text is never smashed even then — the trailing
// space from drawTextTracked still separates tokens; only the extra
// line/row separator is dropped.
function drawLineBreak(page, { size, font }) {
  if (currentPageFont.get(page) !== font) {
    page.setFont(font);
    currentPageFont.set(page, font);
  }
  const fontKey = page.fontKey;
  if (!fontKey) return;
  page.pushOperators(
    pushGraphicsState(),
    beginText(),
    setFontAndSize(fontKey, size),
    setTextRenderingMode(TextRenderingMode.Invisible),
    showText(PDFHexString.of("0A")),
    endText(),
    popGraphicsState(),
  );
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

  // Character-level fallback for a single token wider than maxWidth on its
  // own (e.g. an unbroken code span or a long URL used as link text) —
  // mirrors the character-break fallback drawCodeBlock already uses one
  // level up for whole overlong lines. Iterates with for...of (not indexing
  // the string) so multi-code-point characters are never split mid-character.
  // Every returned piece keeps the original token's font/size/link/code so
  // rendering (color, link annotations) stays correct across the break.
  function splitTokenText(tok, maxWidth) {
    const chars = [...tok.text];
    const chunks = [];
    let cur = "";
    for (const ch of chars) {
      const candidate = cur + ch;
      if (cur && tok.font.widthOfTextAtSize(candidate, tok.size) > maxWidth) {
        chunks.push(cur);
        cur = ch;
      } else {
        cur = candidate;
      }
    }
    if (cur) chunks.push(cur);
    return chunks.map((text) => ({ ...tok, text }));
  }

  function wrapTokens(tokens, maxWidth) {
    const lines = [];
    let cur = [];
    let curWidth = 0;
    for (const tok of tokens) {
      const w = tok.font.widthOfTextAtSize(tok.text, tok.size);
      // A single token that doesn't fit within maxWidth even on a line by
      // itself (issue #154: a long inline code span in a narrow table
      // column) previously fell through to the plain "does it fit on the
      // current line" check below, which is always false for an empty
      // `cur` — so the oversized token got drawn at full width and
      // overprinted whatever followed it. Break it at the character level
      // instead, same idea drawCodeBlock uses for overlong literal lines.
      if (maxWidth > 0 && w > maxWidth) {
        if (cur.length) {
          lines.push(cur);
          cur = [];
          curWidth = 0;
        }
        const pieces = splitTokenText(tok, maxWidth);
        for (let i = 0; i < pieces.length - 1; i++) {
          lines.push([pieces[i]]);
        }
        const last = pieces[pieces.length - 1];
        cur = [last];
        curWidth = last.font.widthOfTextAtSize(last.text, last.size);
        continue;
      }
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

  // Code lines are drawn whole (not word-tokenized) so internal spacing —
  // load-bearing for indented DSLs like Mermaid directives — survives
  // exactly; only a line too wide for the page falls back to word-wrapping,
  // which necessarily loses that alignment since the line no longer fits.
  function drawCodeBlock(lines, lang) {
    const size = BODY_SIZE - 1;
    const lh = size * 1.4;
    const indent = MARGIN + 10;
    const width = MAX_WIDTH - 10;
    if (lang) {
      ensureSpace(lh);
      drawTextTracked(page, `[${lang}]`, { x: MARGIN, y, size: size - 1, font: fonts.bold, color: rgb(0.45, 0.45, 0.45) });
      drawLineBreak(page, { size: size - 1, font: fonts.bold });
      y -= lh;
    }
    const emit = (text) => {
      ensureSpace(lh);
      drawTextTracked(page, text, { x: indent, y, size, font: fonts.mono, color: rgb(0.2, 0.2, 0.2) });
      // Each drawn code line ends with a real newline in the extractable
      // text, so a multi-line block stays line-separable (issue #142).
      drawLineBreak(page, { size, font: fonts.mono });
      y -= lh;
    };
    for (const raw of lines.length ? lines : [""]) {
      if (fonts.mono.widthOfTextAtSize(raw, size) <= width) {
        emit(raw);
        continue;
      }
      let cur = "";
      for (const word of raw.split(/(\s+)/)) {
        if (cur && fonts.mono.widthOfTextAtSize(cur + word, size) > width) {
          emit(cur);
          cur = word.trimStart();
        } else {
          cur += word;
        }
      }
      if (cur.trim()) emit(cur);
    }
    y -= LINE_HEIGHT / 2;
  }

  function drawBlockquote(text) {
    const indent = MARGIN + LIST_INDENT;
    const width = MAX_WIDTH - LIST_INDENT;
    const lines = wrapTokens(tokenize(parseInline(text), BODY_SIZE), width);
    for (const lineTokens of lines) {
      ensureSpace(LINE_HEIGHT);
      page.drawLine({
        start: { x: MARGIN + 2, y: y - 2 },
        end: { x: MARGIN + 2, y: y + LINE_HEIGHT - 4 },
        thickness: 1.5,
        color: rgb(0.7, 0.7, 0.7),
      });
      drawTokenLine(lineTokens, indent);
      y -= LINE_HEIGHT;
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
      // Each table row ends with a real newline in the extractable text,
      // so rows stay separable in naive extraction (issue #142).
      drawLineBreak(page, { size: cellSize, font: wrappedRow[0]?.[0]?.font ?? cellFont.regular });
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

  // The true shared primitive: every embedded raster image (PNG or JPG,
  // whether from a figure file or rendered in-memory by Mermaid) ends at an
  // already-embedded pdf-lib image and needs the identical
  // scale-to-fit/draw/caption sequence — this is the one place that logic
  // lives.
  async function drawEmbeddedImage(image, alt) {
    const scale = Math.min(1, MAX_WIDTH / image.width, MAX_HEIGHT / image.height);
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

  // Thin PNG-specific wrapper over drawEmbeddedImage, for callers (figure
  // files with a .png extension, and drawMermaidBlock's in-memory render
  // output) that start from raw bytes rather than an already-embedded image.
  async function drawPngBytes(bytes, alt) {
    await drawEmbeddedImage(await doc.embedPng(bytes), alt);
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
    try {
      if (ext === ".jpg" || ext === ".jpeg") {
        await drawEmbeddedImage(await doc.embedJpg(bytes), alt);
      } else {
        await drawPngBytes(bytes, alt);
      }
    } catch (e) {
      ensureSpace(LINE_HEIGHT);
      drawParagraphRuns([{ text: `[unsupported figure format: ${src} (${e.message})]`, code: true }]);
    }
  }

  // Renders a fenced ```mermaid block as a real diagram image via a live
  // Mermaid layout engine (see renderMermaidToPng), instead of legible
  // source text. `browser` is a shared, already-launched Puppeteer instance
  // (see main()) — launching one per diagram would cost ~1-2s of Chromium
  // startup each. On any rendering failure (malformed diagram syntax,
  // browser crash, etc.) this falls back to the same literal-source-text
  // rendering used for every other fenced code block, rather than aborting
  // the whole document — a bad diagram in one block should not lose the
  // rest of a document's content.
  async function drawMermaidBlock(lines, browser) {
    const definition = lines.join("\n");
    if (browser) {
      try {
        const bytes = await renderMermaidToPng(browser, definition);
        await drawPngBytes(bytes, null);
        return;
      } catch (e) {
        console.warn(`mif-to-pdf: mermaid render failed, falling back to source text: ${e.message}`);
      }
    }
    drawCodeBlock(lines, "mermaid");
  }

  return {
    drawHeading,
    drawParagraph,
    drawList,
    drawTable,
    drawCodeBlock,
    drawBlockquote,
    drawImageBlock,
    drawMermaidBlock,
    getY: () => y,
    setY: (v) => (y = v),
    ensureSpace,
    getPage: () => page,
  };
}

// ---------------------------------------------------------------------------
// Minimal SVG renderer, scoped to what this suite's own svg-charts skill
// emits: rect/text/line/circle/path/polyline/polygon, class- or attribute-
// driven fill/font styling from a single inline <style> block, and <g
// transform="translate(dx,dy)"> grouping. Not a general SVG engine.
// ---------------------------------------------------------------------------

// A single-pass `/<[^>]+>/g` strip can leave a reconstructed tag behind when
// input is adversarially nested (CodeQL: incomplete multi-character
// sanitization). Iterating to a fixed point closes that class of bypass
// entirely, regardless of nesting depth.
function stripXmlTags(s) {
  let prev;
  let cur = s;
  do {
    prev = cur;
    cur = prev.replace(/<[^>]+>/g, "");
  } while (cur !== prev);
  return cur;
}

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

// Attribute values may be single- or double-quoted (both are valid XML/SVG).
// A tag-matching regex that only accepts one quote style doesn't just miss
// that one attribute's value — since the attribute group is inside the tag's
// own match, ANY differently-quoted attribute makes the WHOLE tag fail to
// match, silently dropping the entire element from this pass. The other
// (text) pass's tag matching uses a quote-agnostic `[^>]*` and doesn't have
// this failure mode, so the two passes could desync on exactly this input
// without both accepting the same quote styles.
const ATTR_RE_SRC = String.raw`\s+[\w:-]+=(?:"[^"]*"|'[^']*')`;
function tokenizeSvgTags(svg) {
  const tags = [];
  const re = new RegExp(`<(/?)([\\w:-]+)((?:${ATTR_RE_SRC})*)\\s*(/?)>`, "g");
  let m;
  while ((m = re.exec(svg))) {
    tags.push({ closing: m[1] === "/", name: m[2], attrs: parseSvgAttrs(m[3]), selfClosing: m[4] === "/" });
  }
  return tags;
}

function parseSvgAttrs(attrStr) {
  const attrs = {};
  const attrRe = /([\w:-]+)=(?:"([^"]*)"|'([^']*)')/g;
  let am;
  while ((am = attrRe.exec(attrStr))) attrs[am[1]] = am[2] ?? am[3];
  return attrs;
}

function drawSvgFigure(doc, fonts, getPage, ensureSpace, getY, setY, filePath, alt) {
  const svg = readFileSync(filePath, "utf8");
  const vb = svg.match(/viewBox="([\d.\s-]+)"/);
  const [, , svgW, svgH] = vb ? vb[1].trim().split(/\s+/).map(Number) : [0, 0, 640, 360];
  const scale = Math.min(1, MAX_WIDTH / svgW, MAX_HEIGHT / svgH);
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

    const attrs = parseSvgAttrs(tm[1]);
    const cls = attrs.class ? styles[attrs.class] ?? {} : {};
    const size = Number(attrs["font-size"] ?? cls["font-size"]?.replace("px", "") ?? 12) * scale;
    const weight = attrs["font-weight"] ?? cls["font-weight"];
    const useFont = weight && Number(weight) >= 600 ? boldFont : font;
    const fillAttr = attrs.fill ?? cls.fill;
    const color = svgColor(fillAttr) ?? rgb(0, 0, 0);
    const content = stripXmlTags(tm[2]).trim();
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

  // Full typed mif: tree — one real property per top-level MIF field, except
  // @context (JSON-LD plumbing, not document data) and content (already
  // represented above via dc:description, and verbatim via mif:rawDocument
  // below — a third, truncated copy here would be redundant, not more complete).
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
  const blocks = parseBlocks(jsonld.content ?? "");
  // Most genres this suite produces open the body with an H1 that matches
  // the frontmatter title exactly (business-plan) or elaborates on it with a
  // short genre-ID prefix (adr's "ADR-0007: <title>", prd's "PRD: <title>")
  // — drawing a synthetic title heading unconditionally duplicated it. Only
  // skip the synthetic title when the body's own leading H1 actually
  // restates it: an exact match, or a genre-ID-style prefix (starts
  // uppercase, and either contains a digit or is fully uppercase — "ADR-0007",
  // "PRD", not an ordinary capitalized word) followed by a colon and the
  // title verbatim. Two looser heuristics were tried first and rejected: a
  // plain substring check in either direction silently dropped any
  // short/acronym title that happened to be a substring of an unrelated
  // leading H1 (title "API" swallowed by a heading "Rapid Deployment", since
  // "api" ⊂ "Rapid"); a "<any short prefix>: <title>" pattern with no
  // constraint on the prefix's shape still wrongly matched ordinary prose
  // headings like "Note: API" or "See also: Search" that merely happen to
  // end with the title after a colon, not restate it as a genre ID would.
  const normalize = (s) => String(s).trim().toLowerCase().replace(/[-–—]/g, " ").replace(/\s+/g, " ");
  const headingRestatesTitle = (headingText, t) => {
    const h = normalize(headingText);
    const nt = normalize(t);
    if (h === nt) return true;
    const prefixed = String(headingText).trim().match(/^([^:]{1,20}):\s*(.+)$/);
    if (!prefixed) return false;
    const [, prefix, suffix] = prefixed;
    const looksLikeGenreId = /^[A-Z]/.test(prefix) && (/\d/.test(prefix) || prefix === prefix.toUpperCase());
    return looksLikeGenreId && normalize(suffix) === nt;
  };
  const leading = blocks[0]?.type === "heading" && blocks[0].level === 1 ? blocks[0] : null;
  const bodyOpensWithTitle = leading && headingRestatesTitle(leading.text, title);
  if (!bodyOpensWithTitle) renderer.drawHeading(title, 1);

  // A browser is only launched (Chromium startup costs ~1-2s) when the
  // document actually has a mermaid fence to render; every other document
  // never pays this cost. Shared across every mermaid block in this
  // document rather than one browser per diagram. --no-sandbox is needed
  // because CI runners (and many containers) restrict the unprivileged user
  // namespaces Chromium's sandbox needs — safe here since this browser only
  // ever renders local, static Mermaid source, never untrusted web content.
  // The launch itself is inside this try/catch, not just each diagram's own
  // render call: an unguarded launch failure would throw out of main()
  // entirely and abort the whole document, defeating the per-diagram
  // fallback drawMermaidBlock provides below — a launch failure instead
  // leaves `browser` null, which drawMermaidBlock already treats the same
  // as "no browser available" and falls back to source text for every
  // mermaid fence in the document, not just the failing one.
  const hasMermaid = blocks.some((b) => b.type === "codeblock" && b.lang === "mermaid");
  let browser = null;
  if (hasMermaid) {
    try {
      browser = await puppeteer.launch({ args: ["--no-sandbox", "--disable-setuid-sandbox"] });
    } catch (e) {
      console.warn(`mif-to-pdf: could not launch a browser for mermaid rendering, falling back to source text: ${e.message}`);
    }
  }
  try {
    for (const block of blocks) {
      if (block.type === "heading") renderer.drawHeading(block.text, block.level);
      else if (block.type === "paragraph") renderer.drawParagraph(block.text);
      else if (block.type === "list") renderer.drawList(block.items);
      else if (block.type === "table") renderer.drawTable(block.rows);
      else if (block.type === "codeblock" && block.lang === "mermaid") await renderer.drawMermaidBlock(block.lines, browser);
      else if (block.type === "codeblock") renderer.drawCodeBlock(block.lines, block.lang);
      else if (block.type === "blockquote") renderer.drawBlockquote(block.text);
      else if (block.type === "image") await renderer.drawImageBlock(block.src, block.alt, baseDir);
    }
  } finally {
    if (browser) await browser.close();
  }

  setInfoDictionary(doc, jsonld, title);
  attachXmpMetadata(doc, jsonld, title);

  const bytes = await doc.save();
  writeFileSync(output, bytes);
  console.log(`mif-to-pdf: wrote ${output} (${bytes.length} bytes)`);
}

// Guarded so tests can `import { parseBlocks, parseInline }` from this file
// without triggering a CLI run (and its process.exit calls) as a side effect.
// pathToFileURL (not a hand-built `file://${...}` template) handles relative
// paths, spaces, and other characters that need URL-encoding consistently
// with how import.meta.url is actually formed.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
