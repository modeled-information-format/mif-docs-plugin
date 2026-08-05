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
  checkKebabCase,
  checkRouteCollisions,
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

// readmeAsIndex (issue #213): a content-collection config that re-slugs a
// subdirectory README.md to its directory's own route (research-harness-template's
// custom generateId is a real example) needs the route model to match that,
// opt-in only -- every test above this point exercises the default (false)
// and must keep passing unchanged.

test('readmeAsIndex defaults to false and leaves routeForDocFile/checkKebabCase unchanged', () => {
  assert.equal(normalizeOptions().readmeAsIndex, false);
  assert.equal(routeForDocFile('docs/adr/README.md'), '/mif-docs-plugin/adr/README/');
});

test('routeForDocFile maps README.md (any case) to its directory route when readmeAsIndex is true', () => {
  const opts = { siteBase: '/rht', readmeAsIndex: true };
  assert.equal(routeForDocFile('docs/adr/README.md', opts), '/rht/adr/');
  assert.equal(routeForDocFile('docs/readme.md', opts), '/rht/');
  assert.equal(routeForDocFile('docs/adr/0001-foo.md', opts), '/rht/adr/0001-foo/');
});

test('checkKebabCase exempts README (any case) only when readmeAsIndex is true', () => {
  withTempDir(() => {
    mkdirSync('docs/adr', { recursive: true });
    writeFileSync('docs/adr/README.md', '# ADR index\n');
    writeFileSync('docs/index.md', '# Home\n');
    const files = ['docs/adr/README.md', 'docs/index.md'];
    assert.deepEqual(checkKebabCase(files, {}), ['docs/adr/README.md: path segment "README" is not lowercase-kebab-case']);
    assert.deepEqual(checkKebabCase(files, { readmeAsIndex: true }), []);
  });
});

test('suggestFixedTarget repairs a README-index page\'s sibling link without an erroneous leading ../ (PR research-harness-template#834 regression)', () => {
  const files = ['docs/adr/README.md', 'docs/adr/0001-four-layer-single-repository-architecture.md'];
  const opts = { siteBase: '/rht', readmeAsIndex: true };
  const routeSet = buildRouteSet(files, opts);
  assert.deepEqual([...routeSet].sort(), ['/rht/adr/', '/rht/adr/0001-four-layer-single-repository-architecture/']);
  const fixed = suggestFixedTarget(
    'docs/adr/README.md',
    '0001-four-layer-single-repository-architecture.md',
    files,
    routeSet,
    opts,
  );
  assert.equal(fixed, '0001-four-layer-single-repository-architecture/');
});

test('without readmeAsIndex, the same sibling link is mis-rewritten with an erroneous leading ../ (documents the exact PR research-harness-template#834 bug this option fixes)', () => {
  const files = ['docs/adr/README.md', 'docs/adr/0001-four-layer-single-repository-architecture.md'];
  const opts = { siteBase: '/rht' }; // readmeAsIndex omitted -- the pre-fix default
  const routeSet = buildRouteSet(files, opts);
  const fixed = suggestFixedTarget(
    'docs/adr/README.md',
    '0001-four-layer-single-repository-architecture.md',
    files,
    routeSet,
    opts,
  );
  // Both the (wrong) identity route for README.md and the erroneous rewrite
  // agree with each other self-consistently, which is exactly why this
  // shipped undetected: the route model was internally consistent, just
  // wrong about what page README.md actually renders as.
  assert.equal(fixed, '../0001-four-layer-single-repository-architecture/');
});

// mdLinksRewritten (issue #213): a site wiring a build-time remark/rehype
// plugin (astro-rehype-relative-markdown-links is a real example) resolves
// GitHub-style file-relative .md/.mdx links itself, so such a link is not a
// defect -- it's the intentional dual-purpose (renders on GitHub too) form.
// Opt-in only; every test above this point exercises the default (false)
// and must keep passing unchanged.

test('mdLinksRewritten defaults to false and .md-suffixed links are still flagged', () => {
  withTempDir(() => {
    mkdirSync('docs/how-to', { recursive: true });
    writeFileSync('docs/how-to/guide.md', '# Guide\n');
    writeFileSync('docs/index.md', '# Home\n\n[Guide](how-to/guide.md)\n');
    const findings = checkAll(undefined, undefined, {});
    assert.equal(findings.length, 1);
    assert.equal(findings[0].status, 'not-found');
  });
});

test('mdLinksRewritten:true does not flag a .md-suffixed link that resolves to a real file', () => {
  withTempDir(() => {
    mkdirSync('docs/how-to', { recursive: true });
    writeFileSync('docs/how-to/guide.md', '# Guide\n');
    writeFileSync('docs/index.md', '# Home\n\n[Guide](how-to/guide.md)\n');
    const findings = checkAll(undefined, undefined, { mdLinksRewritten: true });
    assert.deepEqual(findings, []);
  });
});

test('mdLinksRewritten:true still flags a .md-suffixed link whose target file does not exist', () => {
  withTempDir(() => {
    mkdirSync('docs', { recursive: true });
    writeFileSync('docs/index.md', '# Home\n\n[Missing](nowhere.md)\n');
    const findings = checkAll(undefined, undefined, { mdLinksRewritten: true });
    assert.equal(findings.length, 1);
    assert.equal(findings[0].status, 'not-found');
  });
});

