// Tests for scripts/lib/temporal-git.mjs -- the deterministic
// temporal-metadata oracle, including the weak-oracle demotion for
// bulk-committed corpora (clustered git dates never rise above low/advisory).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import {
  gitDatesOf,
  declaredDatesOf,
  detectDateClustering,
  checkTemporal,
  isShallowRepo,
} from '../scripts/lib/temporal-git.mjs';

// Hermetic git environment: without this, a contributor's global config
// (signing hooks, commit templates) leaks into the fixture repo -- observed
// invoking an unrelated global post-commit signing hook during review.
function gitEnv(dir, dates = {}) {
  return {
    ...process.env,
    HOME: dir,
    GIT_CONFIG_GLOBAL: '/dev/null',
    GIT_CONFIG_SYSTEM: '/dev/null',
    GIT_AUTHOR_NAME: 't',
    GIT_AUTHOR_EMAIL: 't@t',
    GIT_COMMITTER_NAME: 't',
    GIT_COMMITTER_EMAIL: 't@t',
    ...dates,
  };
}

test('declaredDatesOf prefers the L2 temporal block over top-level fields', () => {
  assert.deepEqual(declaredDatesOf({ created: '2026-01-01', modified: '2026-01-02' }), {
    created: '2026-01-01',
    modified: '2026-01-02',
  });
  assert.deepEqual(
    declaredDatesOf({
      created: '2026-01-01',
      temporal: { created: '2026-02-01', modified: '2026-02-02' },
    }),
    { created: '2026-02-01', modified: '2026-02-02' },
  );
  assert.deepEqual(declaredDatesOf(null), {});
});

test('modified-before-created is the one medium, git-free finding', () => {
  const findings = checkTemporal({
    declared: { created: '2026-03-01', modified: '2026-02-01' },
    git: null,
  });
  assert.equal(findings.length, 1);
  assert.equal(findings[0].severity, 'medium');
  assert.equal(findings[0].advisory, false);
  assert.equal(findings[0].check_id, 'temporal-metadata');
});

test('stale modified against git history is low severity, fixable', () => {
  const findings = checkTemporal({
    declared: { created: '2026-01-01', modified: '2026-01-05' },
    git: { first: '2026-01-01T00:00:00Z', last: '2026-02-15T00:00:00Z' },
  });
  assert.equal(findings.length, 1);
  assert.equal(findings[0].severity, 'low');
  assert.equal(findings[0].advisory, false);
  assert.equal(findings[0].fixable, true);
});

test('clustered corpora demote git-derived findings to advisory', () => {
  const findings = checkTemporal({
    declared: { created: '2026-01-01', modified: '2026-01-05' },
    git: { first: '2026-01-01T00:00:00Z', last: '2026-02-15T00:00:00Z' },
    clustered: true,
  });
  assert.equal(findings.length, 1);
  assert.equal(findings[0].advisory, true);
  assert.match(findings[0].summary, /weak oracle/);
});

test('dates within tolerance produce no findings', () => {
  const findings = checkTemporal({
    declared: { created: '2026-01-01', modified: '2026-02-14' },
    git: { first: '2026-01-01T00:00:00Z', last: '2026-02-15T00:00:00Z' },
  });
  assert.deepEqual(findings, []);
});

test('missing declared dates or missing git history produce no false findings', () => {
  assert.deepEqual(checkTemporal({ declared: {}, git: null }), []);
  assert.deepEqual(
    checkTemporal({ declared: {}, git: { first: '2026-01-01T00:00:00Z', last: '2026-02-15T00:00:00Z' } }),
    [],
  );
  assert.deepEqual(checkTemporal({ declared: { created: 'not-a-date', modified: 'also-not' }, git: null }), []);
});

test('detectDateClustering flags bulk imports and ignores tiny corpora', () => {
  const bulk = Array(20).fill('2026-07-30T12:00:00Z');
  assert.equal(detectDateClustering(bulk), true);
  const spread = Array.from({ length: 20 }, (_, i) => `2026-07-${String(1 + i).padStart(2, '0')}T12:00:00Z`);
  assert.equal(detectDateClustering(spread), false);
  // Below minFiles there is not enough signal to call anything a cluster.
  assert.equal(detectDateClustering(Array(5).fill('2026-07-30T12:00:00Z')), false);
});

