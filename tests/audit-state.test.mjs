// Tests for scripts/lib/audit-state.mjs -- the incremental gating that lets a
// re-run over an unchanged corpus cost zero Agent calls, and the invalidation
// rules that decide when prior verdicts can no longer be trusted.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  STATE_SCHEMA_ID,
  sha256,
  sha256OfFiles,
  genreOfText,
  genreSkillKey,
  discoverFiles,
  loadState,
  partitionFiles,
  commitState,
} from '../scripts/lib/audit-state.mjs';

const MIF_DOC = (title, extra = '') => `---\ntype: how-to\ntitle: ${title}\n${extra}---\n\n# ${title}\n`;

function withTempDir(fn) {
  const dir = mkdtempSync(join(tmpdir(), 'audit-state-'));
  const prev = process.cwd();
  try {
    process.chdir(dir);
    fn(dir);
  } finally {
    process.chdir(prev);
    rmSync(dir, { recursive: true, force: true });
  }
}

test('genreOfText reads the top-level type, honors the ADR carve-out, defaults unknown', () => {
  assert.equal(genreOfText(MIF_DOC('A')), 'how-to');
  assert.equal(genreOfText('---\ntype: adr\n---\nbody'), 'adr');
  assert.equal(genreOfText('---\nx-ontology:\n  id: mif-docs\n---\nbody'), 'unknown');
  assert.equal(genreOfText('no frontmatter at all'), 'unknown');
});

test('discoverFiles: dirs recurse to MIF-signal docs only, literal files pass through', () => {
  withTempDir(() => {
    mkdirSync('docs/how-to', { recursive: true });
    writeFileSync('docs/how-to/real.md', MIF_DOC('Real'));
    writeFileSync('docs/how-to/plain.md', '# Just markdown, no frontmatter\n');
    writeFileSync('docs/adr-0001.md', '---\ntype: adr\nstatus: accepted\n---\n# ADR\n');
    writeFileSync('notes.md', '# not MIF\n');
    assert.deepEqual(discoverFiles(['docs']), ['docs/adr-0001.md', 'docs/how-to/real.md']);
    // A literal file path is audited even without a genre signal.
    assert.deepEqual(discoverFiles(['notes.md']), ['notes.md']);
    assert.throws(() => discoverFiles(['missing-dir']), /path not found/);
  });
});

test('partition: no prior state marks everything dirty; commit then repartition marks everything clean', () => {
  withTempDir(() => {
    mkdirSync('docs', { recursive: true });
    writeFileSync('docs/a.md', MIF_DOC('A'));
    writeFileSync('docs/b.md', MIF_DOC('B'));
    const files = discoverFiles(['docs']);
    const checksVersion = 'v1';

    const first = partitionFiles({ state: null, files, checksVersion });
    assert.equal(first.dirty.length, 2);
    assert.equal(first.clean.length, 0);
    assert.equal(first.reasons['docs/a.md'], 'no prior state');

    const state = commitState({
      statePath: 'state/audit-state.json',
      state: null,
      checksVersion,
      pluginVersion: '0.0.0',
      files,
      results: files.map((file) => ({ file, llm_verdict: 'clean' })),
    });
    assert.equal(state.schema, STATE_SCHEMA_ID);
    assert.equal(Object.keys(state.entries).length, 2);

    const second = partitionFiles({ state: loadState('state/audit-state.json'), files, checksVersion });
    assert.equal(second.dirty.length, 0);
    assert.equal(second.clean.length, 2);
  });
});

test('invalidation: content change dirties exactly that file, with the reason recorded', () => {
  withTempDir(() => {
    mkdirSync('docs', { recursive: true });
    writeFileSync('docs/a.md', MIF_DOC('A'));
    writeFileSync('docs/b.md', MIF_DOC('B'));
    const files = discoverFiles(['docs']);
    const state = commitState({
      statePath: 's.json',
      state: null,
      checksVersion: 'v1',
      files,
      results: files.map((file) => ({ file, llm_verdict: 'clean' })),
    });
    writeFileSync('docs/b.md', MIF_DOC('B', 'edited: true\n'));
    const p = partitionFiles({ state, files, checksVersion: 'v1' });
    assert.deepEqual(p.dirty.map((d) => d.file), ['docs/b.md']);
    assert.equal(p.reasons['docs/b.md'], 'content changed');
  });
});