test('mdLinksRewritten:true does not exempt an absolute-path .md link (only file-relative ones are the GitHub-render convention)', () => {
  withTempDir(() => {
    mkdirSync('docs/how-to', { recursive: true });
    writeFileSync('docs/how-to/guide.md', '# Guide\n');
    writeFileSync('docs/index.md', '# Home\n\n[Guide](/how-to/guide.md)\n');
    const findings = checkAll(undefined, undefined, { mdLinksRewritten: true });
    assert.equal(findings.length, 1);
    assert.equal(findings[0].status, 'not-found');
  });
});

test('mdLinksRewritten:true still flags a wrong-relative-depth .md link (the file it names does not exist at that relative path)', () => {
  withTempDir(() => {
    mkdirSync('docs/how-to', { recursive: true });
    mkdirSync('docs/reference', { recursive: true });
    writeFileSync('docs/reference/tools.md', '# Tools\n');
    writeFileSync('docs/how-to/guide.md', '# Guide\n\n[Tools](reference/tools.md)\n'); // wrong depth: should be ../reference/tools.md
    const findings = checkAll(undefined, undefined, { mdLinksRewritten: true });
    assert.equal(findings.length, 1);
    assert.equal(findings[0].status, 'not-found');
  });
});

test('mdLinksRewritten:true exempts a rewritten link carrying a #anchor or ?query suffix, still requiring the target file to be real', () => {
  withTempDir(() => {
    mkdirSync('docs/how-to', { recursive: true });
    writeFileSync('docs/how-to/guide.md', '# Guide\n');
    writeFileSync(
      'docs/index.md',
      '# Home\n\n[Guide section](how-to/guide.md#section)\n[Guide query](how-to/guide.md?tab=x)\n[Missing](how-to/nope.md#section)\n',
    );
    const findings = checkAll(undefined, undefined, { mdLinksRewritten: true });
    assert.equal(findings.length, 1);
    assert.equal(findings[0].target, 'how-to/nope.md#section');
  });
});

// checkKebabCase review follow-up: the README-as-index exemption must apply
// only to the file's own basename, never to a directory segment literally
// named "README" -- that is not the readmeAsIndex convention and must still
// fail loud, or a route like /base/README/foo/ reaches the model unflagged.

test('checkKebabCase still flags a directory literally named README even with readmeAsIndex:true', () => {
  withTempDir(() => {
    mkdirSync('docs/README', { recursive: true });
    writeFileSync('docs/README/foo.md', '# Foo\n');
    const problems = checkKebabCase(['docs/README/foo.md'], { readmeAsIndex: true });
    assert.deepEqual(problems, ['docs/README/foo.md: path segment "README" is not lowercase-kebab-case']);
  });
});

test('checkKebabCase exempts an uppercase README.md at the docs root, not just in a subdirectory', () => {
  withTempDir(() => {
    mkdirSync('docs', { recursive: true });
    writeFileSync('docs/README.md', '# Root readme\n');
    assert.deepEqual(checkKebabCase(['docs/README.md'], { readmeAsIndex: true }), []);
    assert.equal(routeForDocFile('docs/README.md', { siteBase: '/rht', readmeAsIndex: true }), '/rht/');
  });
});

// checkRouteCollisions (review follow-up): index.md and README.md in the
// same directory both wanting the directory's own route is exactly the
// "route model cannot be trusted" condition checkKebabCase already exists
// to catch -- readmeAsIndex must not silently absorb it into one Set entry.

test('checkRouteCollisions is empty without readmeAsIndex (index.md and README.md are just two ordinary, distinct pages)', () => {
  const files = ['docs/adr/index.md', 'docs/adr/README.md'];
  assert.deepEqual(checkRouteCollisions(files, { siteBase: '/rht' }), []);
});

test('checkRouteCollisions flags a directory holding both index.md and README.md when readmeAsIndex is true', () => {
  const files = ['docs/adr/index.md', 'docs/adr/README.md'];
  const problems = checkRouteCollisions(files, { siteBase: '/rht', readmeAsIndex: true });
  assert.equal(problems.length, 1);
  assert.match(problems[0], /docs\/adr\/README\.md and docs\/adr\/index\.md both resolve to route \/rht\/adr\//);
});

test('checkAll fails closed by default on a README/index collision, and reports it as a finding under allowNonKebab', () => {
  withTempDir(() => {
    mkdirSync('docs/adr', { recursive: true });
    writeFileSync('docs/adr/index.md', '# ADR index\n');
    writeFileSync('docs/adr/README.md', '# Also an index?\n');
    assert.throws(() => checkAll(undefined, undefined, { readmeAsIndex: true }), /route collision/);
    const findings = checkAll(undefined, undefined, { readmeAsIndex: true, allowNonKebab: true });
    const collision = findings.find((f) => f.status === 'route-collision');
    assert.ok(collision, 'expected a route-collision finding');
    assert.equal(collision.target, null);
  });
});
