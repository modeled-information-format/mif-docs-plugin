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
import { mkdtempSync, cpSync, symlinkSync, rmSync, readFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

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
      { cwd: dir, encoding: 'utf8' },
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
      { cwd: dir, encoding: 'utf8' },
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
    const r = spawnSync('node', [join(dir, 'hooks', 'mif-guard.mjs')], { input: payload, encoding: 'utf8' });
    assert.equal(r.status, 2, `expected blocked exit 2, got ${r.status}: ${r.stderr}`);
    assert.match(r.stderr, /schema cache is not\s+hydrated/);
    assert.match(r.stderr, /npm run hydrate-schema/);
    assert.doesNotMatch(r.stderr, /NOT MIF-conformant/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
