// Tests for scripts/audit-deterministic.mjs -- the zero-LLM audit pass. Runs
// the CLI against fixture corpora via --checks subsets that need no hydrated
// schema/ontology cache, so these tests hold in any checkout. Schema-backed
// checks are covered by the runner's own skip-reporting contract (asserted
// here) plus mif-validate's existing coverage.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { validateFindings } from '../scripts/lib/audit-findings.mjs';

const RUNNER = join(dirname(fileURLToPath(import.meta.url)), '..', 'scripts', 'audit-deterministic.mjs');

function runAudit(cwd, args) {
  return execFileSync('node', [RUNNER, ...args], { cwd, encoding: 'utf8' });
}

function makeCorpus(dir) {
  mkdirSync(join(dir, 'docs/how-to'), { recursive: true });
  mkdirSync(join(dir, 'docs/decisions'), { recursive: true });
  writeFileSync(
    join(dir, 'docs/how-to/guide.md'),
    '---\ntype: how-to\ntitle: Guide\n---\n\n# Guide\n\n[sibling](other.md)\n\n#### Deep heading after h1\n',
  );
  writeFileSync(
    join(dir, 'docs/how-to/other.md'),
    '---\ntype: how-to\ntitle: Other\n---\n\n# Other\n\n## Same\n\ntext\n\n## Same\n\n```js\nunclosed fence\n',
  );
  writeFileSync(
    join(dir, 'docs/decisions/adr-0001-choice.md'),
    '---\ntype: adr\nstatus: accepted\ntitle: Choice\n---\n\n# Choice\n\n## Same\n\n## Same\n',
  );
}

