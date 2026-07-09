// Tests for the mif-rs tooling doctor check (scripts/doctor.mjs, mif-docs-plugin#39).
//
// The lib pieces (PATH resolution, version comparison) are tested directly
// with injected inputs so they don't depend on what is actually installed on
// the machine running the tests. The CLI itself is exercised as a subprocess
// only to prove the one invariant that matters for an advisory tool: it must
// always exit 0, regardless of what it finds.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync, chmodSync } from 'node:fs';
import { join, dirname, delimiter } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { findOnPath, compareVersions } from '../scripts/lib/doctor.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

test('findOnPath returns null when the binary is nowhere on PATH', () => {
  const scratch = mkdtempSync(join(tmpdir(), 'doctor-test-'));
  try {
    assert.equal(findOnPath('definitely-not-a-real-binary', { pathEnv: scratch }), null);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

test('findOnPath finds an executable file on PATH (POSIX)', () => {
  const scratch = mkdtempSync(join(tmpdir(), 'doctor-test-'));
  const bin = join(scratch, 'fake-tool');
  writeFileSync(bin, '#!/bin/sh\necho hi\n');
  chmodSync(bin, 0o755);
  try {
    assert.equal(findOnPath('fake-tool', { pathEnv: scratch, platform: 'linux' }), bin);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

test('findOnPath ignores a non-executable file with the right name', () => {
  const scratch = mkdtempSync(join(tmpdir(), 'doctor-test-'));
  const bin = join(scratch, 'fake-tool');
  writeFileSync(bin, 'not executable');
  chmodSync(bin, 0o644);
  try {
    assert.equal(findOnPath('fake-tool', { pathEnv: scratch, platform: 'linux' }), null);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

test('findOnPath appends .exe on win32', () => {
  const scratch = mkdtempSync(join(tmpdir(), 'doctor-test-'));
  const bin = join(scratch, 'fake-tool.exe');
  writeFileSync(bin, 'stub');
  chmodSync(bin, 0o755);
  try {
    assert.equal(findOnPath('fake-tool', { pathEnv: scratch, platform: 'win32' }), bin);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

test('findOnPath checks every PATH entry, not just the first', () => {
  const scratchA = mkdtempSync(join(tmpdir(), 'doctor-test-a-'));
  const scratchB = mkdtempSync(join(tmpdir(), 'doctor-test-b-'));
  const bin = join(scratchB, 'fake-tool');
  writeFileSync(bin, 'stub');
  chmodSync(bin, 0o755);
  try {
    const pathEnv = [scratchA, scratchB].join(delimiter);
    assert.equal(findOnPath('fake-tool', { pathEnv, platform: 'linux' }), bin);
  } finally {
    rmSync(scratchA, { recursive: true, force: true });
    rmSync(scratchB, { recursive: true, force: true });
  }
});

test('compareVersions detects a match', () => {
  assert.equal(compareVersions('mif-cli 0.6.0', 'v0.6.0').stale, false);
});

test('compareVersions detects staleness', () => {
  const cmp = compareVersions('mif-cli 0.3.1', 'v0.6.0');
  assert.equal(cmp.stale, true);
  assert.equal(cmp.relation, 'behind');
  assert.equal(cmp.local, '0.3.1');
  assert.equal(cmp.latest, '0.6.0');
});

test('compareVersions does not report a local build ahead of the latest release as stale', () => {
  // A dev build newer than the last tagged release is not a problem -- only
  // "behind" should ever set stale: true.
  const cmp = compareVersions('mif-cli 0.7.0', 'v0.6.0');
  assert.equal(cmp.relation, 'ahead');
  assert.equal(cmp.stale, false);
});

test('compareVersions returns null when the local version is unknown (mif-mcp has no --version)', () => {
  assert.equal(compareVersions(null, 'v0.6.0'), null);
});

test('compareVersions returns null when the latest tag could not be resolved', () => {
  assert.equal(compareVersions('mif-cli 0.6.0', null), null);
});

test('compareVersions returns null on an unparseable version string', () => {
  assert.equal(compareVersions('mif-cli dev-build', 'v0.6.0'), null);
});

test('the doctor CLI distinguishes a broken mif-cli from mif-mcp\'s expected no-version-output', () => {
  // Regression: a --version failure must not read the same way for both
  // binaries. mif-cli normally prints a version, so a failure there is a
  // real signal (corrupted/incompatible binary); mif-mcp has no --version
  // output by design (a stdio MCP server, not an interactive CLI), so its
  // absence is expected and must not be reported as an error.
  const scratch = mkdtempSync(join(tmpdir(), 'doctor-test-'));
  const stub = (name) => {
    const p = join(scratch, name);
    // Any invocation, --version included, exits non-zero with no stdout --
    // simulates both a broken mif-cli and the real mif-mcp's behavior.
    writeFileSync(p, '#!/bin/sh\nexit 1\n');
    chmodSync(p, 0o755);
  };
  stub('mif-cli');
  stub('mif-mcp');
  try {
    const r = spawnSync(process.execPath, [join(root, 'scripts/doctor.mjs')], {
      cwd: root,
      encoding: 'utf8',
      env: { ...process.env, PATH: scratch },
    });
    assert.equal(r.status, 0);
    assert.match(r.stdout, /mif-cli:.*VERSION CHECK FAILED/);
    assert.match(r.stdout, /mif-mcp:.*no version info \(this binary has no --version output by design\)/);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

test('the doctor CLI always exits 0, even with an empty PATH', () => {
  // An empty PATH guarantees both binaries are reported missing -- the worst
  // case for an advisory tool -- and it must still exit 0, not fail the gate.
  const r = spawnSync(process.execPath, [join(root, 'scripts/doctor.mjs')], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, PATH: '' },
  });
  assert.equal(r.status, 0, `expected exit 0, got ${r.status}: ${r.stderr}`);
  assert.match(r.stdout, /NOT FOUND on PATH/);
  assert.match(r.stdout, /advisory and always exits 0/);
});
