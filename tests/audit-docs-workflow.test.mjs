// Regression tests for the scope-safety logic in workflows/audit-docs.js.
//
// workflows/audit-docs.js is a dynamic Workflow-tool script, not a normal ES
// module: everything after its required `export const meta = {...}` block
// executes inside the Workflow runtime's own async-wrapped context (top-level
// await/return, injected agent()/parallel()/pipeline()/phase()/log()
// globals), which does not support additional `export` statements — adding
// one is a syntax error in that context. So these tests do NOT import from
// workflows/audit-docs.js; they mirror the three pure, side-effect-free
// functions byte-for-byte (normalizeForContainment, isWithinGivenPaths,
// looksLikeFilePath — see workflows/audit-docs.js lines ~192-207). If those
// functions change, update the copies below to match, or this file silently
// stops testing the real logic.
//
// This exists because a real incident (2026-07-29) had the discovery agent
// ignore a single given file path and return 240 files from the whole repo
// instead. The fix was this containment logic; these tests reproduce that
// exact scenario so a regression is caught mechanically, not by re-running
// a live Workflow and watching what happens.

import { test } from 'node:test';
import assert from 'node:assert/strict';

// --- mirrored from workflows/audit-docs.js — keep byte-identical ---
function normalizeForContainment(p) {
  return String(p).replace(/\\/g, '/').replace(/\/+$/, '')
}
function isWithinGivenPaths(file, givenPaths) {
  const nf = normalizeForContainment(file)
  return givenPaths.some(gp => {
    const ng = normalizeForContainment(gp)
    return nf === ng || nf.startsWith(ng + '/')
  })
}
function looksLikeFilePath(p) {
  return /\.[a-zA-Z0-9]+$/.test(String(p))
}
// --- end mirrored section ---

test('a path with a file extension classifies as a literal file, not a directory', () => {
  assert.equal(looksLikeFilePath('/repo/skills/adr/templates/good-l1.md'), true);
  assert.equal(looksLikeFilePath('/repo/docs/index.mdx'), true);
  assert.equal(looksLikeFilePath('/repo/CHANGELOG.md'), true);
});

test('an extension-less path does not classify as a literal file', () => {
  assert.equal(looksLikeFilePath('/repo/skills/adr/templates'), false);
  assert.equal(looksLikeFilePath('/repo/docs'), false);
  assert.equal(looksLikeFilePath('/repo'), false);
});

test('containment: a file at or nested under a given path is in scope', () => {
  assert.equal(
    isWithinGivenPaths('/repo/skills/adr/templates/good-l1.md', ['/repo/skills/adr/templates/good-l1.md']),
    true,
    'the exact given file is within itself'
  );
  assert.equal(
    isWithinGivenPaths('/repo/skills/adr/templates/good-l1.md', ['/repo/skills/adr/templates']),
    true,
    'a file nested under a given directory is in scope'
  );
  assert.equal(
    isWithinGivenPaths('/repo/skills/adr/templates/good-l1.md', ['/repo/skills/adr/templates/']),
    true,
    'a trailing slash on the given directory does not break containment'
  );
});

test('containment: a sibling/parent/unrelated path is out of scope — reproduces the actual incident', () => {
  // The real incident: one file was given, discovery returned ~240 files across the whole repo.
  // This is that scenario at reproducible scale — one given file, several unrelated real files
  // a broken discovery step could plausibly return, and every one of them must be rejected.
  const given = ['/repo/skills/google-design-doc/templates/good-l1.md'];
  const wronglyReturned = [
    '/repo/skills/google-design-doc/templates/good-l1.md', // the one correct file
    '/repo/skills/adr/SKILL.md',                            // sibling skill — out of scope
    '/repo/CHANGELOG.md',                                   // repo root — out of scope
    '/repo/docs/explanation/documentation-taxonomy.md',     // unrelated subtree — out of scope
  ];

  const inScope = wronglyReturned.filter(f => isWithinGivenPaths(f, given));
  const outOfScope = wronglyReturned.filter(f => !isWithinGivenPaths(f, given));

  assert.deepEqual(inScope, ['/repo/skills/google-design-doc/templates/good-l1.md']);
  assert.equal(outOfScope.length, 3, 'all 3 unrelated files must be rejected, not silently kept');
});

test('containment: a file NOT nested under a given directory is out of scope (prefix-confusion case)', () => {
  // A naive prefix check (startsWith) without the '/' boundary would wrongly admit
  // /repo/skills-other/... as being "within" /repo/skills — this guards that specifically.
  assert.equal(
    isWithinGivenPaths('/repo/skills-other/x.md', ['/repo/skills']),
    false
  );
  assert.equal(
    isWithinGivenPaths('/etc/passwd', ['/repo/skills/adr/templates/good-l1.md']),
    false
  );
});

test('a discovery result with zero in-scope files signals failure rather than silently succeeding', () => {
  // Mirrors the real guard in workflows/audit-docs.js: `if (discovery.files.length && !inScope.length) throw`.
  // A discovery agent that returns files, none of which are actually in scope, means discovery
  // failed for this input — that must be distinguishable from "correctly found nothing".
  const directoryPaths = ['/repo/skills/google-design-doc/templates'];
  const simulatedBadDiscovery = { files: ['/repo/skills/adr/SKILL.md'], excluded: [] };

  const inScope = simulatedBadDiscovery.files.filter(f => isWithinGivenPaths(f, directoryPaths));

  const wouldThrow = simulatedBadDiscovery.files.length > 0 && inScope.length === 0;
  assert.equal(wouldThrow, true, 'all-out-of-scope discovery result must be treated as a failure, not empty success');

  // Contrast: genuinely finding nothing (empty files array) is NOT the failure case above.
  const genuinelyEmpty = { files: [], excluded: [] };
  const genuinelyEmptyInScope = genuinelyEmpty.files.filter(f => isWithinGivenPaths(f, directoryPaths));
  const genuinelyEmptyWouldThrow = genuinelyEmpty.files.length > 0 && genuinelyEmptyInScope.length === 0;
  assert.equal(genuinelyEmptyWouldThrow, false, 'zero files found is a legitimate empty result, not a thrown error');
});
