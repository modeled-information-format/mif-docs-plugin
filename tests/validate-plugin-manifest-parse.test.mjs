// Regression tests for mif-docs-plugin#182: a malformed .claude-plugin/plugin.json
// or .claude-plugin/marketplace.json must surface as a structured entry in the
// gate's own VALIDATION FAILED report, not as an unhandled SyntaxError stack
// trace. Section 3 (.mcp.json) already guarded its readJson() call; these tests
// hold the same guarantee for the other two manifest reads.
//
// The validator is exercised as a subprocess against a temp fixture root via
// the VALIDATE_PLUGIN_ROOT test hook, because its ROOT is otherwise fixed to
// this repository itself.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const script = join(dirname(fileURLToPath(import.meta.url)), '..', 'scripts', 'validate-plugin.mjs');

const VALID_PLUGIN = JSON.stringify({
  name: 'fixture-plugin',
  description: 'a fixture plugin',
  version: '0.0.1',
});

const MALFORMED = '{ "name": "fixture-plugin", }'; // trailing comma

function makeRoot({ plugin, marketplace } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'validate-plugin-182-'));
  mkdirSync(join(root, '.claude-plugin'));
  if (plugin !== undefined) writeFileSync(join(root, '.claude-plugin', 'plugin.json'), plugin);
  if (marketplace !== undefined) {
    writeFileSync(join(root, '.claude-plugin', 'marketplace.json'), marketplace);
  }
  return root;
}

function run(root) {
  return spawnSync(process.execPath, [script], {
    encoding: 'utf8',
    env: { ...process.env, VALIDATE_PLUGIN_ROOT: root },
  });
}

test('a valid fixture plugin.json passes via the VALIDATE_PLUGIN_ROOT hook', () => {
  const root = makeRoot({ plugin: VALID_PLUGIN });
  try {
    const r = run(root);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /plugin: fixture-plugin/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('malformed plugin.json is reported as a validation error, not a crash', () => {
  const root = makeRoot({ plugin: MALFORMED });
  try {
    const r = run(root);
    assert.equal(r.status, 1);
    // The gate's normal failure path ran: summary line plus structured report.
    assert.match(r.stdout, /errors: 1/);
    assert.match(r.stderr, /VALIDATION FAILED:/);
    assert.match(r.stderr, /\.claude-plugin\/plugin\.json: /);
    // No unhandled-exception stack trace.
    assert.doesNotMatch(r.stderr, /at .*validate-plugin\.mjs/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('malformed marketplace.json is reported as a validation error, not a crash', () => {
  const root = makeRoot({ plugin: VALID_PLUGIN, marketplace: MALFORMED });
  try {
    const r = run(root);
    assert.equal(r.status, 1);
    assert.match(r.stdout, /errors: 1/);
    assert.match(r.stderr, /VALIDATION FAILED:/);
    assert.match(r.stderr, /\.claude-plugin\/marketplace\.json: /);
    assert.doesNotMatch(r.stderr, /at .*validate-plugin\.mjs/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('parse failures aggregate with each other instead of aborting the run', () => {
  const root = makeRoot({ plugin: MALFORMED, marketplace: MALFORMED });
  try {
    const r = run(root);
    assert.equal(r.status, 1);
    // Both manifests are reported in the same run — the first failure did not
    // terminate the script before the second read.
    assert.match(r.stdout, /errors: 2/);
    assert.match(r.stderr, /\.claude-plugin\/plugin\.json: /);
    assert.match(r.stderr, /\.claude-plugin\/marketplace\.json: /);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
