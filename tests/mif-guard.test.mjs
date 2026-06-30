// Acceptance tests for the MIF fail-closed guard hook (hooks/mif-guard.mjs).
//
// The guard must enforce MIF conformance on genre-document outputs and stay out
// of the way of everything else. These tests prove both directions: a known-good
// MIF doc passes (no false block) and a non-MIF genre doc is blocked.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const hook = join(root, 'hooks', 'mif-guard.mjs');

function runGuard(filePath) {
  const payload = JSON.stringify({ tool_name: 'Write', tool_input: { file_path: filePath } });
  return spawnSync('node', [hook], { input: payload, encoding: 'utf8' });
}

test('allows a conformant MIF L1 document (no false block)', () => {
  const r = runGuard(join(root, 'tests/fixtures/good-l1.md'));
  assert.equal(r.status, 0, `expected allow, got exit ${r.status}: ${r.stderr}`);
});

test('blocks a non-MIF genre document (legacy diataxis_type, no L1 floor)', () => {
  const r = runGuard(join(root, 'tests/fixtures/lightweight-non-mif.md'));
  assert.equal(r.status, 2, 'a non-conformant genre doc must be blocked fail-closed');
  assert.match(r.stderr, /NOT MIF-conformant/);
});

test('ignores plain markdown with no genre frontmatter', () => {
  const r = runGuard(join(root, 'tests/fixtures/plain-no-frontmatter.md'));
  assert.equal(r.status, 0, `expected allow, got exit ${r.status}: ${r.stderr}`);
});

test('ignores non-markdown files', () => {
  const r = runGuard(join(root, 'package.json'));
  assert.equal(r.status, 0, `expected allow, got exit ${r.status}: ${r.stderr}`);
});
