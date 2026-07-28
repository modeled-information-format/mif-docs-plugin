// Unit tests for the internal-link-resolution gate (scripts/lib/doc-links.mjs
// + scripts/check-doc-links.mjs) added for mif-docs-plugin#173 -- issue #10
// proposed this gate and was closed as completed, but no such gate ever
// shipped, letting ten `.md`-suffixed / wrong-relative-depth links 404 on the
// deployed site. These tests prove the defect classes a naive
// inline-link-only, delete-not-mask extractor would miss: reference-style
// `[label]: target` definitions (idiomatic in this repo's ADRs), code-span
// false positives, non-canonical-but-real routes, and the kebab-case route
// identity invariant.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  listDocFiles,
  checkKebabCase,
  routeForDocFile,
  buildRouteSet,
  maskFencedBlocks,
  maskInlineCode,
  extractLinks,
  resolveTarget,
  classify,
  checkAll,
} from '../scripts/lib/doc-links.mjs';

function withScratchDocs(files, fn) {
  const scratch = mkdtempSync(join(tmpdir(), 'mif-doc-links-test-'));
  for (const [relPath, content] of Object.entries(files)) {
    const full = join(scratch, relPath);
    mkdirSync(join(full, '..'), { recursive: true });
    writeFileSync(full, content);
  }
  const originalCwd = process.cwd();
  process.chdir(scratch);
  try {
    return fn();
  } finally {
    process.chdir(originalCwd);
    rmSync(scratch, { recursive: true, force: true });
  }
}

test('routeForDocFile maps a plain doc to its trailing-slash route', () => {
  assert.equal(routeForDocFile('docs/architecture/mif-provenance.md'), '/mif-docs-plugin/architecture/mif-provenance/');
});

test('routeForDocFile maps docs/index.mdx to the site root', () => {
  assert.equal(routeForDocFile('docs/index.mdx'), '/mif-docs-plugin/');
});

test('a correct-form link resolves cleanly (no findings)', () => {
  withScratchDocs(
    {
      'docs/a.md': '# A\n\nSee [b](../b/) for more.\n',
      'docs/b.md': '# B\n',
    },
    () => {
      const findings = checkAll();
      assert.deepEqual(findings, []);
    },
  );
});

test('a `.md`-suffixed inline link is reported not-found, even at the right depth', () => {
  withScratchDocs(
    {
      'docs/one.md': '# One\n\nSee [two](../two.md) for more.\n',
      'docs/two.md': '# Two\n',
    },
    () => {
      const findings = checkAll();
      assert.equal(findings.length, 1);
      assert.equal(findings[0].status, 'not-found');
      assert.equal(findings[0].target, '../two.md');
    },
  );
});

test('a `.md`-suffixed reference-style [label]: target definition is reported not-found', () => {
  // The exact coverage gap a naive inline-link-only extractor would miss --
  // idiomatic in this repo's docs/adr/0004 and docs/adr/0005.
  withScratchDocs(
    {
      'docs/three.md': '# Three\n\nSee [ref] for more.\n\n[ref]: ../two.md\n',
      'docs/two.md': '# Two\n',
    },
    () => {
      const findings = checkAll();
      assert.equal(findings.length, 1);
      assert.equal(findings[0].status, 'not-found');
      assert.equal(findings[0].target, '../two.md');
      assert.equal(findings[0].line, 5);
    },
  );
});

test('a link with the right target but wrong relative depth is reported not-found (the actual #173 defect shape)', () => {
  withScratchDocs(
    {
      'docs/sub/deep.md': '# Deep\n\nSee [other](../other/) for more.\n',
      'docs/other.md': '# Other\n',
    },
    () => {
      const findings = checkAll();
      assert.equal(findings.length, 1);
      assert.equal(findings[0].status, 'not-found');
      assert.equal(findings[0].resolvedPath, '/mif-docs-plugin/sub/other/');
    },
  );
});

test('a resolvable-but-non-canonical link (real target, missing trailing slash) is its own classification, not folded into not-found', () => {
  withScratchDocs(
    {
      'docs/canon.md': '# Canon\n\nSee [target](../target) for more.\n',
      'docs/target.md': '# Target\n',
    },
    () => {
      const findings = checkAll();
      assert.equal(findings.length, 1);
      assert.equal(findings[0].status, 'non-canonical');
      assert.equal(findings[0].resolvedPath, '/mif-docs-plugin/target');
    },
  );
});

