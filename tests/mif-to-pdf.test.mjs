// Acceptance tests for scripts/mif-to-pdf.mjs. Two layers:
//   1. Pure-function unit tests on the markdown block/inline parsers —
//      fast, deterministic, and the right level to pin down parsing bugs
//      (e.g. the table-row-count regression this file guards against)
//      without depending on any external PDF-reading binary.
//   2. PDF-structural integration tests via pdf-lib itself: metadata
//      losslessness, real Dublin Core presence, clickable link annotations,
//      and a regression guard on the font-resource-duplication bug.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { inflateSync } from 'node:zlib';
import { PDFDocument, PDFName, PDFArray, StandardFonts } from 'pdf-lib';
import { parseBlocks, parseInline, sanitizeForFont } from '../scripts/mif-to-pdf.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const converter = join(root, 'scripts', 'mif-to-pdf.mjs');
const fixture = join(root, 'tests', 'fixtures', 'mif-to-pdf-l3.json');
const richFixture = join(root, 'tests', 'fixtures', 'mif-to-pdf-rich.json');

// Mirrors mif-to-pdf.mjs's own page-geometry constants (MARGIN, MAX_WIDTH =
// PAGE_WIDTH(612) - MARGIN*2) — kept here, not imported, since those are
// module-private to the renderer; tests that check real drawn geometry
// against expected column/page boundaries share these two values so they
// don't drift independently of each other.
const MARGIN = 54;
const MAX_WIDTH_FOR_TEST = 504;

function runConverter(input, output) {
  return spawnSync('node', [converter, input, '--output', output], { encoding: 'utf8' });
}

async function extractXmpText(pdfBytes) {
  const doc = await PDFDocument.load(pdfBytes);
  const streamRef = doc.catalog.get(PDFName.of('Metadata'));
  assert.ok(streamRef, 'catalog must carry a /Metadata entry');
  const stream = doc.context.lookup(streamRef);
  return { doc, xml: new TextDecoder().decode(stream.contents) };
}

// Decodes every text-show operand's hex string, in content-stream order.
// Code-block lines are drawn whole (one Tj per source line, preserving
// internal spacing), while paragraph/heading/blockquote text is drawn one
// word per Tj (the renderer's tokenizer splits on whitespace) — so this
// returns line-granularity strings for code blocks and word-granularity
// strings everywhere else, matching how each was actually drawn.
//
// Every drawn string carries a single trailing space (drawTextTracked's
// fix for naive text extraction — see its own comment in mif-to-pdf.mjs);
// trimmed off here since content-match assertions care about the logical
// token, not that implementation detail. rawDecodedTextTokens below
// preserves it, for tests that need to check the separator itself exists.
function rawDecodedTextTokens(doc, pageIndex) {
  const page = doc.getPage(pageIndex);
  const contentsObj = doc.context.lookup(page.node.get(PDFName.of('Contents')));
  const streamRefs = contentsObj instanceof PDFArray ? contentsObj.asArray() : [contentsObj];
  const raw = streamRefs
    .map((ref) => {
      // context.lookup() itself checks `instanceof PDFRef` and passes an
      // already-resolved object through unchanged, so it's safe to call
      // unconditionally — no need for a constructor.name string check.
      const s = doc.context.lookup(ref);
      let bytes = Buffer.from(s.contents);
      try {
        bytes = inflateSync(bytes);
      } catch {
        // already-uncompressed stream; use raw bytes as-is
      }
      return bytes.toString('latin1');
    })
    .join('\n');
  return [...raw.matchAll(/<([0-9A-Fa-f]+)>\s*Tj/g)].map((m) => Buffer.from(m[1], 'hex').toString('latin1'));
}

function decodedTextTokens(doc, pageIndex) {
  return rawDecodedTextTokens(doc, pageIndex).map((t) => (t.endsWith(' ') ? t.slice(0, -1) : t));
}

// Returns the page's fully decompressed content stream as one string, in
// stream order — the same decompression rawDecodedTextTokens performs, but
// without restricting the result to Tj operands, so callers can also pull
// positioning (Tm) and path (m/l) operators out of it.
function rawContentStream(doc, pageIndex) {
  const page = doc.getPage(pageIndex);
  const contentsObj = doc.context.lookup(page.node.get(PDFName.of('Contents')));
  const streamRefs = contentsObj instanceof PDFArray ? contentsObj.asArray() : [contentsObj];
  return streamRefs
    .map((ref) => {
      const s = doc.context.lookup(ref);
      let bytes = Buffer.from(s.contents);
      try {
        bytes = inflateSync(bytes);
      } catch {
        // already-uncompressed stream; use raw bytes as-is
      }
      return bytes.toString('latin1');
    })
    .join('\n');
}

// Every drawn text token is preceded, in the same `BT ... Tm <hex> Tj ... ET`
// block drawTextTracked emits, by an absolute-position `1 0 0 1 x y Tm` (see
// mif-to-pdf.mjs's page.drawText usage — it never uses relative Td/T*
// advances for shown text, only for the invisible line-break marker). This
// pairs each decoded string with the (x, y) it was actually drawn at, in
// content-stream order, so tests can check real geometry (e.g. that no
// table cell's drawn text crosses into the next column) instead of only
// content.
function textPositions(doc, pageIndex) {
  const raw = rawContentStream(doc, pageIndex);
  // Whitespace between operators is matched loosely (any run of whitespace,
  // not specifically "\s*\r?\n") since pdf-lib's own serialization is an
  // implementation detail this test shouldn't be brittle against — a future
  // pdf-lib version emitting `Tm` and `Tj` on the same line must not
  // silently make this helper (and everything built on it) stop matching.
  const re = /1 0 0 1 (-?[\d.]+) (-?[\d.]+) Tm\s+<([0-9A-Fa-f]+)>\s*Tj/g;
  return [...raw.matchAll(re)].map((m) => ({
    x: Number(m[1]),
    y: Number(m[2]),
    text: Buffer.from(m[3], 'hex').toString('latin1'),
  }));
}

// drawTable's per-row horizontal separator is a page.drawLine call from
// MARGIN to MARGIN + MAX_WIDTH (x 54 to 558) at `y = rowTop - rowHeight`;
// matching the full `m ... l ... S` segment and filtering to that exact
// x-span (rather than any `l`/`S` pair) keeps this from accidentally
// picking up an unrelated stroke — e.g. a link's underline, which is also
// drawn as a short horizontal line — and loose whitespace matching keeps it
// from depending on pdf-lib emitting each operator on its own line.
function horizontalLineYs(doc, pageIndex) {
  const raw = rawContentStream(doc, pageIndex);
  const re = /(-?[\d.]+) (-?[\d.]+) m\s+(?:-?[\d.]+ -?[\d.]+ m\s+)?(-?[\d.]+) (-?[\d.]+) l\s+S/g;
  return [...raw.matchAll(re)]
    .filter((m) => Number(m[1]) === MARGIN && Number(m[3]) === MARGIN + MAX_WIDTH_FOR_TEST)
    .map((m) => Number(m[2]));
}

