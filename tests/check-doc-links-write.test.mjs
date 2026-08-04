// Regression tests for check-doc-links --write, covering the three
// corruptions review verified in the original whole-line split/join
// implementation:
//   1. `[a](index.md) [b](sub/index.md)` -- the fix for [a] ("../") rewrote
//      the "index.md" substring inside [b], producing `sub/../`, a link that
//      resolves back to its own page, which the re-check then called OK.
//   2. `/foo` + `/foo/bar` on one line -- substring replacement manufactured
//      `/foo//bar`, a 404 that did not exist before.
//   3. A target inside an inline code span on the same line as a real broken
//      link got rewritten, corrupting documentation text.
// The rewrite must be positional against a code-masked line, longest-target
// first, leaving unfixable spans byte-for-byte intact.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const CLI = join(dirname(fileURLToPath(import.meta.url)), '..', 'scripts', 'check-doc-links.mjs');

function runWrite(cwd, extra = []) {
  // exit 1 (findings remain) is a legitimate outcome; capture output either way
  try {
    return execFileSync('node', [CLI, '--base', '/x', '--write', ...extra], { cwd, encoding: 'utf8' });
  } catch (e) {
    return `${e.stdout ?? ''}${e.stderr ?? ''}`;
  }
}

function withCorpus(files, fn) {
  const dir = mkdtempSync(join(tmpdir(), 'write-fix-'));
  try {
    for (const [rel, content] of Object.entries(files)) {
      mkdirSync(join(dir, dirname(rel)), { recursive: true });
      writeFileSync(join(dir, rel), content);
    }
    fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('a shorter target is never replaced inside a longer target on the same line', () => {
  withCorpus(
    {
      'docs/how-to/other.md': '# Other\n\nSee [a](index.md) and [b](sub/index.md).\n',
      'docs/how-to/index.md': '# Section index\n',
      'docs/how-to/sub/index.md': '# Sub index\n',
    },
    (dir) => {
      runWrite(dir);
      const after = readFileSync(join(dir, 'docs/how-to/other.md'), 'utf8');
      assert.match(after, /\[a\]\(\.\.\/\)/, 'the short index.md link is fixed to the section route');
      assert.match(after, /\[b\]\(\.\.\/sub\/\)/, 'the sub/index.md link is fixed to the sub route, never sub/../');
      assert.ok(!after.includes('sub/../'), 'the verified corruption never appears');
      // The oracle re-run must now be genuinely clean.
      const out = runWrite(dir);
      assert.match(out, /OK --/);
    },
  );
});

test('a prefix-sharing pair on one line is fixed without manufacturing new 404s', () => {
  withCorpus(
    {
      'docs/index.md': '# Home\n\n[short](foo.md) and [long](foo/bar.md)\n',
      'docs/foo.md': '# Foo\n',
      'docs/foo/bar.md': '# Bar\n',
    },
    (dir) => {
      runWrite(dir);
      const after = readFileSync(join(dir, 'docs/index.md'), 'utf8');
      assert.match(after, /\[short\]\(foo\/\)/);
      assert.match(after, /\[long\]\(foo\/bar\/\)/);
      assert.ok(!after.includes('foo//bar'), 'no double-slash route is manufactured');
      assert.match(runWrite(dir), /OK --/);
    },
  );
});

test('a target inside an inline code span is never rewritten', () => {
  withCorpus(
    {
      'docs/index.md': '# Home\n\nRun `cat ./setup.md` then read [setup](./setup.md).\n',
      'docs/setup.md': '# Setup\n',
    },
    (dir) => {
      runWrite(dir);
      const after = readFileSync(join(dir, 'docs/index.md'), 'utf8');
      assert.ok(after.includes('`cat ./setup.md`'), 'the code span survives byte-for-byte');
      assert.match(after, /\[setup\]\(setup\/\)/, 'the real link is fixed');
      assert.match(runWrite(dir), /OK --/);
    },
  );
});

test('unfixable findings leave the line untouched and are counted', () => {
  withCorpus(
    {
      'docs/index.md': '# Home\n\n[gone](missing.md) and [ok](real.md)\n',
      'docs/real.md': '# Real\n',
    },
    (dir) => {
      const out = runWrite(dir);
      const after = readFileSync(join(dir, 'docs/index.md'), 'utf8');
      assert.ok(after.includes('[gone](missing.md)'), 'the unfixable link is byte-for-byte intact');
      assert.match(after, /\[ok\]\(real\/\)/);
      assert.match(out, /1 finding\(s\) had no safe mechanical fix/);
      assert.match(out, /do not resolve to any real page route/);
    },
  );
});
