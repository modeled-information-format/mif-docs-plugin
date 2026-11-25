// Regression: an unhydrated schema cache must be reported as a distinct
// environment/tooling error, not folded into "document is NOT MIF-conformant".
//
// Before this fix, `loadValidator()` let a raw ENOENT bubble out of
// `mif-validate.mjs`, which folded it into the same `failures[]` list as a
// genuine schema-conformance violation. The fail-closed guard then told the
// model to "fix its frontmatter" and, as a fallback remedy, suggested
// `npm ci` — which does not fix a missing hydrated schema cache and left the
// model unable to self-serve past the block.
//
// These tests exercise the real CLI/hook end to end, but against an isolated
// copy of the plugin tree (schema/scripts/hooks/tests, with node_modules
// symlinked) rather than this checkout's own schema/.cache — `node --test`
// runs test FILES concurrently, and this checkout's cache is shared, real
// state that other test files (e.g. provenance-stamp.test.mjs) rely on being
// hydrated at the same time. Mutating it in place would be a flaky, racy test.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, cpSync, symlinkSync, rmSync, readFileSync, unlinkSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// mif-validate fetches the schema itself when the cache is empty. These tests
// are about what happens when it cannot, so the fetch is forbidden: they stay
// offline and deterministic, and exercise the path a machine without network
// access takes.
const OFFLINE = { ...process.env, MIF_DOCS_NO_AUTO_HYDRATE: '1' };

// Build a throwaway copy of just the pieces the validator/guard need, then
// clean it up afterward.
function makePluginCopy() {
  const dir = mkdtempSync(join(tmpdir(), 'mif-docs-unhydrated-'));
  for (const sub of ['schema', 'scripts', 'hooks', 'tests']) {
    cpSync(join(root, sub), join(dir, sub), { recursive: true });
  }
  symlinkSync(join(root, 'node_modules'), join(dir, 'node_modules'));
  return dir;
}

// Never hydrated at all: schema/.cache/ doesn't exist.
function makeUnhydratedPluginCopy() {
  const dir = makePluginCopy();
  rmSync(join(dir, 'schema', '.cache'), { recursive: true, force: true });
  return dir;
}

// A partial/interrupted hydrate: schema/.cache/<version>/ exists, but the
// schema file itself is missing (the #88 review regression — the original
// fix only checked the directory, not the file it's supposed to contain).
function makePartiallyHydratedPluginCopy() {
  const dir = makePluginCopy();
  const lock = JSON.parse(readFileSync(join(dir, 'schema', 'VENDOR.lock'), 'utf8'));
  unlinkSync(join(dir, 'schema', '.cache', lock.resolvedVersion, 'mif.schema.json'));
  return dir;
}

