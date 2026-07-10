// Acceptance tests for the MIF fail-closed guard hook (hooks/mif-guard.mjs).
//
// The guard must enforce MIF conformance on genre-document outputs and stay out
// of the way of everything else. These tests prove both directions: a known-good
// MIF doc passes (no false block) and a non-MIF genre doc is blocked.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { MIF_IDENTITY_SIGNAL_KEYS } from '../scripts/lib/projection.mjs';

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

test('allows a conformant MIF L1 document using canonical @id/@type/conceptType frontmatter keys', () => {
  // Regression for #49: a document authored with the JSON-LD-native key
  // style directly in frontmatter (@id/@type/conceptType) is exactly as
  // conformant as the bare id/type alias convention and must not be blocked.
  const r = runGuard(join(root, 'tests/fixtures/good-l1-jsonld-keys.md'));
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

test('ignores a file whose only type is nested (auto-memory metadata.type)', () => {
  // Regression: an auto-memory file carries `metadata:\n  type: reference`. The
  // indented `type:` is not a MIF conceptType, so the guard must not treat the
  // file as a genre document and must not block the write.
  const r = runGuard(join(root, 'tests/fixtures/nested-metadata-type.md'));
  assert.equal(r.status, 0, `expected allow, got exit ${r.status}: ${r.stderr}`);
});

test('genre-signal detection derives from projection.mjs, not a separately-maintained list (#50)', () => {
  // #50: hooks/mif-guard.mjs's genre-signal regex and scripts/lib/projection.mjs's
  // toJsonld() key-recognition logic used to be two independently-maintained
  // lists that could silently drift -- a future authoring-convention key added
  // to one had no structural guarantee of reaching the other. Prove the fix is
  // structural, not just behavioral: the guard's source must actually import
  // and derive its bare-key detection from projection.mjs's exported list,
  // and that list's contents must be exactly what the guard's construction
  // consumes -- not merely "the guard happens to hardcode the same words today".
  assert.deepEqual(
    MIF_IDENTITY_SIGNAL_KEYS,
    ['@id', 'conceptType'],
    'projection.mjs must keep exporting the identity keys the guard derives its detection from',
  );
  const guardSource = readFileSync(hook, 'utf8');
  assert.match(
    guardSource,
    /import\s*\{\s*MIF_IDENTITY_SIGNAL_KEYS\s*\}\s*from\s*['"]\.\.\/scripts\/lib\/projection\.mjs['"]/,
    'hooks/mif-guard.mjs must import MIF_IDENTITY_SIGNAL_KEYS from projection.mjs, not hardcode its own copy',
  );
  // A plain /MIF_IDENTITY_SIGNAL_KEYS/ match here would be satisfied by the
  // import line alone (checked above) and could never fail independently of
  // it -- e.g. the import could sit dead/unused while the regex construction
  // below reverts to a separately hardcoded copy, silently reintroducing #50's
  // exact drift bug, and this assertion would still pass. Anchor to the actual
  // spread-usage site instead, so a regression to a hardcoded copy is caught.
  assert.match(
    guardSource,
    /\.\.\.MIF_IDENTITY_SIGNAL_KEYS/,
    'the imported list must actually be spread into the regex construction, not just imported and ignored',
  );
});
