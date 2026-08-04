// Unit tests for the shared corpus definition (scripts/lib/corpus.mjs).
//
// This module exists to prevent mif-docs-plugin#32-style drift: ci.yml,
// release.yml, and engine-parity.mjs all consume it instead of keeping
// independent glob lists that can silently disagree. These tests prove the
// invariants each of those three used to hand-roll and rely on: the ADR
// carve-out, the fail-closed guard on a missing/empty L3 tree, and that the
// combined corpus is exactly the union of its parts.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { readFileSync, globSync } from 'node:fs';
import {
  listTemplates,
  listL3Docs,
  listL2Docs,
  listGatedDocs,
  listAdrDocs,
  ADR_TEMPLATE_CARVEOUT,
  L3_DIRS,
} from '../scripts/lib/corpus.mjs';
import { splitFrontmatter, isAdrCarveout } from '../scripts/lib/mif-genre-signal.mjs';

test('listTemplates excludes the ADR carve-out', () => {
  const templates = listTemplates();
  assert.ok(templates.length > 0, 'expected at least one genre template');
  assert.ok(!templates.includes(ADR_TEMPLATE_CARVEOUT), 'ADR template must be carved out');
});

test('listL3Docs covers every configured L3 tree', () => {
  const files = listL3Docs();
  assert.ok(files.length > 0, 'expected at least one L3 doc');
  for (const dir of L3_DIRS) {
    // docs/adr holds only type: adr documents, which the content-based ADR
    // carve-out (issue #203) routes to the adr-smadr job instead.
    if (dir === 'docs/adr') continue;
    assert.ok(files.some((f) => f.startsWith(`${dir}/`)), `expected at least one file under ${dir}`);
  }
});

test('listL3Docs recurses into subdirectories (the #32 regression)', () => {
  const files = listL3Docs();
  assert.ok(
    files.some((f) => f.startsWith('docs/reference/skills/')),
    'a file nested under docs/reference/skills/ must be caught by the recursive glob',
  );
});

test('listL2Docs includes the changelog', () => {
  assert.ok(listL2Docs().includes('CHANGELOG.md'));
});

test('listGatedDocs is exactly the union of templates + L3 + L2', () => {
  const gated = new Set(listGatedDocs());
  const union = new Set([...listTemplates(), ...listL3Docs(), ...listL2Docs()]);
  assert.equal(gated.size, union.size);
  for (const f of union) assert.ok(gated.has(f), `${f} missing from listGatedDocs()`);
});

test('listL3Docs fails closed when an L3 directory is missing', () => {
  // Exercise the guard in isolation, in a scratch cwd with only 4 of the 5
  // configured L3 trees present, so a renamed/deleted tree can never
  // silently resolve to a smaller-but-still-truthy corpus.
  const scratch = mkdtempSync(join(tmpdir(), 'mif-corpus-test-'));
  const missing = L3_DIRS[0];
  for (const dir of L3_DIRS) {
    if (dir === missing) continue;
    mkdirSync(join(scratch, dir), { recursive: true });
    writeFileSync(join(scratch, dir, 'x.md'), '# x\n');
  }
  const originalCwd = process.cwd();
  process.chdir(scratch);
  try {
    assert.throws(() => listL3Docs(), /L3 doc directory missing/);
  } finally {
    process.chdir(originalCwd);
    rmSync(scratch, { recursive: true, force: true });
  }
});

