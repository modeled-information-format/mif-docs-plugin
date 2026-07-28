// Acceptance tests for the MIF fail-closed guard hook (hooks/mif-guard.mjs).
//
// The guard must enforce MIF conformance on genre-document outputs and stay out
// of the way of everything else. These tests prove both directions: a known-good
// MIF doc passes (no false block) and a non-MIF genre doc is blocked.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { MIF_IDENTITY_SIGNAL_KEYS, loadValidator } from '../scripts/lib/projection.mjs';

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

test('the generic non-conformance block message is well-formed, not garbled (#151)', () => {
  // #151: the `npm ci` fallback clause was spliced onto a duplicated fragment
  // of the earlier templates/good.md sentence, producing a dangling `)` and a
  // repeated clause in the exact stderr text fed back to the model on block.
  const r = runGuard(join(root, 'tests/fixtures/lightweight-non-mif.md'));
  assert.equal(r.status, 2, 'a non-conformant genre doc must be blocked fail-closed');
  const goodMdFragment = 'templates/good.md';
  const occurrences = r.stderr.split(goodMdFragment).length - 1;
  assert.equal(
    occurrences,
    1,
    `the "${goodMdFragment}" fragment must appear exactly once in the block message, not duplicated`,
  );
  // Scope the parentheses-balance check to the guard's own guidance
  // paragraph, not the whole stderr — r.stderr also embeds mif-validate's
  // `detail` output verbatim (see hooks/mif-guard.mjs), and that upstream
  // text is free to contain its own unrelated (and not necessarily
  // balanced) parentheses. Checking the full stderr would make this
  // regression test brittle to unrelated changes in mif-validate's error
  // formatting.
  const guidanceMarker = 'This document was produced';
  const guidanceStart = r.stderr.indexOf(guidanceMarker);
  assert.ok(
    guidanceStart !== -1,
    `expected the guard's guidance paragraph ("${guidanceMarker}...") to appear in the block message`,
  );
  const guidance = r.stderr.slice(guidanceStart);
  const opens = (guidance.match(/\(/g) || []).length;
  const closes = (guidance.match(/\)/g) || []).length;
  assert.equal(opens, closes, 'parentheses in the guard\'s guidance paragraph must be balanced');
});

test('the block message names the schema\'s allowed conceptType values (#177)', () => {
  // #177 dropped the block message's hardcoded `type[semantic|episodic|procedural]`
  // hint, on the grounds that a hardcoded enum silently drifts from the canonical
  // schema. That is only safe while the values still reach the model some other
  // way: this stderr IS the remediation instruction a blocked agent acts on (see
  // this file's header and hooks/mif-guard.mjs:5-9), and ajv's bare "must be equal
  // to one of the allowed values" is unactionable without them. mif-validate
  // therefore renders ajv's params.allowedValues into the detail the guard embeds.
  //
  // The expected values are READ FROM THE SCHEMA rather than written out here, so
  // this test pins the property the removal was meant to protect — the message
  // tracks the canonical enum — instead of re-hardcoding the enum #177 removed.
  const allowed = loadValidator().validate.schema?.properties?.conceptType?.enum;
  assert.ok(
    Array.isArray(allowed) && allowed.length > 0,
    'expected the canonical schema to define a conceptType enum to assert against',
  );

  const scratch = mkdtempSync(join(tmpdir(), 'mif-guard-test-'));
  try {
    // Genre-signalled (bare `@id`/`conceptType` keys) and L1-complete, so the
    // out-of-enum conceptType is the ONLY thing that makes it non-conformant.
    const doc = join(scratch, 'bad-concept-type.md');
    writeFileSync(
      doc,
      [
        '---',
        '"@id": urn:uuid:7b3c1e90-5a2f-4c8d-9e10-2f6a4b8c1d3e',
        'conceptType: not-a-concept-type',
        'created: 2026-01-15T10:30:00Z',
        '---',
        '',
        '# Bad conceptType',
        '',
        'Body.',
        '',
      ].join('\n'),
    );

    const r = runGuard(doc);
    assert.equal(r.status, 2, `an out-of-enum conceptType must be blocked: ${r.stderr}`);
    for (const value of allowed) {
      assert.ok(
        r.stderr.includes(value),
        `the block message must name the allowed conceptType "${value}" so the blocked ` +
          `model knows what to choose from; got:\n${r.stderr}`,
      );
    }
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
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

test('the guard retries a transiently-failed validator spawn rather than blocking outright (#146)', () => {
  // #146: under concurrent full-suite test runs, spawnSync launching the
  // inner validator subprocess could itself transiently fail to start
  // (EAGAIN/ENOMEM/etc. — the OS briefly out of headroom, not a real
  // conformance problem). spawnSync doesn't throw for that; it returns
  // `.error` set and `.status` null, which used to fall straight through to
  // the guard's generic "NOT MIF-conformant" block. The fix must route the
  // validator spawn through the retry wrapper, not a bare spawnSync call.
  const guardSource = readFileSync(hook, 'utf8');
  assert.match(
    guardSource,
    /from\s*['"]\.\.\/scripts\/lib\/retry-spawn\.mjs['"]/,
    'hooks/mif-guard.mjs must import spawnSyncWithRetry from scripts/lib/retry-spawn.mjs',
  );
  assert.match(
    guardSource,
    /spawnSyncWithRetry\(\s*spawnSync\s*,/,
    'the inner validator launch must go through spawnSyncWithRetry, not a bare spawnSync(...) call',
  );
  assert.ok(
    guardSource.includes('res.error'),
    'a still-unlaunched validator after retries must be treated as an environment/tooling gap ' +
      '(the "could not run the validator" message), not a conformance verdict',
  );
});
