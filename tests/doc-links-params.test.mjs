// Tests for the parameterized surface of scripts/lib/doc-links.mjs -- the
// {docsRoot, siteBase} options object, astro-config base extraction, and the
// suggestFixedTarget mechanical-fix helper that check-doc-links --write and
// audit-deterministic.mjs both rely on. The default-behavior surface (no
// opts) is covered by tests/check-doc-links.test.mjs and must stay untouched
// by these features; the last test here pins that explicitly.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  normalizeOptions,
  readSiteBaseFromAstroConfig,
  listDocFiles,
  routeForDocFile,
  buildRouteSet,
  resolveTarget,
  suggestFixedTarget,
  checkAll,
  SITE_BASE,
} from '../scripts/lib/doc-links.mjs';

function withTempDir(fn) {
  const dir = mkdtempSync(join(tmpdir(), 'doc-links-params-'));
  const prev = process.cwd();
  try {
    process.chdir(dir);
    fn(dir);
  } finally {
    process.chdir(prev);
    rmSync(dir, { recursive: true, force: true });
  }
}

test('normalizeOptions defaults exactly match the historical constants', () => {
  const o = normalizeOptions();
  assert.equal(o.docsRoot, 'docs');
  assert.equal(o.siteBase, SITE_BASE);
  assert.deepEqual(o.globs, ['docs/**/*.md', 'docs/**/*.mdx']);
});

test('normalizeOptions strips trailing slashes and treats "/" as the site root', () => {
  assert.equal(normalizeOptions({ siteBase: '/gdlc/' }).siteBase, '/gdlc');
  assert.equal(normalizeOptions({ siteBase: '/' }).siteBase, '');
  assert.equal(normalizeOptions({ docsRoot: 'content/' }).docsRoot, 'content');
});

test('normalizeOptions prefixes a bare site base with a slash', () => {
  assert.equal(normalizeOptions({ siteBase: 'gdlc' }).siteBase, '/gdlc');
});

test('routeForDocFile honors a custom docsRoot and siteBase', () => {
  const opts = { docsRoot: 'content', siteBase: '/gdlc' };
  assert.equal(routeForDocFile('content/how-to/add-a-plugin.md', opts), '/gdlc/how-to/add-a-plugin/');
  assert.equal(routeForDocFile('content/index.md', opts), '/gdlc/');
  assert.equal(routeForDocFile('content/decisions/index.mdx', opts), '/gdlc/decisions/');
});

test('routeForDocFile with siteBase "/" maps to root-served routes', () => {
  const opts = { siteBase: '/' };
  assert.equal(routeForDocFile('docs/guide.md', opts), '/guide/');
  assert.equal(routeForDocFile('docs/index.md', opts), '/');
});

test('readSiteBaseFromAstroConfig extracts base: and fails loud without one', () => {
  withTempDir(() => {
    writeFileSync(
      'astro.config.mjs',
      'export default defineConfig({\n  site: "https://example.dev",\n  base: "/gdlc",\n});\n',
    );
    assert.equal(readSiteBaseFromAstroConfig('astro.config.mjs'), '/gdlc');
    writeFileSync('bare.config.mjs', 'export default defineConfig({ site: "https://example.dev" });\n');
    assert.throws(() => readSiteBaseFromAstroConfig('bare.config.mjs'), /no base:/);
  });
});

test('checkAll against a foreign docs tree flags .md-suffix links under its own base', () => {
  withTempDir(() => {
    mkdirSync('content/how-to', { recursive: true });
    writeFileSync('content/index.md', '# Home\n\n[Guide](how-to/guide.md)\n');
    writeFileSync('content/how-to/guide.md', '# Guide\n\n[Home](../../)\n');
    const opts = { docsRoot: 'content', siteBase: '/gdlc' };
    const findings = checkAll(undefined, undefined, opts);
    assert.equal(findings.length, 1);
    assert.equal(findings[0].file, 'content/index.md');
    assert.equal(findings[0].status, 'not-found');
    assert.equal(findings[0].resolvedPath, '/gdlc/how-to/guide.md');
  });
});

test('suggestFixedTarget rewrites .md-suffix and missing-slash targets that provably resolve', () => {
  const files = ['docs/index.md', 'docs/how-to/guide.md', 'docs/reference/tools.md'];
  const routeSet = buildRouteSet(files);
  assert.equal(suggestFixedTarget('docs/index.md', 'how-to/guide.md', files, routeSet), 'how-to/guide/');
  assert.equal(
    suggestFixedTarget('docs/index.md', 'reference/tools.md#set-severity', files, routeSet),
    'reference/tools/#set-severity',
  );
  assert.equal(suggestFixedTarget('docs/index.md', 'how-to/guide', files, routeSet), 'how-to/guide/');
});

