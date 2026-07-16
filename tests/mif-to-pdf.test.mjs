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
import { PDFDocument, PDFName, PDFArray } from 'pdf-lib';
import { parseBlocks, parseInline } from '../scripts/mif-to-pdf.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const converter = join(root, 'scripts', 'mif-to-pdf.mjs');
const fixture = join(root, 'tests', 'fixtures', 'mif-to-pdf-l3.json');
const richFixture = join(root, 'tests', 'fixtures', 'mif-to-pdf-rich.json');

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