function extractRawDocument(xml) {
  const m = xml.match(/<mif:rawDocument>([\s\S]*?)<\/mif:rawDocument>/);
  assert.ok(m, 'XMP packet must carry a mif:rawDocument element (the losslessness guarantee)');
  return JSON.parse(m[1].replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&'));
}

// ---------------------------------------------------------------------------
// Unit tests: block/inline markdown parsing
// ---------------------------------------------------------------------------

test('parseBlocks: a table keeps every data row (regression — the separator was previously double-stripped)', () => {
  const md = '| Competitor | Share |\n| --- | --- |\n| Bottled Bottler Co | 22% |\n| Cafe Roast Collective | 18% |';
  const blocks = parseBlocks(md);
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].type, 'table');
  assert.deepEqual(blocks[0].rows, [
    ['Competitor', 'Share'],
    ['Bottled Bottler Co', '22%'],
    ['Cafe Roast Collective', '18%'],
  ]);
});

test('parseBlocks: headings, flat bullet lists, paragraphs, and image lines are all recognized', () => {
  const md = [
    '# Title',
    '',
    '## Subhead',
    '',
    'A plain paragraph.',
    '',
    '- one',
    '- two',
    '',
    '![alt text](chart.svg)',
  ].join('\n');
  const blocks = parseBlocks(md);
  assert.deepEqual(
    blocks.map((b) => b.type),
    ['heading', 'heading', 'paragraph', 'list', 'image'],
  );
  assert.equal(blocks[0].level, 1);
  assert.equal(blocks[1].level, 2);
  assert.deepEqual(blocks[3].items, ['one', 'two']);
  assert.equal(blocks[4].src, 'chart.svg');
  assert.equal(blocks[4].alt, 'alt text');
});

test('parseBlocks: <img> HTML tags are recognized as image blocks too', () => {
  const blocks = parseBlocks('<img src="assets/chart.svg" alt="A chart">');
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].type, 'image');
  assert.equal(blocks[0].src, 'assets/chart.svg');
  assert.equal(blocks[0].alt, 'A chart');
});

test('parseBlocks: a fenced code block is recognized, preserving every line and the language tag (regression — previously fell through to the paragraph catch-all as one flattened line with literal ``` markers, garbling every Mermaid diagram)', () => {
  const md = ['Some intro.', '', '```mermaid', 'pie title X', '    "A" : 1', '```', '', 'After.'].join('\n');
  const blocks = parseBlocks(md);
  assert.deepEqual(
    blocks.map((b) => b.type),
    ['paragraph', 'codeblock', 'paragraph'],
  );
  assert.equal(blocks[1].lang, 'mermaid');
  assert.deepEqual(blocks[1].lines, ['pie title X', '    "A" : 1']);
});

test('parseBlocks: a fenced code block with no language tag is still recognized', () => {
  const blocks = parseBlocks(['```', 'raw text', '```'].join('\n'));
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].type, 'codeblock');
  assert.equal(blocks[0].lang, null);
  assert.deepEqual(blocks[0].lines, ['raw text']);
});

test('parseBlocks: a fenced code block with a space before the language tag is recognized (CommonMark trims the info string) — regression, found in review', () => {
  const blocks = parseBlocks(['``` mermaid', 'pie title X', '```'].join('\n'));
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].type, 'codeblock');
  assert.equal(blocks[0].lang, 'mermaid');
  assert.deepEqual(blocks[0].lines, ['pie title X']);
});

test('parseBlocks: a paragraph immediately followed by a space-language-tagged fence does not absorb the fence line — regression, found in review', () => {
  const blocks = parseBlocks(['A paragraph.', '``` mermaid', 'pie title X', '```'].join('\n'));
  assert.deepEqual(
    blocks.map((b) => b.type),
    ['paragraph', 'codeblock'],
  );
  assert.equal(blocks[0].text, 'A paragraph.');
});

test('parseBlocks: a blockquote is recognized with its > marker stripped, merging consecutive lines (regression — previously fell through to the paragraph catch-all with a literal leaking > character)', () => {
  const md = ['> Line one.', '> Line two.', '', 'Not a quote.'].join('\n');
  const blocks = parseBlocks(md);
  assert.deepEqual(
    blocks.map((b) => b.type),
    ['blockquote', 'paragraph'],
  );
  assert.equal(blocks[0].text, 'Line one. Line two.');
  assert.equal(blocks[1].text, 'Not a quote.');
});

test('parseBlocks: a fenced code block immediately inside a blockquote is unwrapped into its own code block, not swallowed as blockquote text with leaking fence markers (regression — found in review)', () => {
  const md = ['> ```js', '> code line', '> ```', '', 'After.'].join('\n');
  const blocks = parseBlocks(md);
  assert.deepEqual(
    blocks.map((b) => b.type),
    ['codeblock', 'paragraph'],
  );
  assert.equal(blocks[0].lang, 'js');
  assert.deepEqual(blocks[0].lines, ['code line']);
});

test('parseInline: bold, inline code, links, and autolinks all parse to distinct runs', () => {
  const runs = parseInline('a **bold** b `code` c [text](https://x.test) d <https://y.test>');
  // Whitespace between special tokens stays part of the surrounding plain-text
  // run here — word-splitting happens later, in the renderer's tokenizer.
  assert.deepEqual(
    runs.map((r) => ({ text: r.text, bold: !!r.bold, code: !!r.code, link: r.link ?? null })),
    [
      { text: 'a ', bold: false, code: false, link: null },
      { text: 'bold', bold: true, code: false, link: null },
      { text: ' b ', bold: false, code: false, link: null },
      { text: 'code', bold: false, code: true, link: null },
      { text: ' c ', bold: false, code: false, link: null },
      { text: 'text', bold: false, code: false, link: 'https://x.test' },
      { text: ' d ', bold: false, code: false, link: null },
      { text: 'https://y.test', bold: false, code: false, link: 'https://y.test' },
    ],
  );
});

test('sanitizeForFont: text a font can already encode passes through unchanged', async () => {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  assert.equal(sanitizeForFont(font, 'ordinary ASCII prose'), 'ordinary ASCII prose');
  assert.equal(sanitizeForFont(font, ''), '');
});

test('sanitizeForFont (#153): a known symbol outside WinAnsi (the arrow "→") is transliterated to a readable ASCII equivalent instead of throwing', async () => {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  // Before the fix, font.widthOfTextAtSize('→', ...) itself throws
  // "WinAnsi cannot encode" — calling sanitizeForFont must never throw, and
  // the result must itself be safely encodable.
  assert.equal(sanitizeForFont(font, 'A → B → C'), 'A -> B -> C');
  assert.doesNotThrow(() => font.widthOfTextAtSize(sanitizeForFont(font, 'A → B → C'), 11));
});