test('suggestFixedTarget returns null when the rewrite would not resolve', () => {
  const files = ['docs/index.md', 'docs/how-to/guide.md'];
  const routeSet = buildRouteSet(files);
  assert.equal(suggestFixedTarget('docs/index.md', 'how-to/renamed.md', files, routeSet), null);
  // Already-canonical-but-missing targets are not this fix class either.
  assert.equal(suggestFixedTarget('docs/index.md', 'how-to/renamed/', files, routeSet), null);
});

test('suggestFixedTarget repairs GitHub-style file-relative links (suffix AND depth)', () => {
  // A sibling link written as `set-severity.md` works on github.com but under
  // trailing-slash routes resolves one directory too deep -- the dominant
  // defect class in the 2026-07-30 gdlc audit (315 instances). The fix must
  // repair both the suffix and the depth, not just strip `.md`.
  const files = ['docs/how-to/close-as-duplicate.md', 'docs/how-to/set-severity.md', 'docs/reference/tools.md'];
  const routeSet = buildRouteSet(files);
  assert.equal(
    suggestFixedTarget('docs/how-to/close-as-duplicate.md', 'set-severity.md', files, routeSet),
    '../set-severity/',
  );
  assert.equal(
    suggestFixedTarget('docs/how-to/close-as-duplicate.md', '../reference/tools.md#anchor', files, routeSet),
    '../../reference/tools/#anchor',
  );
  const current = routeForDocFile('docs/how-to/close-as-duplicate.md');
  assert.equal(resolveTarget(current, '../set-severity/'), `${SITE_BASE}/how-to/set-severity/`);
  assert.equal(resolveTarget(current, '../../reference/tools/'), `${SITE_BASE}/reference/tools/`);
});

test('suggestFixedTarget honors custom docsRoot/siteBase options', () => {
  const opts = { docsRoot: 'content', siteBase: '/gdlc' };
  const files = ['content/explanation/hooks.md', 'content/decisions/adr-0007.md'];
  const routeSet = buildRouteSet(files, opts);
  assert.equal(
    suggestFixedTarget('content/explanation/hooks.md', '../decisions/adr-0007.md', files, routeSet, opts),
    '../../decisions/adr-0007/',
  );
});

test('no-opts calls still behave exactly as the historical defaults', () => {
  withTempDir(() => {
    mkdirSync('docs', { recursive: true });
    writeFileSync('docs/index.md', '# Home\n');
    const files = listDocFiles();
    assert.deepEqual(files, ['docs/index.md']);
    assert.equal(routeForDocFile('docs/index.md'), `${SITE_BASE}/`);
    assert.deepEqual(checkAll(files, () => '# Home\n'), []);
  });
});

test('readSiteBaseFromAstroConfig ignores commented-out base: lines', () => {
  withTempDir(() => {
    writeFileSync(
      'astro.config.mjs',
      '// base: "/old-retired-path"\n/* base: "/also-old" */\nexport default defineConfig({\n  site: "https://example.dev", // served at https://example.dev/gdlc\n  base: "/gdlc",\n});\n',
    );
    assert.equal(readSiteBaseFromAstroConfig('astro.config.mjs'), '/gdlc');
  });
});

test('a query-only href is not an internal target (PR #176 follow-up)', () => {
  withTempDir(() => {
    mkdirSync('docs', { recursive: true });
    writeFileSync('docs/index.md', '# Home\n\n[filtered view](?tab=all)\n');
    assert.deepEqual(checkAll(undefined, undefined, {}), []);
  });
});

test('allowNonKebab reports non-kebab paths as findings and keeps checking', () => {
  withTempDir(() => {
    mkdirSync('docs', { recursive: true });
    writeFileSync('docs/README.md', '# Readme\n\n[broken](missing.md)\n');
    writeFileSync('docs/index.md', '# Home\n');
    assert.throws(() => checkAll(undefined, undefined, {}), /non-kebab-case/);
    const findings = checkAll(undefined, undefined, { allowNonKebab: true });
    const statuses = findings.map((f) => f.status).sort();
    assert.deepEqual(statuses, ['non-kebab-path', 'not-found']);
    const kebab = findings.find((f) => f.status === 'non-kebab-path');
    assert.equal(kebab.file, 'docs/README.md');
    assert.equal(kebab.target, null);
  });
});
