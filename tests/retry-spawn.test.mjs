// Unit tests for scripts/lib/retry-spawn.mjs — the bounded retry wrapper
// hooks/mif-guard.mjs uses around its inner validator spawnSync call (#146).
//
// Deliberately deterministic and OS-independent: spawnFn and sleepFn are
// injected fakes throughout, so these tests never actually launch a
// subprocess or really sleep, and never depend on real resource contention
// to exercise the retry path.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  spawnSyncWithRetry,
  isTransientSpawnError,
  TRANSIENT_SPAWN_ERROR_CODES,
} from '../scripts/lib/retry-spawn.mjs';

function fakeResult({ error, status = null, stdout = '', stderr = '' } = {}) {
  return { error, status, stdout, stderr, signal: null };
}

test('a successful first attempt is returned immediately, no retry, no sleep', () => {
  const success = fakeResult({ status: 0, stdout: 'ok' });
  let calls = 0;
  let sleeps = 0;
  const res = spawnSyncWithRetry(
    () => {
      calls += 1;
      return success;
    },
    [],
    { sleepFn: () => { sleeps += 1; } },
  );
  assert.equal(res, success);
  assert.equal(calls, 1);
  assert.equal(sleeps, 0);
});

test('a real (non-transient) spawn error is returned immediately, never retried', () => {
  // ENOENT: the target genuinely does not exist — retrying can never help,
  // so this must surface on the first attempt exactly like before #146.
  const enoent = fakeResult({ error: Object.assign(new Error('not found'), { code: 'ENOENT' }) });
  let calls = 0;
  const res = spawnSyncWithRetry(
    () => {
      calls += 1;
      return enoent;
    },
    [],
    { sleepFn: () => assert.fail('must not sleep/retry a non-transient spawn error') },
  );
  assert.equal(res, enoent);
  assert.equal(calls, 1);
});

test('the subprocess actually running and exiting non-zero is never retried', () => {
  // This is the "real conformance failure" case, not a launch failure:
  // res.error is unset even though status !== 0. Retrying here would just
  // waste time re-running a validator that already gave a real verdict.
  const nonConformant = fakeResult({ status: 2, stderr: 'NOT MIF-conformant' });
  let calls = 0;
  const res = spawnSyncWithRetry(
    () => {
      calls += 1;
      return nonConformant;
    },
    [],
    { sleepFn: () => assert.fail('must not sleep/retry a real non-zero exit') },
  );
  assert.equal(res, nonConformant);
  assert.equal(calls, 1);
});

for (const code of TRANSIENT_SPAWN_ERROR_CODES) {
  test(`a transient ${code} spawn error is retried and the eventual success is returned`, () => {
    const transient = fakeResult({ error: Object.assign(new Error('resource'), { code } ) });
    const success = fakeResult({ status: 0, stdout: 'ok' });
    let calls = 0;
    let sleeps = 0;
    const res = spawnSyncWithRetry(
      () => {
        calls += 1;
        return calls < 2 ? transient : success;
      },
      [],
      { sleepFn: () => { sleeps += 1; } },
    );
    assert.equal(res, success, `expected the retried call's success to win for ${code}`);
    assert.equal(calls, 2);
    assert.equal(sleeps, 1, 'exactly one sleep between the failed attempt and the retry');
  });
}

test('retries back off (later delays are longer) and stop at maxAttempts', () => {
  const transient = fakeResult({ error: Object.assign(new Error('resource'), { code: 'EAGAIN' }) });
  const delays = [];
  let calls = 0;
  const res = spawnSyncWithRetry(
    () => {
      calls += 1;
      return transient; // never succeeds
    },
    [],
    { maxAttempts: 3, retryDelayMs: 50, sleepFn: (ms) => delays.push(ms) },
  );
  assert.equal(res, transient, 'exhausted retries return the last (still-failing) result, not throw');
  assert.equal(calls, 3, 'stops at maxAttempts, does not retry forever');
  assert.deepEqual(delays, [50, 100], 'later retries back off with a longer delay');
});

test('a custom isTransient predicate is honored instead of the default code list', () => {
  const weird = fakeResult({ error: Object.assign(new Error('custom'), { code: 'EWEIRD' }) });
  const success = fakeResult({ status: 0 });
  let calls = 0;
  const res = spawnSyncWithRetry(
    () => {
      calls += 1;
      return calls < 2 ? weird : success;
    },
    [],
    { sleepFn: () => {}, isTransient: (r) => r?.error?.code === 'EWEIRD' },
  );
  assert.equal(res, success);
  assert.equal(calls, 2);
});

test('isTransientSpawnError recognizes exactly the documented resource-exhaustion codes', () => {
  for (const code of ['EAGAIN', 'ENOMEM', 'EMFILE', 'ENFILE']) {
    assert.ok(
      isTransientSpawnError(fakeResult({ error: Object.assign(new Error(code), { code } ) })),
      `${code} must be treated as transient`,
    );
  }
  for (const code of ['ENOENT', 'EACCES', undefined]) {
    assert.equal(
      isTransientSpawnError(fakeResult({ error: code ? Object.assign(new Error(code), { code } ) : undefined })),
      false,
      `${code} must NOT be treated as transient`,
    );
  }
  assert.equal(isTransientSpawnError(fakeResult({ status: 0 })), false, 'no error at all is not transient');
});

test('maxAttempts: 0 (or any non-positive/non-integer value) still calls spawnFn at least once instead of returning undefined', () => {
  const success = fakeResult({ status: 0, stdout: 'ok' });
  for (const bad of [0, -1, 1.5, NaN, 'nope', undefined, null]) {
    let calls = 0;
    const res = spawnSyncWithRetry(
      () => {
        calls += 1;
        return success;
      },
      [],
      { maxAttempts: bad, sleepFn: () => {} },
    );
    assert.equal(res, success, `maxAttempts=${bad} must not surface as undefined`);
    assert.equal(calls, 1, `maxAttempts=${bad} must still invoke spawnFn exactly once`);
  }
});

test('retryDelayMs: a negative/non-finite value is normalized to 0 instead of passed through to sleepFn', () => {
  const transient = fakeResult({ error: Object.assign(new Error('resource'), { code: 'EAGAIN' }) });
  const success = fakeResult({ status: 0 });
  // `undefined` deliberately excluded: it triggers the opts destructuring
  // default (50), which is correct pass-through behavior, not the bad-input
  // case this test targets.
  for (const bad of [-50, NaN, 'nope', null]) {
    let calls = 0;
    const delays = [];
    const res = spawnSyncWithRetry(
      () => {
        calls += 1;
        return calls < 2 ? transient : success;
      },
      [],
      { maxAttempts: 2, retryDelayMs: bad, sleepFn: (ms) => delays.push(ms) },
    );
    assert.equal(res, success);
    assert.deepEqual(delays, [0], `retryDelayMs=${bad} must normalize to a non-negative delay`);
  }
});

test('scripts/lib/retry-spawn.mjs stays dependency-free (no imports)', () => {
  // Same discipline as scripts/lib/mif-identity-signal-keys.mjs: this module
  // backs a hook that fires on every Write/Edit tool call, so it must not
  // gain a transitive dependency by accident.
  const source = readFileSync(
    new URL('../scripts/lib/retry-spawn.mjs', import.meta.url),
    'utf8',
  );
  assert.ok(!/^\s*import\b/m.test(source), 'retry-spawn.mjs must not import anything');
});
