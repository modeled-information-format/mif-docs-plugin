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

test('genre-signal detection derives from ONE shared predicate, not separately-maintained copies (#50)', () => {
  // #50's drift bug, generalized: the guard's genre detection used to be an
  // inline copy that could silently diverge from projection.mjs's key
  // recognition — and later, the provenance capture hook grew a verbatim copy
  // of the guard's whole predicate. The fix is structural: the ENTIRE
  // predicate (bare-key list, type-value enum, adr carve-out, frontmatter
  // split) lives once in scripts/lib/mif-genre-signal.mjs, which derives its
  // bare-key detection from the shared identity-key list; both hooks import
  // the predicate rather than restating it.
  assert.deepEqual(
    MIF_IDENTITY_SIGNAL_KEYS,
    ['@id', 'conceptType'],
    'the shared identity-key list (re-exported by projection.mjs) must keep matching what the predicate derives its detection from',
  );
  const guardSource = readFileSync(hook, 'utf8');
  assert.match(
    guardSource,
    /from\s*['"]\.\.\/scripts\/lib\/mif-genre-signal\.mjs['"]/,
    'hooks/mif-guard.mjs must import its genre detection from the shared predicate module',
  );
  assert.ok(
    !/GUARD_GENRE_KEYS|semantic\|episodic\|procedural\|tutorial/.test(guardSource),
    'the guard must not carry its own copy of the genre keys or type-value enum regex',
  );
  const provenanceHookSource = readFileSync(
    join(root, 'hooks', 'provenance-post-tool-use.mjs'),
    'utf8',
  );
  assert.match(
    provenanceHookSource,
    /from\s*['"]\.\.\/scripts\/lib\/mif-genre-signal\.mjs['"]/,
    'the provenance hook must consume the same shared predicate',
  );
  assert.ok(
    !/semantic\|episodic\|procedural\|tutorial/.test(provenanceHookSource),
    'the provenance hook must not carry its own copy of the type-value enum regex',
  );
  // The predicate module must stay dependency-light (only the tiny key-list
  // module), so neither hook transitively loads ajv/ajv-formats/js-yaml on
  // every tool call.
  const predicateSource = readFileSync(join(root, 'scripts', 'lib', 'mif-genre-signal.mjs'), 'utf8');
  const imports = [...predicateSource.matchAll(/^\s*import\b.*?from\s*['"]([^'"]+)['"]/gms)].map((m) => m[1]);
  assert.deepEqual(
    imports,
    ['./mif-identity-signal-keys.mjs'],
    'scripts/lib/mif-genre-signal.mjs may import only the dependency-free key list',
  );
  const spreadUsage = /\.\.\.MIF_IDENTITY_SIGNAL_KEYS/.test(predicateSource);
  assert.ok(spreadUsage, 'the predicate must actually derive its bare-key regex from the shared list');
  const keysModuleSource = readFileSync(
    join(root, 'scripts', 'lib', 'mif-identity-signal-keys.mjs'),
    'utf8',
  );
  assert.ok(
    !/^\s*import\b/m.test(keysModuleSource),
    'scripts/lib/mif-identity-signal-keys.mjs must stay dependency-free (no imports)',
  );
});
