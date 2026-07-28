// Acceptance tests for the taxonomy pointer hook (hooks/taxonomy-session-start.mjs).
//
// The hook has two obligations and these tests prove both. It must emit a
// SessionStart additionalContext pointer that stays resolvable wherever the
// agent later reads it — an absolute path, invariant under the payload's cwd —
// and it must fail open, never blocking, delaying, or altering a session on any
// malformed input.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, isAbsolute, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const hook = join(root, 'hooks', 'taxonomy-session-start.mjs');
const TAXONOMY_DOC = join(root, 'docs', 'explanation', 'documentation-taxonomy.md');

function runHook(input) {
  return spawnSync('node', [hook], { input, encoding: 'utf8', cwd: root });
}

function contextFrom(result) {
  const parsed = JSON.parse(result.stdout);
  return parsed.hookSpecificOutput.additionalContext;
}

test('emits a well-formed SessionStart hookSpecificOutput payload', () => {
  const r = runHook(JSON.stringify({ cwd: root, session_id: 'abc' }));
  assert.equal(r.status, 0, `expected exit 0, got ${r.status}: ${r.stderr}`);
  const parsed = JSON.parse(r.stdout);
  assert.equal(parsed.hookSpecificOutput.hookEventName, 'SessionStart');
  assert.equal(typeof parsed.hookSpecificOutput.additionalContext, 'string');
});

test('names all three conceptType buckets', () => {
  const ctx = contextFrom(runHook(JSON.stringify({ cwd: root })));
  for (const bucket of ['semantic', 'episodic', 'procedural']) {
    assert.match(ctx, new RegExp(bucket), `additionalContext must name ${bucket}`);
  }
});

test('the emitted doc pointer is an absolute path that exists', () => {
  // The pointer is read later, by a Read call that requires an absolute path,
  // from whatever directory the agent is in by then. A path relative to the
  // session's cwd would stop resolving the moment the agent moved.
  const ctx = contextFrom(runHook(JSON.stringify({ cwd: root })));
  const match = ctx.match(/rules: (\S+)$/);
  assert.ok(match, `additionalContext must end with the doc path, got: ${ctx}`);
  const emitted = match[1];
  assert.ok(isAbsolute(emitted), `emitted doc pointer must be absolute, got: ${emitted}`);
  assert.equal(emitted, TAXONOMY_DOC);
  assert.ok(existsSync(emitted), `emitted doc pointer must exist on disk: ${emitted}`);
});

test('the emitted doc pointer does not vary with the payload cwd', () => {
  // Regression for the review of #172: the pointer was computed as
  // relative(payload.cwd, docPath), so the same plugin emitted a different —
  // and outside a project tree, nonsensical — reference for every session,
  // e.g. "../../Users/me/.claude/plugins/.../documentation-taxonomy.md".
  const a = contextFrom(runHook(JSON.stringify({ cwd: '/tmp/project-one' })));
  const b = contextFrom(runHook(JSON.stringify({ cwd: '/some/deeply/nested/other/project' })));
  assert.equal(a, b, 'additionalContext must be identical regardless of the session cwd');
  assert.ok(a.includes(TAXONOMY_DOC), `expected the absolute doc path in: ${a}`);
});

test('a payload with no cwd still emits the same absolute pointer', () => {
  const withCwd = contextFrom(runHook(JSON.stringify({ cwd: '/tmp/project-one' })));
  const withoutCwd = contextFrom(runHook(JSON.stringify({ session_id: 'abc' })));
  assert.equal(withoutCwd, withCwd);
});

test('fail-open: a malformed payload exits 0 with no output', () => {
  const r = runHook('{ not json at all');
  assert.equal(r.status, 0, 'a malformed payload must never block the session');
  assert.equal(r.stdout, '', 'no partial output may be emitted on the error path');
});

test('fail-open: an empty payload exits 0 with no output', () => {
  const r = runHook('');
  assert.equal(r.status, 0, 'an empty payload must never block the session');
  assert.equal(r.stdout, '');
});

test('the emitted JSON is newline-terminated, like every other hook output', () => {
  const r = runHook(JSON.stringify({ cwd: root }));
  assert.ok(r.stdout.endsWith('\n'), 'hookSpecificOutput writes are newline-terminated');
});
