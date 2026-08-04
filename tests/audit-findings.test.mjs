// Tests for scripts/lib/audit-findings.mjs -- the pinned finding schema that
// makes Agent batch output validatable instead of free-form (the 2026-07-30
// gdlc audit's batch-1 agents returned mixed YAML/JSON/prose with invented
// check_ids; this schema is the structural fix).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SCHEMA_ID,
  CHECKS,
  CHECK_IDS,
  CHECK_IDS_BY_TIER,
  validateFinding,
  validateFindings,
} from '../scripts/lib/audit-findings.mjs';

function goodFinding(overrides = {}) {
  return {
    check_id: 'genre-conformance',
    files: ['docs/how-to/a.md'],
    anchor: { line: 12, excerpt: 'the offending text' },
    severity: 'medium',
    confidence: 'high',
    summary: 'Missing prerequisites section.',
    evidence: 'Read docs/how-to/a.md; no Prerequisites heading before step 1.',
    recommendation: 'Add a Prerequisites section before the numbered steps.',
    fixable: false,
    ...overrides,
  };
}

function goodPayload(overrides = {}) {
  return {
    schema: SCHEMA_ID,
    batch_id: 'b01',
    files_audited: ['docs/how-to/a.md', 'docs/how-to/b.md'],
    files_clean: ['docs/how-to/b.md'],
    findings: [goodFinding()],
    ...overrides,
  };
}

test('the registry holds exactly 17 checks partitioned across three tiers', () => {
  assert.equal(CHECKS.length, 17);
  assert.equal(CHECK_IDS.length, new Set(CHECK_IDS).size);
  const tierTotal =
    CHECK_IDS_BY_TIER['deterministic'].length +
    CHECK_IDS_BY_TIER['cross-doc'].length +
    CHECK_IDS_BY_TIER['judgment'].length;
  assert.equal(tierTotal, 17);
  assert.equal(CHECK_IDS_BY_TIER['cross-doc'].length, 3);
});

test('a well-formed payload validates', () => {
  const { ok, errors } = validateFindings(goodPayload());
  assert.deepEqual(errors, []);
  assert.equal(ok, true);
});

test('an invented check_id is rejected -- the enum is closed', () => {
  const { ok, errors } = validateFindings(goodPayload({ findings: [goodFinding({ check_id: 'vibe-check' })] }));
  assert.equal(ok, false);
  assert.ok(errors.some((e) => e.includes('vibe-check')));
});

test('allowedCheckIds narrows scope below the full registry', () => {
  const payload = goodPayload({ findings: [goodFinding({ check_id: 'link-integrity' })] });
  // link-integrity is a real registry id, but a judgment-batch agent must
  // never report it -- scripts already decided it.
  const { ok, errors } = validateFindings(payload, {
    allowedCheckIds: CHECK_IDS_BY_TIER['judgment'],
  });
  assert.equal(ok, false);
  assert.ok(errors.some((e) => e.includes('outside this call\'s allowed scope')));
});

test('per-file accounting: every assigned file must be audited and accounted for', () => {
  const expectedFiles = ['docs/how-to/a.md', 'docs/how-to/b.md', 'docs/how-to/c.md'];
  // c.md is assigned but neither in files_audited nor accounted for.
  const { ok, errors } = validateFindings(goodPayload(), { expectedFiles });
  assert.equal(ok, false);
  assert.ok(errors.some((e) => e.includes('c.md') && e.includes('missing')));
});

test('per-file accounting: a file with no finding must appear in files_clean', () => {
  const payload = goodPayload({ files_clean: [] });
  const { ok, errors } = validateFindings(payload, { expectedFiles: payload.files_audited });
  assert.equal(ok, false);
  assert.ok(errors.some((e) => e.includes('b.md') && e.includes('unaccounted')));
});

test('severity and confidence are closed enums', () => {
  assert.ok(validateFinding(goodFinding({ severity: 'critical' })).length > 0);
  assert.ok(validateFinding(goodFinding({ confidence: 'certain' })).length > 0);
  assert.deepEqual(validateFinding(goodFinding({ confidence: undefined })), []);
});

test('non-JSON and structurally broken payloads fail loudly, never pass', () => {
  assert.equal(validateFindings(null).ok, false);
  assert.equal(validateFindings('a prose answer').ok, false);
  assert.equal(validateFindings({ schema: SCHEMA_ID }).ok, false);
  assert.equal(validateFindings(goodPayload({ schema: 'mif-docs/audit-findings@0' })).ok, false);
});

test('a multi-file shared-pattern finding validates (the dedup shape)', () => {
  const shared = goodFinding({
    files: ['docs/how-to/a.md', 'docs/how-to/b.md'],
    summary: 'Same missing-prerequisites pattern in both files.',
  });
  const payload = goodPayload({ findings: [shared], files_clean: [] });
  const { ok, errors } = validateFindings(payload, { expectedFiles: payload.files_audited });
  assert.deepEqual(errors, []);
  assert.equal(ok, true);
});