test('gitDatesOf returns real first/last dates in a repo and null outside one', () => {
  const dir = mkdtempSync(join(tmpdir(), 'temporal-git-'));
  try {
    writeFileSync(join(dir, 'doc.md'), 'v1\n');
    assert.equal(gitDatesOf('doc.md', { cwd: dir }), null); // no repo yet
    const git = (dates, ...args) =>
      execFileSync('git', ['-c', 'core.hooksPath=/dev/null', ...args], {
        cwd: dir,
        encoding: 'utf8',
        env: gitEnv(dir, dates),
      });
    const jan = { GIT_AUTHOR_DATE: '2026-01-01T00:00:00Z', GIT_COMMITTER_DATE: '2026-01-01T00:00:00Z' };
    const feb = { GIT_AUTHOR_DATE: '2026-02-01T00:00:00Z', GIT_COMMITTER_DATE: '2026-02-01T00:00:00Z' };
    git(jan, 'init', '-q');
    git(jan, 'add', 'doc.md');
    git(jan, 'commit', '-q', '-m', 'first');
    writeFileSync(join(dir, 'doc.md'), 'v2\n');
    git(feb, 'commit', '-q', '-am', 'second');
    const dates = gitDatesOf('doc.md', { cwd: dir });
    assert.ok(dates.first.startsWith('2026-01-01'));
    assert.ok(dates.last.startsWith('2026-02-01'));
    assert.equal(gitDatesOf('never-committed.md', { cwd: dir }), null);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('declared created after the first git commit is a low-confidence advisory', () => {
  // Review finding: this whole branch was deletable without failing a test.
  const findings = checkTemporal({
    declared: { created: '2026-03-01', modified: '2026-03-01' },
    git: { first: '2026-01-01T00:00:00Z', last: '2026-03-01T00:00:00Z' },
  });
  assert.equal(findings.length, 1);
  assert.equal(findings[0].advisory, true);
  assert.equal(findings[0].confidence, 'low');
  assert.match(findings[0].summary, /postdates the file's first git commit/);
});

test('git-derived findings carry demoted confidence, never high', () => {
  const stale = { declared: { created: '2026-01-01', modified: '2026-01-05' }, git: { first: '2026-01-01T00:00:00Z', last: '2026-02-15T00:00:00Z' } };
  assert.equal(checkTemporal(stale)[0].confidence, 'medium');
  assert.equal(checkTemporal({ ...stale, clustered: true })[0].confidence, 'low');
  const contradiction = checkTemporal({ declared: { created: '2026-03-01', modified: '2026-02-01' }, git: null });
  assert.equal(contradiction[0].confidence, 'high');
});

test('isShallowRepo detects a depth-1 clone; gitDatesOf callers must gate on it', () => {
  const dir = mkdtempSync(join(tmpdir(), 'temporal-shallow-'));
  try {
    const src = join(dir, 'src');
    const shallow = join(dir, 'shallow');
    const git = (cwd, dates, ...args) =>
      execFileSync('git', ['-c', 'core.hooksPath=/dev/null', ...args], { cwd, encoding: 'utf8', env: gitEnv(dir, dates) });
    const jan = { GIT_AUTHOR_DATE: '2026-01-01T00:00:00Z', GIT_COMMITTER_DATE: '2026-01-01T00:00:00Z' };
    const feb = { GIT_AUTHOR_DATE: '2026-02-01T00:00:00Z', GIT_COMMITTER_DATE: '2026-02-01T00:00:00Z' };
    execFileSync('git', ['init', '-q', src], { encoding: 'utf8', env: gitEnv(dir) });
    writeFileSync(join(src, 'doc.md'), 'v1\n');
    git(src, jan, 'add', 'doc.md');
    git(src, jan, 'commit', '-q', '-m', 'first');
    writeFileSync(join(src, 'doc.md'), 'v2\n');
    git(src, feb, 'commit', '-q', '-am', 'second');
    execFileSync('git', ['clone', '-q', '--depth', '1', `file://${src}`, shallow], {
      encoding: 'utf8',
      env: gitEnv(dir),
    });
    assert.equal(isShallowRepo(shallow), true);
    assert.equal(isShallowRepo(src), false);
    // The fabrication the gate exists for: in the shallow clone, the file's
    // "first" date is the truncated tip, not the real 2026-01-01.
    const dates = gitDatesOf('doc.md', { cwd: shallow });
    assert.ok(dates.first.startsWith('2026-02-01'), 'shallow history fabricates first-commit dates');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