test('runner finds link/structural defects, classes .md links, and maps ADR mutability', () => {
  const dir = mkdtempSync(join(tmpdir(), 'audit-run-'));
  try {
    makeCorpus(dir);
    const out = runAudit(dir, [
      '--paths', 'docs',
      '--report-dir', 'report',
      '--site-base', '/x',
      '--checks', 'link-integrity,structural-formatting,relationship-graph',
    ]);
    assert.match(out, /3 MIF document\(s\)/);

    const payload = JSON.parse(readFileSync(join(dir, 'report/findings/deterministic.json'), 'utf8'));
    const v = validateFindings(payload);
    assert.deepEqual(v.errors, []);

    const byCheck = {};
    for (const f of payload.findings) byCheck[f.check_id] = (byCheck[f.check_id] ?? 0) + 1;
    // guide.md: broken .md link + h1->h4 level skip; other.md: duplicate
    // headings + unclosed fence. adr-0001 is immutable: its duplicate
    // headings are suppressed by policy.
    assert.equal(byCheck['link-integrity'], 1);
    // Exactly 3: guide.md's h1->h4 level skip, other.md's duplicate heading,
    // other.md's unclosed fence (adr-0001's duplicates are suppressed).
    assert.equal(byCheck['structural-formatting'], 3);
    assert.ok(!payload.findings.some((f) => f.files[0].includes('adr-0001')));

    const fence = payload.findings.find((f) => f.summary.includes('never closed'));
    assert.ok(fence, 'unclosed fence detected');
    assert.equal(fence.files[0], 'docs/how-to/other.md');

    const map = JSON.parse(readFileSync(join(dir, 'report/corpus-map.json'), 'utf8'));
    const adr = map.files.find((f) => f.file.includes('adr-0001'));
    assert.equal(adr.mutability, 'immutable');
    assert.equal(adr.oracle, 'structured-madr');
    const guide = map.files.find((f) => f.file.includes('guide.md'));
    assert.equal(guide.mutability, 'mutable');
    assert.equal(guide.genre, 'how-to');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a 5-instance .md-link class across 3 files becomes ONE defect class with a fix command', () => {
  const dir = mkdtempSync(join(tmpdir(), 'audit-class-'));
  try {
    mkdirSync(join(dir, 'docs'), { recursive: true });
    writeFileSync(join(dir, 'docs/target.md'), '---\ntype: reference\ntitle: T\n---\n\n# T\n');
    for (const n of ['a', 'b', 'c']) {
      const links =
        n === 'a'
          ? '[1](target.md)\n[2](target.md#x)\n[3](target.md)\n'
          : '[1](target.md)\n';
      writeFileSync(join(dir, `docs/${n}.md`), `---\ntype: how-to\ntitle: ${n}\n---\n\n# ${n}\n\n${links}`);
    }
    runAudit(dir, ['--paths', 'docs', '--report-dir', 'report', '--site-base', '/', '--checks', 'link-integrity']);
    const { classes } = JSON.parse(readFileSync(join(dir, 'report/classes.json'), 'utf8'));
    assert.equal(classes.length, 1);
    assert.equal(classes[0].class_id, 'md-suffix-links');
    assert.equal(classes[0].instance_count, 5);
    assert.equal(classes[0].file_count, 3);
    assert.match(classes[0].fix_command, /check-doc-links\.mjs .*--write/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('checks that cannot run are reported as skipped, never silently dropped', () => {
  const dir = mkdtempSync(join(tmpdir(), 'audit-skip-'));
  try {
    mkdirSync(join(dir, 'docs'), { recursive: true });
    writeFileSync(join(dir, 'docs/a.md'), '---\ntype: how-to\ntitle: A\n---\n\n# A\n');
    // No --site-base and no astro config: link-integrity must be skipped
    // with a stated reason, not quietly return zero findings. The same
    // never-silent invariant holds for provenance-drift without a ledger
    // and temporal-metadata without any git history (review finding: both
    // previously half-ran with skipped: [] -- indistinguishable from "ran
    // and the corpus is clean").
    const out = runAudit(dir, [
      '--paths', 'docs', '--report-dir', 'report',
      '--checks', 'link-integrity,provenance-drift,temporal-metadata',
    ]);
    assert.match(out, /SKIPPED link-integrity: no site base known/);
    assert.match(out, /SKIPPED provenance-drift: no --ledger supplied/);
    assert.match(out, /SKIPPED temporal-metadata: no git history available/);
    const payload = JSON.parse(readFileSync(join(dir, 'report/findings/deterministic.json'), 'utf8'));
    assert.equal(payload.skipped_checks.length, 3);
    assert.deepEqual(payload.findings, []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('temporal-metadata: modified-before-created is found without any git history', () => {
  const dir = mkdtempSync(join(tmpdir(), 'audit-temporal-'));
  try {
    mkdirSync(join(dir, 'docs'), { recursive: true });
    writeFileSync(
      join(dir, 'docs/a.md'),
      '---\ntype: how-to\ntitle: A\ncreated: 2026-03-01\nmodified: 2026-01-01\n---\n\n# A\n',
    );
    runAudit(dir, ['--paths', 'docs', '--report-dir', 'report', '--checks', 'temporal-metadata']);
    const payload = JSON.parse(readFileSync(join(dir, 'report/findings/deterministic.json'), 'utf8'));
    assert.equal(payload.findings.length, 1);
    assert.equal(payload.findings[0].check_id, 'temporal-metadata');
    assert.equal(payload.findings[0].severity, 'medium');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('relationship-graph structural half flags dangling .md relationship targets', () => {
  const dir = mkdtempSync(join(tmpdir(), 'audit-rel-'));
  try {
    mkdirSync(join(dir, 'docs'), { recursive: true });
    writeFileSync(
      join(dir, 'docs/a.md'),
      '---\ntype: explanation\ntitle: A\nrelationships:\n  - type: elaborates\n    target: missing.md\n---\n\n# A\n',
    );
    runAudit(dir, ['--paths', 'docs', '--report-dir', 'report', '--checks', 'relationship-graph']);
    const payload = JSON.parse(readFileSync(join(dir, 'report/findings/deterministic.json'), 'utf8'));
    assert.equal(payload.findings.length, 1);
    assert.match(payload.findings[0].summary, /missing\.md.*does not resolve/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('non-kebab doc paths surface as findings and never abort the audit', () => {
  const dir = mkdtempSync(join(tmpdir(), 'audit-kebab-'));
  try {
    mkdirSync(join(dir, 'docs'), { recursive: true });
    writeFileSync(join(dir, 'docs/README.md'), '---\ntype: reference\ntitle: R\n---\n\n# R\n');
    writeFileSync(join(dir, 'docs/index.md'), '---\ntype: explanation\ntitle: I\n---\n\n# I\n');
    const out = runAudit(dir, ['--paths', 'docs', '--report-dir', 'report', '--site-base', '/x', '--checks', 'link-integrity']);
    assert.match(out, /2 MIF document\(s\)/);
    const payload = JSON.parse(readFileSync(join(dir, 'report/findings/deterministic.json'), 'utf8'));
    const kebab = payload.findings.filter((f) => f.summary.includes('README'));
    assert.equal(kebab.length, 1);
    assert.equal(kebab[0].check_id, 'link-integrity');
    assert.equal(kebab[0].fixable, false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
