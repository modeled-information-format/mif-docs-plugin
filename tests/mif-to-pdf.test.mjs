// Acceptance tests for scripts/mif-to-pdf.mjs — proves the metadata-fidelity
// contract Task #128 requires: every field of the source MIF JSON-LD fixture
// must be recoverable from the produced PDF's own metadata, not just
// referenced in the rendered body.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { PDFDocument, PDFName } from 'pdf-lib';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const converter = join(root, 'scripts', 'mif-to-pdf.mjs');
const fixture = join(root, 'tests', 'fixtures', 'mif-to-pdf-l3.json');

function runConverter(input, output) {
  return spawnSync('node', [converter, input, '--output', output], { encoding: 'utf8' });
}

async function extractXmpDocument(pdfBytes) {
  const doc = await PDFDocument.load(pdfBytes);
  const streamRef = doc.catalog.get(PDFName.of('Metadata'));
  assert.ok(streamRef, 'catalog must carry a /Metadata entry');
  const stream = doc.context.lookup(streamRef);
  const xml = new TextDecoder().decode(stream.contents);
  const m = xml.match(/<mif:document>([\s\S]*?)<\/mif:document>/);
  assert.ok(m, 'XMP packet must carry a mif:document element');
  const unescaped = m[1].replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  return { doc, jsonld: JSON.parse(unescaped) };
}

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

test('every source frontmatter field is recoverable from the PDF metadata (no field silently dropped)', async () => {
  const tmp = mkdtempSync(join(tmpdir(), 'mif-to-pdf-'));
  const out = join(tmp, 'out.pdf');
  try {
    const r = runConverter(fixture, out);
    assert.equal(r.status, 0, r.stderr);

    const source = JSON.parse(readFileSync(fixture, 'utf8'));
    const pdfBytes = readFileSync(out);
    const { doc, jsonld: recovered } = await extractXmpDocument(pdfBytes);

    // The custom XMP packet must carry the ENTIRE source document losslessly.
    assert.deepEqual(recovered, source, 'XMP-embedded document must deep-equal the source JSON-LD');

    // Spot-check every top-level key individually too, so a future change
    // that narrows the XMP payload (rather than dropping it wholesale) still
    // fails loudly on the specific missing field.
    for (const key of Object.keys(source)) {
      assert.ok(
        Object.prototype.hasOwnProperty.call(recovered, key),
        `field "${key}" missing from the PDF's embedded metadata`,
      );
    }

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