test('mif-validate exits 3 (not 1) when the schema cache is not hydrated', () => {
  const dir = makeUnhydratedPluginCopy();
  try {
    const r = spawnSync(
      'node',
      [join(dir, 'scripts', 'mif-validate.mjs'), join(dir, 'tests/fixtures/good-l1.md'), '--level', '1'],
      { cwd: dir, encoding: 'utf8', env: OFFLINE },
    );
    assert.equal(r.status, 3, `expected exit 3 (tooling error), got ${r.status}: ${r.stderr}`);
    assert.match(r.stderr, /schema not hydrated/);
    assert.match(r.stderr, /npm run hydrate-schema/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('mif-validate exits 3 (not 1) when the cache dir exists but the schema file itself is missing (partial hydrate)', () => {
  const dir = makePartiallyHydratedPluginCopy();
  try {
    const r = spawnSync(
      'node',
      [join(dir, 'scripts', 'mif-validate.mjs'), join(dir, 'tests/fixtures/good-l1.md'), '--level', '1'],
      { cwd: dir, encoding: 'utf8', env: OFFLINE },
    );
    assert.equal(r.status, 3, `expected exit 3 (tooling error), got ${r.status}: ${r.stderr}`);
    assert.match(r.stderr, /schema not hydrated/);
    assert.match(r.stderr, /npm run hydrate-schema/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('mif-guard blocks with a hydrate-schema remedy, not a frontmatter-fix remedy, when the cache is missing', () => {
  const dir = makeUnhydratedPluginCopy();
  try {
    const goodFixture = join(dir, 'tests/fixtures/good-l1.md');
    const payload = JSON.stringify({ tool_name: 'Write', tool_input: { file_path: goodFixture } });
    const r = spawnSync('node', [join(dir, 'hooks', 'mif-guard.mjs')], { input: payload, encoding: 'utf8', env: OFFLINE });
    assert.equal(r.status, 2, `expected blocked exit 2, got ${r.status}: ${r.stderr}`);
    assert.match(r.stderr, /schema cache is not\s+hydrated/);
    assert.match(r.stderr, /npm run hydrate-schema/);
    assert.doesNotMatch(r.stderr, /NOT MIF-conformant/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Automatic hydration: an empty cache is filled on first use.
//
// The real hydrate-schema.mjs fetches from mif-spec.dev. To keep these tests
// offline, the plugin copy's hydrate script is replaced with a stand-in: one
// that fills the cache from this checkout's own (as a successful fetch would),
// and one that fails (as a fetch with no network would).
// ---------------------------------------------------------------------------
function withHydrateStandIn(dir, body) {
  writeFileSync(join(dir, 'scripts', 'hydrate-schema.mjs'), body);
}

const FILLS_CACHE = `
import { cpSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
cpSync(
  ${JSON.stringify(join(root, 'schema', '.cache'))},
  fileURLToPath(new URL('../schema/.cache', import.meta.url)),
  { recursive: true },
);
`;
const FAILS = `
console.error('hydrate-schema failed: fetch failed');
process.exit(1);
`;

test('mif-validate fills an empty schema cache itself and then validates', () => {
  const dir = makeUnhydratedPluginCopy();
  try {
    withHydrateStandIn(dir, FILLS_CACHE);
    const r = spawnSync(
      'node',
      [join(dir, 'scripts', 'mif-validate.mjs'), join(dir, 'tests/fixtures/good-l1.md'), '--level', '1'],
      { cwd: dir, encoding: 'utf8' },
    );
    assert.equal(r.status, 0, `expected a valid verdict, got ${r.status}: ${r.stderr}`);
    assert.match(r.stdout, /RESULT: VALID at MIF L1/);
    assert.match(r.stderr, /schema cache was empty; fetched MIF schema/);
    const lock = JSON.parse(readFileSync(join(dir, 'schema', 'VENDOR.lock'), 'utf8'));
    assert.ok(existsSync(join(dir, 'schema', '.cache', lock.resolvedVersion, 'mif.schema.json')));

    // The second run finds the cache and says nothing about fetching.
    const again = spawnSync(
      'node',
      [join(dir, 'scripts', 'mif-validate.mjs'), join(dir, 'tests/fixtures/good-l1.md'), '--level', '1'],
      { cwd: dir, encoding: 'utf8' },
    );
    assert.equal(again.status, 0);
    assert.doesNotMatch(again.stderr, /fetched MIF schema/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('mif-validate repairs a partial hydrate the same way', () => {
  const dir = makePartiallyHydratedPluginCopy();
  try {
    withHydrateStandIn(dir, FILLS_CACHE);
    const r = spawnSync(
      'node',
      [join(dir, 'scripts', 'mif-validate.mjs'), join(dir, 'tests/fixtures/good-l1.md'), '--level', '1'],
      { cwd: dir, encoding: 'utf8' },
    );
    assert.equal(r.status, 0, `expected a valid verdict, got ${r.status}: ${r.stderr}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('mif-validate exits 3 with the reason when the automatic fetch fails', () => {
  const dir = makeUnhydratedPluginCopy();
  try {
    withHydrateStandIn(dir, FAILS);
    const r = spawnSync(
      'node',
      [join(dir, 'scripts', 'mif-validate.mjs'), join(dir, 'tests/fixtures/good-l1.md'), '--level', '1'],
      { cwd: dir, encoding: 'utf8' },
    );
    assert.equal(r.status, 3, `expected exit 3 (tooling error), got ${r.status}: ${r.stderr}`);
    assert.match(r.stderr, /schema not hydrated/);
    assert.match(r.stderr, /fetching it automatically failed: hydrate-schema failed: fetch failed/);
    assert.match(r.stderr, /npm run hydrate-schema/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('mif-guard lets a conformant write through once the cache has been filled automatically', () => {
  const dir = makeUnhydratedPluginCopy();
  try {
    withHydrateStandIn(dir, FILLS_CACHE);
    const goodFixture = join(dir, 'tests/fixtures/good-l1.md');
    const payload = JSON.stringify({ tool_name: 'Write', tool_input: { file_path: goodFixture } });
    const r = spawnSync('node', [join(dir, 'hooks', 'mif-guard.mjs')], { input: payload, encoding: 'utf8' });
    assert.equal(r.status, 0, `expected the write to be allowed, got ${r.status}: ${r.stderr}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