test('listL3Docs fails closed when an L3 tree is a file, not a directory', () => {
  // A tree replaced by a same-named regular file must not silently resolve
  // to "zero files here" -- it must be caught the same way a missing
  // directory is.
  const scratch = mkdtempSync(join(tmpdir(), 'mif-corpus-test-'));
  const bogus = L3_DIRS[0];
  for (const dir of L3_DIRS) {
    if (dir === bogus) {
      mkdirSync(dirname(join(scratch, dir)), { recursive: true });
      writeFileSync(join(scratch, dir), 'not a directory');
      continue;
    }
    mkdirSync(join(scratch, dir), { recursive: true });
    writeFileSync(join(scratch, dir, 'x.md'), '# x\n');
  }
  const originalCwd = process.cwd();
  process.chdir(scratch);
  try {
    assert.throws(() => listL3Docs(), /L3 doc directory missing/);
  } finally {
    process.chdir(originalCwd);
    rmSync(scratch, { recursive: true, force: true });
  }
});

// Issue #203 regression: the repo's own ADRs carried `type: semantic` and no
// `status:`, so the ADR carve-out (and with it audit-v2's immutable-ADR
// policy and the structured-madr oracle routing) never engaged on them.
test('every docs/adr document is the type: adr carve-out with a lifecycle status (#203)', () => {
  const SMADR_STATUSES = new Set(['proposed', 'accepted', 'deprecated', 'superseded']);
  const adrs = globSync('docs/adr/*.md').sort();
  assert.ok(adrs.length > 0, 'expected at least one ADR under docs/adr');
  for (const f of adrs) {
    const split = splitFrontmatter(readFileSync(f, 'utf8'));
    assert.ok(split, `${f} must have frontmatter`);
    assert.ok(isAdrCarveout(split.fmText), `${f} must carry type: adr (the ADR carve-out)`);
    const status = split.fmText.match(/(^|\n)status[ \t]*:[ \t]*(\S+)/)?.[2];
    assert.ok(
      status && SMADR_STATUSES.has(status),
      `${f} must declare a structured-MADR lifecycle status, got ${status ?? '(none)'}`,
    );
  }
});

test('listL3Docs excludes type: adr docs; listAdrDocs returns exactly them (#203)', () => {
  const l3 = listL3Docs();
  const adrDocs = listAdrDocs();
  const repoAdrs = globSync('docs/adr/*.md').sort();
  assert.deepEqual(adrDocs, repoAdrs, 'listAdrDocs must return the docs/adr ADRs');
  for (const f of adrDocs) {
    assert.ok(!l3.includes(f), `${f} must be carved out of the mif-validate corpus`);
  }
});

test('a non-adr doc under an L3 tree stays gated despite the ADR carve-out (#203)', () => {
  // The carve-out is content-based (type: adr), not directory-based: a plain
  // semantic doc dropped into docs/adr must remain in the mif-validate corpus.
  const scratch = mkdtempSync(join(tmpdir(), 'mif-corpus-test-'));
  for (const dir of L3_DIRS) {
    mkdirSync(join(scratch, dir), { recursive: true });
    writeFileSync(join(scratch, dir, 'x.md'), '---\ntype: semantic\n---\n\n# x\n');
  }
  writeFileSync(
    join(scratch, 'docs/adr', 'adr-1.md'),
    '---\ntype: adr\nstatus: accepted\n---\n\n# ADR-0001: x\n',
  );
  const originalCwd = process.cwd();
  process.chdir(scratch);
  try {
    const l3 = listL3Docs();
    assert.ok(l3.includes('docs/adr/x.md'), 'a non-adr doc under docs/adr must stay gated');
    assert.ok(!l3.includes('docs/adr/adr-1.md'), 'the type: adr doc must be carved out');
    assert.deepEqual(listAdrDocs(), ['docs/adr/adr-1.md']);
  } finally {
    process.chdir(originalCwd);
    rmSync(scratch, { recursive: true, force: true });
  }
});

test('listTemplates fails closed when the template glob resolves to nothing', () => {
  const scratch = mkdtempSync(join(tmpdir(), 'mif-corpus-test-'));
  const originalCwd = process.cwd();
  process.chdir(scratch);
  try {
    assert.throws(() => listTemplates(), /no templates found/);
  } finally {
    process.chdir(originalCwd);
    rmSync(scratch, { recursive: true, force: true });
  }
});