test('sanitizeForFont: an unmapped Unicode character with no ASCII fallback degrades to "?" per character rather than throwing', async () => {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  // U+65E5 ("日") is outside WINANSI_FALLBACKS' table entirely — this is the
  // generic "anything else unencodable" path, not one of the named symbols.
  assert.equal(sanitizeForFont(font, '日'), '?');
  assert.doesNotThrow(() => font.widthOfTextAtSize(sanitizeForFont(font, '日'), 11));
});

// ---------------------------------------------------------------------------
// Integration tests: real PDF structure via pdf-lib
// ---------------------------------------------------------------------------

test('converts the L3 fixture to a PDF (exit 0)', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'mif-to-pdf-'));
  const out = join(tmp, 'out.pdf');
  try {
    const r = runConverter(fixture, out);
    assert.equal(r.status, 0, `expected success, got exit ${r.status}: ${r.stderr}`);
    assert.match(r.stdout, /wrote/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('every source field is recoverable losslessly from mif:rawDocument, and real Dublin Core properties are present', async () => {
  const tmp = mkdtempSync(join(tmpdir(), 'mif-to-pdf-'));
  const out = join(tmp, 'out.pdf');
  try {
    const r = runConverter(fixture, out);
    assert.equal(r.status, 0, r.stderr);

    const source = JSON.parse(readFileSync(fixture, 'utf8'));
    const pdfBytes = readFileSync(out);
    const { doc, xml } = await extractXmpText(pdfBytes);
    const recovered = extractRawDocument(xml);

    assert.deepEqual(recovered, source, 'mif:rawDocument must deep-equal the source JSON-LD');
    for (const key of Object.keys(source)) {
      assert.ok(
        Object.prototype.hasOwnProperty.call(recovered, key),
        `field "${key}" missing from the PDF's embedded metadata`,
      );
    }

    // The XMP tree is not just the raw blob — real, individually-typed
    // properties must be present too (this is what "incomplete metadata"
    // means fixing: a tool that reads dc:title shouldn't have to parse JSON).
    assert.match(xml, /<dc:title>/);
    assert.match(xml, new RegExp(`<rdf:li[^>]*>${source.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}</rdf:li>`));
    assert.match(xml, /<dc:creator>/);
    assert.match(xml, /<dc:subject>/);
    assert.match(xml, /<mif:provenance><rdf:Description>/, 'nested objects must serialize as real RDF structure, not a flat string');
    assert.match(xml, /<mif:citations><rdf:Seq>/, 'arrays must serialize as rdf:Seq, not a flat string');

    // Standard Info dictionary: best-effort mapping, checked separately from
    // the lossless XMP guarantee above.
    assert.equal(doc.getTitle(), source.title);
    assert.equal(doc.getSubject(), source.namespace);
    assert.deepEqual(doc.getKeywords()?.split(' ').filter(Boolean), source.tags);
    assert.equal(doc.getAuthor(), source.entity.name);
    assert.equal(doc.getCreator(), source.provenance.agent);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('renders markdown formatting: real clickable link annotations for both a [text](url) link and an autolink', async () => {
  const tmp = mkdtempSync(join(tmpdir(), 'mif-to-pdf-'));
  const out = join(tmp, 'out.pdf');
  try {
    const r = runConverter(richFixture, out);
    assert.equal(r.status, 0, r.stderr);

    const doc = await PDFDocument.load(readFileSync(out));
    const page = doc.getPage(0);
    const annots = page.node.Annots();
    assert.ok(annots, 'page must carry link annotations for the fixture\'s two links');
    const uris = [];
    for (let i = 0; i < annots.size(); i++) {
      const annot = doc.context.lookup(annots.get(i));
      const action = doc.context.lookup(annot.get(PDFName.of('A')));
      uris.push(doc.context.lookup(action.get(PDFName.of('URI'))).toString());
    }
    assert.ok(uris.some((u) => u.includes('mif-spec.dev')), `expected a mif-spec.dev link annotation, got: ${uris}`);
    assert.ok(
      uris.some((u) => u.includes('github.com/modeled-information-format')),
      `expected the autolink annotation, got: ${uris}`,
    );
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('embeds the referenced SVG figure (regression — figures were previously invisible) and continues text flow after it', async () => {
  const tmp = mkdtempSync(join(tmpdir(), 'mif-to-pdf-'));
  const out = join(tmp, 'out.pdf');
  try {
    const r = runConverter(richFixture, out);
    assert.equal(r.status, 0, r.stderr);

    const doc = await PDFDocument.load(readFileSync(out));
    // The SVG renderer draws real vector fills (one per bar, via pdf-lib's
    // drawRectangle -> moveTo/lineTo.../fill, not the PDF "re" operator) into
    // the page content stream; a page with only text has none, so a
    // meaningful count of standalone "f" (fill) operators is direct evidence
    // the figure was actually drawn, not skipped.
    const page = doc.getPage(0);
    const contentsObj = doc.context.lookup(page.node.get(PDFName.of('Contents')));
    const streamRefs = contentsObj instanceof PDFArray ? contentsObj.asArray() : [contentsObj];
    const text = streamRefs
      .map((ref) => {
        const s = doc.context.lookup(ref);
        let raw = Buffer.from(s.contents);
        try {
          raw = inflateSync(raw); // content streams may be FlateDecode-compressed
        } catch {
          // already-uncompressed stream; use raw bytes as-is
        }
        return raw.toString('latin1');
      })
      .join('\n');
    // Content-stream operators are whitespace-delimited generically (PDF
    // syntax, not a pdf-lib formatting choice) — match on any whitespace,
    // not specifically newlines, so this doesn't depend on pdf-lib emitting
    // one operator per line.
    const fillMatches = [...text.matchAll(/(?:^|\s)f(?:\s|$)/g)];
    assert.ok(fillMatches.length >= 7, `expected at least 7 fill operators (one per bar in the chart, plus background), found ${fillMatches.length}`);

    // "and continues text flow after it" is a distinct claim from "the figure
    // is drawn" — verify it directly: the trailing paragraph's text must
    // actually be drawn, and drawn (by content-stream position) after the
    // figure's last fill operator, not silently dropped or drawn out of order.
    const lastFillIndex = fillMatches[fillMatches.length - 1].index;
    const afterHex = Buffer.from('after', 'latin1').toString('hex');
    const drawnAfterFigure = text.slice(lastFillIndex).match(new RegExp(`<[0-9A-Fa-f]*${afterHex}[0-9A-Fa-f]*> Tj`, 'i'));
    assert.ok(drawnAfterFigure, 'expected the trailing paragraph text ("...after the figure...") to be drawn following the figure\'s fill operators, not dropped or reordered');
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('regression: does not re-embed a duplicate font resource for every word drawn', async () => {
  const tmp = mkdtempSync(join(tmpdir(), 'mif-to-pdf-'));
  const out = join(tmp, 'out.pdf');
  try {
    const r = runConverter(richFixture, out);
    assert.equal(r.status, 0, r.stderr);

    const doc = await PDFDocument.load(readFileSync(out));
    const page = doc.getPage(0);
    const resources = doc.context.lookup(page.node.get(PDFName.of('Resources')));
    const fontDict = doc.context.lookup(resources.get(PDFName.of('Font')));
    const count = [...fontDict.entries()].length;
    // The fixture mixes regular/bold/mono across headings, inline code,
    // list items, a table, and a chart with alternating label/value
    // styling — dozens of genuine style transitions are expected. What is
    // NOT expected is one entry per word drawn (that pattern hit 80+ before
    // the fix, for a document with only 3 distinct fonts).
    assert.ok(count < 50, `expected well under 50 font resources for 3 distinct fonts, found ${count}`);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('regression: naive text extraction (concatenating every drawn string with no added separator) does not smash words/lines together', async () => {
  const tmp = mkdtempSync(join(tmpdir(), 'mif-to-pdf-'));
  const out = join(tmp, 'out.pdf');
  try {
    const r = runConverter(richFixture, out);
    assert.equal(r.status, 0, r.stderr);

    const doc = await PDFDocument.load(readFileSync(out));
    // Simulate the class of consumer that broke before this fix: copy-paste
    // in most PDF viewers, pdftotext without -layout, screen readers, and
    // most real-world PDF-to-text pipelines all read Tj-shown content in
    // stream order with no geometric reconstruction — `pdftotext -layout`
    // (used elsewhere in this suite's manual verification) reconstructs
    // spacing from X/Y deltas and had been hiding this defect entirely.
    const naive = rawDecodedTextTokens(doc, 0).join('');
    assert.doesNotMatch(
      naive,
      /mif-to-pdfrich|rich-renderingfixture|fixtureSection|SectionOne/,
      `expected real separators between distinct words/lines in naive extraction, got smashed-together text: ${JSON.stringify(naive.slice(0, 120))}`,
    );
    assert.match(naive, /mif-to-pdf rich-rendering fixture/, 'expected the title words to still read correctly with real spaces');
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('regression: naive extraction preserves line boundaries in code blocks and row boundaries in tables (#142)', async () => {
  const tmp = mkdtempSync(join(tmpdir(), 'mif-to-pdf-'));
  const input = join(tmp, 'doc.json');
  const out = join(tmp, 'out.pdf');
  writeFileSync(
    input,
    JSON.stringify({
      '@id': 'urn:mif:concept:test:line-boundaries',
      conceptType: 'semantic',
      created: '2026-07-16T12:00:00Z',
      title: 'Line boundary fixture',
      content: [
        '# Line boundary fixture',
        '',
        '```js',
        'firstCodeLine();',
        'secondCodeLine();',
        'thirdCodeLine();',
        '```',
        '',
        '| Name | Share |',
        '| --- | --- |',
        '| AlphaRow | 22% |',
        '| BetaRow | 18% |',
      ].join('\n'),
    }),
  );
  try {
    const r = runConverter(input, out);
    assert.equal(r.status, 0, r.stderr);
    const doc = await PDFDocument.load(readFileSync(out));
    // The same consumer class as the smashed-words regression above: shown
    // strings concatenated in content-stream order, no geometric
    // reconstruction. drawLineBreak's invisible `<0A> Tj` markers are what
    // put real newlines into this view — pdf-lib's drawText itself discards
    // any `\n` before it reaches the shown content.
    const naive = rawDecodedTextTokens(doc, 0).join('');
    const lines = naive.split('\n').map((l) => l.trim());

    // (a) a 3-line fenced code block extracts as 3 distinguishable lines
    for (const expected of ['firstCodeLine();', 'secondCodeLine();', 'thirdCodeLine();']) {
      assert.ok(
        lines.includes(expected),
        `expected ${JSON.stringify(expected)} to be its own naive-extracted line, got lines: ${JSON.stringify(lines)}`,
      );
    }

    // (b) table rows are separable: no naive-extracted line carries two rows
    const alphaLine = lines.find((l) => l.includes('AlphaRow'));
    const betaLine = lines.find((l) => l.includes('BetaRow'));
    assert.ok(alphaLine && betaLine, `expected both table data rows in naive extraction, got lines: ${JSON.stringify(lines)}`);
    assert.notEqual(alphaLine, betaLine, 'expected the two table rows on distinct naive-extracted lines');
    assert.ok(!alphaLine.includes('BetaRow'), `expected a row boundary between table rows, got: ${JSON.stringify(alphaLine)}`);
    assert.equal(alphaLine, 'AlphaRow 22%', 'expected the row to read as its own cells, space-separated');
    assert.equal(betaLine, 'BetaRow 18%', 'expected the row to read as its own cells, space-separated');
    // header row separable from data rows too
    const headerLine = lines.find((l) => l.includes('Name') && l.includes('Share'));
    assert.ok(headerLine && !headerLine.includes('AlphaRow'), `expected the header row on its own line, got: ${JSON.stringify(headerLine)}`);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('regression: no duplicate title when the body opens with an H1 matching the frontmatter title', async () => {
  const tmp = mkdtempSync(join(tmpdir(), 'mif-to-pdf-'));
  const input = join(tmp, 'doc.json');
  const out = join(tmp, 'out.pdf');
  const title = 'Zzyzxtitle: Corp Business Plan';
  writeFileSync(
    input,
    JSON.stringify({
      '@id': 'urn:mif:concept:test:title-dedup',
      conceptType: 'semantic',
      created: '2026-07-15T12:00:00Z',
      title,
      content: `# ${title}\n\nBody text follows without repeating the heading.`,
    }),
  );
  try {
    const r = runConverter(input, out);
    assert.equal(r.status, 0, r.stderr);
    const doc = await PDFDocument.load(readFileSync(out));
    const tokens = decodedTextTokens(doc, 0);
    const occurrences = tokens.filter((t) => t === 'Zzyzxtitle:').length;
    assert.equal(
      occurrences,
      1,
      `expected the title's distinctive first word to be drawn exactly once (main() must not draw a synthetic title AND the body's own matching H1), found ${occurrences}`,
    );
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('an unrelated leading H1 does not suppress the frontmatter title', async () => {
  const tmp = mkdtempSync(join(tmpdir(), 'mif-to-pdf-'));
  const out = join(tmp, 'out.pdf');
  try {
    const r = runConverter(richFixture, out);
    assert.equal(r.status, 0, r.stderr);
    const doc = await PDFDocument.load(readFileSync(out));
    const tokens = decodedTextTokens(doc, 0);
    assert.ok(
      tokens.includes('mif-to-pdf'),
      'expected the frontmatter title to still be drawn since the body\'s first H1 ("Section One") is unrelated to it',
    );
    assert.ok(tokens.includes('Section'), "expected the body's own leading heading to also be drawn");
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('regression: a short/acronym title that happens to be a substring of an unrelated leading H1 is not silently dropped', async () => {
  const tmp = mkdtempSync(join(tmpdir(), 'mif-to-pdf-'));
  const input = join(tmp, 'doc.json');
  const out = join(tmp, 'out.pdf');
  // "api" is a literal substring of "Rapid Deployment" — a plain substring
  // match in either direction (the first version of the title-dedup fix)
  // treated this as "the body already restates the title" and never drew
  // the real title anywhere in the PDF.
  writeFileSync(
    input,
    JSON.stringify({
      '@id': 'urn:mif:concept:test:short-title-collision',
      conceptType: 'semantic',
      created: '2026-07-15T12:00:00Z',
      title: 'API',
      content: '# Rapid Deployment\n\nThis section covers shipping builds, unrelated to interfaces.',
    }),
  );
  try {
    const r = runConverter(input, out);
    assert.equal(r.status, 0, r.stderr);
    const doc = await PDFDocument.load(readFileSync(out));
    const tokens = decodedTextTokens(doc, 0);
    assert.ok(tokens.includes('API'), 'expected the real title "API" to still be drawn, not silently dropped');
    assert.ok(tokens.includes('Rapid'), "expected the body's own unrelated leading heading to also be drawn");
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('regression: an ordinary prose prefix before a colon does not falsely count as a genre-ID restatement of the title', async () => {
  const tmp = mkdtempSync(join(tmpdir(), 'mif-to-pdf-'));
  const input = join(tmp, 'doc.json');
  const out = join(tmp, 'out.pdf');
  // "Note: API" ends with ": <title>" the same shape as a real genre-ID
  // prefix ("ADR-0007: <title>"), but "Note" is ordinary prose, not a
  // genre ID — a looser "<any prefix>: <title>" heuristic (the second
  // version of the title-dedup fix) still wrongly treated this as the
  // body restating the title and dropped it.
  writeFileSync(
    input,
    JSON.stringify({
      '@id': 'urn:mif:concept:test:prose-prefix-collision',
      conceptType: 'semantic',
      created: '2026-07-15T12:00:00Z',
      title: 'API',
      content: '# Note: API\n\nThis heading is an unrelated aside, not a restatement of the title.',
    }),
  );
  try {
    const r = runConverter(input, out);
    assert.equal(r.status, 0, r.stderr);
    const doc = await PDFDocument.load(readFileSync(out));
    const tokens = decodedTextTokens(doc, 0);
    // "API" is drawn twice on a correct output: once as the standalone
    // synthetic title, once as the second word of the body's own "Note:
    // API" heading — zero occurrences would mean the title was dropped.
    assert.equal(
      tokens.filter((t) => t === 'API').length,
      2,
      'expected the real title "API" to be drawn as its own heading in addition to appearing inside the unrelated body heading',
    );
    assert.ok(tokens.includes('Note:'), "expected the body's own unrelated leading heading to also be drawn");
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('regression: a fenced code block (e.g. Python) renders as legible line-preserving monospace text, not a single flattened paragraph with literal ``` markers', async () => {
  const tmp = mkdtempSync(join(tmpdir(), 'mif-to-pdf-'));
  const input = join(tmp, 'doc.json');
  const out = join(tmp, 'out.pdf');
  writeFileSync(
    input,
    JSON.stringify({
      '@id': 'urn:mif:concept:test:codeblock',
      conceptType: 'semantic',
      created: '2026-07-15T12:00:00Z',
      title: 'Codeblock fixture',
      content: ['# Codeblock fixture', '', '```python', 'def cost(alpha):', '    return alpha * 10', '```'].join('\n'),
    }),
  );
  try {
    const r = runConverter(input, out);
    assert.equal(r.status, 0, r.stderr);
    const doc = await PDFDocument.load(readFileSync(out));
    const tokens = decodedTextTokens(doc, 0);
    assert.ok(
      !tokens.some((t) => t.includes('```')),
      'the literal ``` fence markers must never be drawn as visible text',
    );
    assert.ok(
      tokens.includes('def cost(alpha):'),
      "expected the code line to be drawn whole (line-preserving), not word-flattened into surrounding paragraph text",
    );
    assert.ok(
      tokens.includes('    return alpha * 10'),
      "expected the indented code line's internal whitespace to be preserved exactly",
    );
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

// A ```mermaid fence is the one language that does NOT follow the
// legible-text path above — see drawMermaidBlock in mif-to-pdf.mjs. These
// tests spawn the real converter (not a mock), which launches a real
// headless Chromium via Puppeteer to render the diagram — slower than the
// rest of this suite, but a mocked renderer would not have caught the real
// defect this feature already went through (see
// mermaidConfig.quadrantChart.chartWidth in mif-to-pdf.mjs, and the
// dedicated regression test for it below): it was only visible in actual
// rendered pixel output, and the exact pixel dimensions matter.
function pageHasEmbeddedImage(doc, pageIndex) {
  const page = doc.getPage(pageIndex);
  const resources = doc.context.lookup(page.node.get(PDFName.of('Resources')));
  const xObjectDict = resources && doc.context.lookup(resources.get(PDFName.of('XObject')));
  if (!xObjectDict) return false;
  return xObjectDict.keys().some((key) => {
    const xObject = doc.context.lookup(xObjectDict.get(key));
    return xObject?.dict?.get(PDFName.of('Subtype'))?.toString() === '/Image';
  });
}

// Returns the pixel width of the first embedded image XObject on the page,
// or null if none. Used by the quadrantChart regression test below: Mermaid
// renders a quadrantChart at a default internal width of a few hundred
// pixels (too narrow for a long quadrant label, which does not wrap — see
// mermaidConfig.quadrantChart.chartWidth in mif-to-pdf.mjs), so a
// sufficiently wide embedded image is a reliable, mockable-only-by-actually-
// rendering signal that the widening config is still being honored.
function embeddedImageWidth(doc, pageIndex) {
  const page = doc.getPage(pageIndex);
  const resources = doc.context.lookup(page.node.get(PDFName.of('Resources')));
  const xObjectDict = resources && doc.context.lookup(resources.get(PDFName.of('XObject')));
  if (!xObjectDict) return null;
  for (const key of xObjectDict.keys()) {
    const xObject = doc.context.lookup(xObjectDict.get(key));
    if (xObject?.dict?.get(PDFName.of('Subtype'))?.toString() === '/Image') {
      return xObject.dict.get(PDFName.of('Width'))?.asNumber() ?? null;
    }
  }
  return null;
}

test('regression: a ```mermaid fence renders as a real embedded diagram image, not literal source text', async () => {
  const tmp = mkdtempSync(join(tmpdir(), 'mif-to-pdf-'));
  const input = join(tmp, 'doc.json');
  const out = join(tmp, 'out.pdf');
  writeFileSync(
    input,
    JSON.stringify({
      '@id': 'urn:mif:concept:test:mermaid-graphic',
      conceptType: 'semantic',
      created: '2026-07-16T12:00:00Z',
      title: 'Mermaid graphic fixture',
      content: ['# Mermaid graphic fixture', '', '```mermaid', 'pie title Cost', '    "Alpha" : 10', '    "Beta" : 20', '```'].join(
        '\n',
      ),
    }),
  );
  try {
    const r = runConverter(input, out);
    assert.equal(r.status, 0, r.stderr);
    const doc = await PDFDocument.load(readFileSync(out));
    assert.ok(
      pageHasEmbeddedImage(doc, 0),
      'expected the mermaid diagram to be embedded as a real PDF image XObject',
    );
    const tokens = decodedTextTokens(doc, 0);
    assert.ok(
      !tokens.some((t) => t.includes('pie title') || t.includes('```')),
      'the mermaid source text must not also be drawn as literal text once it renders as an image',
    );
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('regression: a quadrantChart with a long quadrant label renders at a widened chart size, not Mermaid\'s narrow default (which clips long labels mid-word since quadrantChart does not wrap them)', async () => {
  const tmp = mkdtempSync(join(tmpdir(), 'mif-to-pdf-'));
  const input = join(tmp, 'doc.json');
  const out = join(tmp, 'out.pdf');
  const longLabelDefinition = [
    'quadrantChart',
    '    title Positioning',
    '    x-axis Low --> High',
    '    y-axis Low --> High',
    '    quadrant-1 Target position - dual-use and self-sufficient',
    '    quadrant-2 Guest-only and self-sufficient',
    '    quadrant-3 Guest-only and utility-offloading',
    '    quadrant-4 Housing-only with no rental',
  ].join('\n');
  writeFileSync(
    input,
    JSON.stringify({
      '@id': 'urn:mif:concept:test:mermaid-quadrant-width',
      conceptType: 'semantic',
      created: '2026-07-16T12:00:00Z',
      title: 'Quadrant width fixture',
      content: ['# Quadrant width fixture', '', '```mermaid', longLabelDefinition, '```'].join('\n'),
    }),
  );
  try {
    const r = runConverter(input, out);
    assert.equal(r.status, 0, r.stderr);
    const doc = await PDFDocument.load(readFileSync(out));
    const width = embeddedImageWidth(doc, 0);
    assert.ok(width !== null, 'expected the quadrantChart to render as an embedded image');
    // Mermaid's own quadrantChart default width is a few hundred pixels —
    // nowhere near enough for a 48-character quadrant label, which the
    // chart does not wrap. mif-to-pdf.mjs's mermaidConfig.quadrantChart.
    // chartWidth widens this explicitly; this threshold is comfortably
    // below the configured 900 (at deviceScaleFactor 2, ~1800px) but well
    // above what the unconfigured default could ever produce, so this
    // fails if that config is ever removed or shrunk back down.
    assert.ok(
      width >= 1200,
      `expected the widened quadrantChart config to be honored (image width ${width}px, expected >= 1200px)`,
    );
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('regression: a ```mermaid fence with invalid diagram syntax falls back to legible source text instead of crashing the whole conversion', async () => {
  const tmp = mkdtempSync(join(tmpdir(), 'mif-to-pdf-'));
  const input = join(tmp, 'doc.json');
  const out = join(tmp, 'out.pdf');
  writeFileSync(
    input,
    JSON.stringify({
      '@id': 'urn:mif:concept:test:mermaid-fallback',
      conceptType: 'semantic',
      created: '2026-07-16T12:00:00Z',
      title: 'Mermaid fallback fixture',
      content: ['# Mermaid fallback fixture', '', '```mermaid', 'this is not valid mermaid syntax at all', '```'].join('\n'),
    }),
  );
  try {
    const r = runConverter(input, out);
    assert.equal(r.status, 0, r.stderr);
    const doc = await PDFDocument.load(readFileSync(out));
    const tokens = decodedTextTokens(doc, 0);
    assert.ok(
      tokens.includes('this is not valid mermaid syntax at all'),
      'expected the unrenderable mermaid source to fall back to legible literal text rather than being silently dropped',
    );
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('regression: a blockquote renders without leaking its literal > marker as visible text', async () => {
  const tmp = mkdtempSync(join(tmpdir(), 'mif-to-pdf-'));
  const input = join(tmp, 'doc.json');
  const out = join(tmp, 'out.pdf');
  writeFileSync(
    input,
    JSON.stringify({
      '@id': 'urn:mif:concept:test:blockquote',
      conceptType: 'semantic',
      created: '2026-07-15T12:00:00Z',
      title: 'Blockquote fixture',
      content: ['# Blockquote fixture', '', '> Zzyzxquote note text.'].join('\n'),
    }),
  );
  try {
    const r = runConverter(input, out);
    assert.equal(r.status, 0, r.stderr);
    const doc = await PDFDocument.load(readFileSync(out));
    const tokens = decodedTextTokens(doc, 0);
    assert.ok(
      !tokens.some((t) => t.includes('>')),
      'the literal > blockquote marker must never be drawn as visible text',
    );
    assert.ok(tokens.includes('Zzyzxquote'), "expected the blockquote's own text to still be drawn");
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('regression (#154): a long inline code span in a table cell wraps within its column instead of overprinting the next column', async () => {
  const tmp = mkdtempSync(join(tmpdir(), 'mif-to-pdf-'));
  const input = join(tmp, 'doc.json');
  const out = join(tmp, 'out.pdf');
  const identifier = 'research-add-dimensions-workflow-configuration.js';
  writeFileSync(
    input,
    JSON.stringify({
      '@id': 'urn:mif:concept:test:codespan-table-overflow',
      conceptType: 'semantic',
      created: '2026-07-18T12:00:00Z',
      title: 'Codespan table overflow fixture',
      content: [
        '# Codespan table overflow fixture',
        '',
        '| Script | Purpose |',
        '| --- | --- |',
        `| \`${identifier}\` | Widen the dimension set |`,
        '| plain | text cell |',
      ].join('\n'),
    }),
  );
  try {
    const r = runConverter(input, out);
    assert.equal(r.status, 0, r.stderr);
    const doc = await PDFDocument.load(readFileSync(out));

    // (a) the identifier is no longer drawn as one unbroken Tj token —
    // proves the character-break fallback actually fired, not just that
    // the page happens to render without error.
    const tokens = decodedTextTokens(doc, 0);
    assert.ok(
      !tokens.includes(identifier),
      `expected the long code span to be broken across multiple drawn tokens, not drawn whole; tokens: ${JSON.stringify(tokens)}`,
    );

    // (b) the pieces that make it up, read back in content-stream order,
    // reconstruct the original identifier exactly — nothing dropped or
    // duplicated by the break. Scoped to column 0's own x-position (58) so
    // an incidental substring match in column 1's unrelated prose (e.g.
    // "dimension" also occurring inside the identifier) can't corrupt the
    // reconstruction.
    const positions = textPositions(doc, 0);
    const COL0_X = 58; // MARGIN(54) + cellPad(4)
    const COL1_X = 310; // MARGIN(54) + colWidth(252) + cellPad(4), numCols=2
    const CELL_SIZE = 10; // BODY_SIZE(11) - 1
    // Column 0 also draws "Script" (header) and "plain" (the other data
    // row) at this same x — scope down to the tokens that are actually
    // pieces of the identifier (neither of those is a substring of it).
    const trim = (t) => (t.endsWith(' ') ? t.slice(0, -1) : t);
    const identifierTokens = positions.filter((p) => p.x === COL0_X && identifier.includes(trim(p.text)));
    assert.ok(
      identifierTokens.length >= 2,
      `expected the identifier split across >=2 column-0 tokens, got ${identifierTokens.length}: ${JSON.stringify(identifierTokens.map((p) => p.text))}`,
    );
    assert.equal(
      identifierTokens.map((p) => trim(p.text)).join(''),
      identifier,
      `expected the split pieces to reconstruct the identifier exactly, got: ${JSON.stringify(identifierTokens.map((p) => p.text))}`,
    );

    // (c) the direct regression check: no column-0 token's drawn extent
    // (x + rendered width, using the same Courier metrics the renderer
    // itself uses for code spans, on the logical text with the
    // naive-extraction trailing space trimmed — see decodedTextTokens'
    // own comment on why that space isn't part of the real content) crosses
    // into column 1 — this is what "overprints the neighboring column"
    // means concretely, and is false before the fix (the whole identifier
    // was one token drawn at full width from x=58, ending far past column
    // 1's start at x=310).
    const helper = await PDFDocument.create();
    const mono = await helper.embedFont(StandardFonts.Courier);
    for (const p of identifierTokens) {
      const w = mono.widthOfTextAtSize(trim(p.text), CELL_SIZE);
      assert.ok(
        p.x + w <= COL1_X,
        `expected column-0 text ${JSON.stringify(p.text)} at x=${p.x} to stay within the column (end=${p.x + w} must be <= ${COL1_X})`,
      );
    }

    // (d) the neighboring column's own text is unshifted and intact —
    // column 0 wrapping to multiple lines must not displace column 1.
    const wide = positions.find((p) => (p.text.endsWith(' ') ? p.text.slice(0, -1) : p.text) === 'Widen');
    assert.ok(wide, 'expected "Widen" (column 1 of the same row) to still be drawn');
    assert.equal(wide.x, COL1_X, `expected column 1's text to start at its usual x=${COL1_X}, unshifted by column 0's wrapping`);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('regression (#154): the shared wrapTokens fix also covers a paragraph with a long unbreakable link token, not just table cells', async () => {
  const tmp = mkdtempSync(join(tmpdir(), 'mif-to-pdf-'));
  const input = join(tmp, 'doc.json');
  const out = join(tmp, 'out.pdf');
  // 120 chars, no whitespace — a single autolink token wider than MAX_WIDTH
  // (504pt) at Helvetica 11pt (~610pt), the same "one oversized token" shape
  // as the table-cell case, just via drawParagraphRuns instead of drawTable.
  const url = 'https://example.com/reports/architecture/deep-dive-on-the-wrap-tokens-engine-shared-by-tables-paragraphs-and-blockquotes';
  writeFileSync(
    input,
    JSON.stringify({
      '@id': 'urn:mif:concept:test:paragraph-long-link',
      conceptType: 'semantic',
      created: '2026-07-18T12:00:00Z',
      title: 'Paragraph long link fixture',
      content: ['# Paragraph long link fixture', '', `See <${url}> for details.`].join('\n'),
    }),
  );
  try {
    const r = runConverter(input, out);
    assert.equal(r.status, 0, r.stderr);
    const doc = await PDFDocument.load(readFileSync(out));

    const tokens = decodedTextTokens(doc, 0);
    // Deliberately not `tokens.includes(url)` — CodeQL's
    // incomplete-url-substring-sanitization query pattern-matches any
    // `.includes()` call against a URL-shaped string, regardless of
    // receiver type; `.some((t) => t === url)` is the same exact-membership
    // check on this array without tripping that (here, correctly
    // inapplicable) heuristic.
    const drawnWhole = tokens.some((t) => t === url);
    assert.ok(
      !drawnWhole,
      `expected the long link token to be broken across multiple drawn tokens, not drawn whole; tokens: ${JSON.stringify(tokens)}`,
    );

    const positions = textPositions(doc, 0);
    const helper = await PDFDocument.create();
    const regular = await helper.embedFont(StandardFonts.Helvetica);
    const MAX_X = MARGIN + MAX_WIDTH_FOR_TEST;
    const BODY_SIZE = 11;
    const trim = (t) => (t.endsWith(' ') ? t.slice(0, -1) : t);
    // Scoped to the tokens that are actually pieces of the split URL (not
    // every drawn token on the page, e.g. the heading, which is a
    // different font/size this check doesn't model) — these are exactly
    // the ones exercising the character-split fallback under test.
    const urlPieces = positions.filter((p) => {
      const t = trim(p.text);
      return t.length > 3 && url.includes(t);
    });
    assert.ok(urlPieces.length >= 2, `expected the link split across >=2 drawn tokens, got ${urlPieces.length}: ${JSON.stringify(urlPieces.map((p) => p.text))}`);
    assert.equal(
      urlPieces.map((p) => trim(p.text)).join(''),
      url,
      `expected the split pieces to reconstruct the link exactly, got: ${JSON.stringify(urlPieces.map((p) => p.text))}`,
    );
    for (const p of urlPieces) {
      const w = regular.widthOfTextAtSize(trim(p.text), BODY_SIZE);
      assert.ok(
        p.x + w <= MAX_X,
        `expected drawn text ${JSON.stringify(p.text)} at x=${p.x} to stay within the page's text width (end=${p.x + w} must be <= ${MAX_X})`,
      );
    }
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('regression (#154): a table row with a wrapped multi-line cell grows to fit it instead of clipping or overprinting', async () => {
  const tmp = mkdtempSync(join(tmpdir(), 'mif-to-pdf-'));
  const input = join(tmp, 'doc.json');
  const out = join(tmp, 'out.pdf');
  const identifier = 'research-add-dimensions-workflow-configuration.js';
  writeFileSync(
    input,
    JSON.stringify({
      '@id': 'urn:mif:concept:test:table-row-height',
      conceptType: 'semantic',
      created: '2026-07-18T12:00:00Z',
      title: 'Table row height fixture',
      content: [
        '# Table row height fixture',
        '',
        '| Script | Purpose |',
        '| --- | --- |',
        `| \`${identifier}\` | Widen the dimension set |`,
        '| plain | text cell |',
      ].join('\n'),
    }),
  );
  try {
    const r = runConverter(input, out);
    assert.equal(r.status, 0, r.stderr);
    const doc = await PDFDocument.load(readFileSync(out));

    // drawTable draws exactly one horizontal separator per row, at
    // y = rowTop - rowHeight; consecutive separator y-values are therefore
    // consecutive rows' bottom edges, so the gap between them is that row's
    // real, rendered height — computed from the PDF itself, not by
    // re-deriving drawTable's own rowHeight formula.
    const ys = horizontalLineYs(doc, 0);
    assert.equal(ys.length, 3, `expected one separator per table row (header + 2 data rows), got ${ys.length}: ${JSON.stringify(ys)}`);
    const [headerBottom, codespanRowBottom, plainRowBottom] = ys;
    const codespanRowHeight = headerBottom - codespanRowBottom;
    const plainRowHeight = codespanRowBottom - plainRowBottom;

    const CELL_SIZE = 10; // BODY_SIZE(11) - 1
    const CELL_PAD = 4;
    const singleLineHeight = 1 * (CELL_SIZE + 4) + CELL_PAD * 2; // 22
    const twoLineHeight = 2 * (CELL_SIZE + 4) + CELL_PAD * 2; // 36

    assert.equal(plainRowHeight, singleLineHeight, `expected the plain single-line row to use the 1-line row height (${singleLineHeight})`);
    assert.equal(
      codespanRowHeight,
      twoLineHeight,
      `expected the row with the wrapped 2-line code-span cell to grow to the 2-line row height (${twoLineHeight}), not stay clipped at the 1-line height`,
    );
    assert.ok(
      codespanRowHeight > plainRowHeight,
      `expected the multi-line cell's row to be taller than a plain single-line row (${codespanRowHeight} vs ${plainRowHeight})`,
    );
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('regression (#153): a paragraph containing an arrow (U+2192, outside WinAnsi) converts successfully instead of crashing the whole render', async () => {
  const tmp = mkdtempSync(join(tmpdir(), 'mif-to-pdf-'));
  const input = join(tmp, 'doc.json');
  const out = join(tmp, 'out.pdf');
  writeFileSync(
    input,
    JSON.stringify({
      '@id': 'urn:mif:concept:test:winansi-arrow',
      conceptType: 'semantic',
      created: '2026-07-18T12:00:00Z',
      title: 'WinAnsi arrow fixture',
      content: ['# WinAnsi arrow fixture', '', 'A pipeline described as A → B → C.'].join('\n'),
    }),
  );
  try {
    const r = runConverter(input, out);
    // Before the fix this exited 1 with an unhandled "WinAnsi cannot encode"
    // exception from pdf-lib's Encoding.js and wrote no PDF at all.
    assert.equal(r.status, 0, `expected success, got exit ${r.status}: ${r.stderr}`);
    const doc = await PDFDocument.load(readFileSync(out));
    const tokens = decodedTextTokens(doc, 0);
    // The arrow is transliterated to "->" (see WINANSI_FALLBACKS), not
    // silently dropped — the surrounding prose must still read correctly.
    assert.ok(
      tokens.some((t) => t.includes('->')),
      `expected the unencodable arrow to be transliterated to "->" in the drawn text, got tokens: ${JSON.stringify(tokens)}`,
    );
    assert.ok(tokens.includes('pipeline'), 'expected the rest of the paragraph to still be drawn');
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('regression (#153): a fenced code block containing an unencodable character converts successfully, preserving surrounding line-preserving formatting', async () => {
  const tmp = mkdtempSync(join(tmpdir(), 'mif-to-pdf-'));
  const input = join(tmp, 'doc.json');
  const out = join(tmp, 'out.pdf');
  writeFileSync(
    input,
    JSON.stringify({
      '@id': 'urn:mif:concept:test:winansi-arrow-codeblock',
      conceptType: 'semantic',
      created: '2026-07-18T12:00:00Z',
      title: 'WinAnsi arrow codeblock fixture',
      content: ['# WinAnsi arrow codeblock fixture', '', '```', 'input → transform → output', '```'].join('\n'),
    }),
  );
  try {
    const r = runConverter(input, out);
    assert.equal(r.status, 0, `expected success, got exit ${r.status}: ${r.stderr}`);
    const doc = await PDFDocument.load(readFileSync(out));
    const tokens = decodedTextTokens(doc, 0);
    assert.ok(
      tokens.includes('input -> transform -> output'),
      `expected the code line to draw whole with the arrow transliterated, got tokens: ${JSON.stringify(tokens)}`,
    );
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('regression (#153): a character with no known ASCII fallback (outside WINANSI_FALLBACKS entirely) still converts successfully', async () => {
  const tmp = mkdtempSync(join(tmpdir(), 'mif-to-pdf-'));
  const input = join(tmp, 'doc.json');
  const out = join(tmp, 'out.pdf');
  writeFileSync(
    input,
    JSON.stringify({
      '@id': 'urn:mif:concept:test:winansi-unmapped-char',
      conceptType: 'semantic',
      created: '2026-07-18T12:00:00Z',
      title: 'WinAnsi unmapped character fixture',
      // U+65E5 has no entry in WINANSI_FALLBACKS — exercises the generic
      // per-character "?" degradation path, not a named symbol mapping.
      content: ['# WinAnsi unmapped character fixture', '', 'Unsupported glyph: 日 stays readable around it.'].join('\n'),
    }),
  );
  try {
    const r = runConverter(input, out);
    assert.equal(r.status, 0, `expected success, got exit ${r.status}: ${r.stderr}`);
    const doc = await PDFDocument.load(readFileSync(out));
    const tokens = decodedTextTokens(doc, 0);
    assert.ok(tokens.includes('glyph:'), 'expected the surrounding prose to still be drawn');
    assert.ok(tokens.includes('readable'), 'expected the prose after the unencodable character to still be drawn');
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('rejects input missing a required MIF L1 field instead of producing a garbage PDF', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'mif-to-pdf-'));
  const badInput = join(tmp, 'not-mif.json');
  const out = join(tmp, 'out.pdf');
  writeFileSync(badInput, JSON.stringify({ hello: 'world' }));
  try {
    const r = runConverter(badInput, out);
    assert.equal(r.status, 1, 'non-MIF input must be rejected, not silently converted');
    assert.match(r.stderr, /missing a required MIF L1 field/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});