test('a link inside a fenced code block, and inside an inline code span, is ignored (the mif-to-pdf.md:162 false-positive case)', () => {
  const content = [
    '# Title',
    '',
    '```md',
    '[fenced link](../not-real.md)',
    '```',
    '',
    'Prose with an inline `[span link](../also-not-real.md)` example.',
    '',
  ].join('\n');
  const links = extractLinks('docs/x.md', content);
  assert.deepEqual(links, []);
});

test('maskFencedBlocks and maskInlineCode preserve line count and per-line length', () => {
  const content = '# H\n\n```\ncode line one\ncode line two\n```\n\nprose `inline code` here\n';
  const masked = maskInlineCode(maskFencedBlocks(content));
  const origLines = content.split('\n');
  const maskedLines = masked.split('\n');
  assert.equal(maskedLines.length, origLines.length);
  for (let i = 0; i < origLines.length; i++) {
    assert.equal(maskedLines[i].length, origLines[i].length, `line ${i} length changed`);
  }
});

test('resolveTarget + classify implement the ".." depth math a browser would use against a trailing-slash route', () => {
  const current = '/mif-docs-plugin/reference/skills/mif-provenance/';
  assert.equal(resolveTarget(current, '../../provenance-ledger/'), '/mif-docs-plugin/reference/provenance-ledger/');
  assert.equal(resolveTarget(current, '../provenance-ledger/'), '/mif-docs-plugin/reference/skills/provenance-ledger/');
  const routeSet = new Set(['/mif-docs-plugin/reference/provenance-ledger/']);
  assert.equal(classify(resolveTarget(current, '../../provenance-ledger/'), routeSet), 'ok');
  assert.equal(classify(resolveTarget(current, '../provenance-ledger/'), routeSet), 'not-found');
});

test('a non-kebab-case doc filename makes the gate fail loudly rather than silently mis-map', () => {
  withScratchDocs(
    {
      'docs/BadName.md': '# Bad\n',
      'docs/ok.md': '# Ok\n',
    },
    () => {
      const problems = checkKebabCase(listDocFiles());
      assert.equal(problems.length, 1);
      assert.match(problems[0], /BadName/);
      assert.throws(() => checkAll(), /non-kebab-case/);
    },
  );
});

test('docs/index.mdx frontmatter link: and <LinkCard href="..."> forms resolve correctly, and the hero SVG block never produces false positives', () => {
  const indexContent = [
    '---',
    'title: Home',
    'hero:',
    '  tagline: Home',
    '  image:',
    '    html: |',
    '      <svg>',
    '        <text fill="link: not-a-real-page">bogus</text>',
    '        <a href="not-a-real-target">not a link either</a>',
    '      </svg>',
    '  actions:',
    '    - text: Get started',
    '      link: sub/page/',
    '---',
    '',
    'import { CardGrid, LinkCard } from \'@astrojs/starlight/components\';',
    '',
    '<CardGrid>',
    '  <LinkCard title="Sub" href="sub/page/" description="x" />',
    '</CardGrid>',
    '',
  ].join('\n');
  withScratchDocs(
    {
      'docs/index.mdx': indexContent,
      'docs/sub/page.md': '# Page\n',
    },
    () => {
      const findings = checkAll();
      assert.deepEqual(findings, [], `expected no findings, got ${JSON.stringify(findings)}`);
    },
  );
});

test('buildRouteSet + listDocFiles fail closed when docs/ is empty', () => {
  withScratchDocs({}, () => {
    assert.throws(() => listDocFiles(), /no doc files found/);
  });
});

test('buildRouteSet produces exactly one route per doc file', () => {
  withScratchDocs(
    {
      'docs/a.md': '# A\n',
      'docs/sub/b.md': '# B\n',
    },
    () => {
      const files = listDocFiles();
      const routes = buildRouteSet(files);
      assert.equal(routes.size, files.length);
      assert.ok(routes.has('/mif-docs-plugin/a/'));
      assert.ok(routes.has('/mif-docs-plugin/sub/b/'));
    },
  );
});