test('invalidation: a checks_version change dirties the whole corpus', () => {
  withTempDir(() => {
    mkdirSync('docs', { recursive: true });
    writeFileSync('docs/a.md', MIF_DOC('A'));
    const files = discoverFiles(['docs']);
    const state = commitState({
      statePath: 's.json',
      state: null,
      checksVersion: 'v1',
      files,
      results: files.map((file) => ({ file, llm_verdict: 'clean' })),
    });
    const p = partitionFiles({ state, files, checksVersion: 'v2' });
    assert.equal(p.dirty.length, 1);
    assert.match(p.reasons['docs/a.md'], /checks_version changed/);
  });
});

test('invalidation: a genre skill change dirties only that genre', () => {
  withTempDir(() => {
    mkdirSync('docs', { recursive: true });
    mkdirSync('skills/diataxis-how-to', { recursive: true });
    mkdirSync('skills/changelog', { recursive: true });
    writeFileSync('skills/diataxis-how-to/SKILL.md', 'how-to rules v1');
    writeFileSync('skills/changelog/SKILL.md', 'changelog rules v1');
    writeFileSync('docs/guide.md', MIF_DOC('Guide')); // type: how-to
    writeFileSync('docs/log.md', '---\ntype: changelog\ntitle: Log\n---\n# Log\n');
    const files = discoverFiles(['docs']);

    const fresh = partitionFiles({ state: null, files, checksVersion: 'v1', skillsRoot: 'skills' });
    const state = commitState({
      statePath: 's.json',
      state: null,
      checksVersion: 'v1',
      files,
      results: fresh.dirty.map((m) => ({
        file: m.file,
        llm_verdict: 'clean',
        genre_skill_key: m.genre_skill_key,
        genre_skill_sha256: m.genre_skill_sha256,
      })),
    });

    writeFileSync('skills/diataxis-how-to/SKILL.md', 'how-to rules v2 -- stricter');
    const p = partitionFiles({ state, files, checksVersion: 'v1', skillsRoot: 'skills' });
    assert.deepEqual(p.dirty.map((d) => d.file), ['docs/guide.md']);
    assert.match(p.reasons['docs/guide.md'], /genre skill "diataxis-how-to" changed/);
  });
});

test('--full dirties everything regardless of state', () => {
  withTempDir(() => {
    mkdirSync('docs', { recursive: true });
    writeFileSync('docs/a.md', MIF_DOC('A'));
    const files = discoverFiles(['docs']);
    const state = commitState({
      statePath: 's.json',
      state: null,
      checksVersion: 'v1',
      files,
      results: files.map((file) => ({ file, llm_verdict: 'clean' })),
    });
    const p = partitionFiles({ state, files, checksVersion: 'v1', full: true });
    assert.equal(p.dirty.length, 1);
    assert.equal(p.reasons['docs/a.md'], '--full requested');
  });
});

test('commitState drops entries for files no longer in the corpus and rejects nothing silently', () => {
  withTempDir(() => {
    mkdirSync('docs', { recursive: true });
    writeFileSync('docs/a.md', MIF_DOC('A'));
    writeFileSync('docs/b.md', MIF_DOC('B'));
    let files = discoverFiles(['docs']);
    const state = commitState({
      statePath: 's.json',
      state: null,
      checksVersion: 'v1',
      files,
      results: files.map((file) => ({ file, llm_verdict: 'clean' })),
    });
    rmSync('docs/b.md');
    files = discoverFiles(['docs']);
    const next = commitState({ statePath: 's.json', state, checksVersion: 'v1', files, results: [] });
    assert.deepEqual(Object.keys(next.entries), ['docs/a.md']);
    // The written file round-trips through loadState.
    assert.equal(loadState('s.json').checks_version, 'v1');
  });
});

test('genreSkillKey resolves exact dirs, diataxis- prefixed dirs, and "*" fallback', () => {
  withTempDir(() => {
    mkdirSync('skills/changelog', { recursive: true });
    mkdirSync('skills/diataxis-how-to', { recursive: true });
    assert.equal(genreSkillKey('changelog', 'skills').key, 'changelog');
    assert.equal(genreSkillKey('how-to', 'skills').key, 'diataxis-how-to');
    assert.equal(genreSkillKey('unknown', 'skills').key, '*');
  });
});

test('sha256OfFiles is order-independent and content-sensitive', () => {
  withTempDir(() => {
    writeFileSync('x.txt', 'one');
    writeFileSync('y.txt', 'two');
    const a = sha256OfFiles(['x.txt', 'y.txt']);
    const b = sha256OfFiles(['y.txt', 'x.txt']);
    assert.equal(a, b);
    writeFileSync('y.txt', 'two-changed');
    assert.notEqual(sha256OfFiles(['x.txt', 'y.txt']), a);
    assert.equal(sha256('abc'), sha256('abc'));
  });
});
