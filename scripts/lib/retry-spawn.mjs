// retry-spawn.mjs — a bounded retry wrapper around a synchronous "launch a
// process" call (node:child_process's spawnSync, or anything with the same
// { error, status, signal, stdout, stderr } result shape).
//
// spawnSync does NOT throw when the OS fails to launch the child; it returns
// a result object with `.error` set and `.status`/`.signal` both null. Before
// this module, hooks/mif-guard.mjs treated that exactly like "the validator
// ran and reported non-conformance" — so a transient, momentary process-
// launch failure (EAGAIN/ENOMEM/EMFILE/ENFILE, all resource-exhaustion codes
// that clear up on their own, seen under concurrent full-suite test runs
// spawning many subprocesses at once — issue #146) fail-closed BLOCKED a
// perfectly conformant document instead of retrying. A real failure — the
// binary/script genuinely doesn't exist (ENOENT), or the subprocess launched
// fine and simply exited non-zero — must still surface immediately; retrying
// either can never help and would only mask a real problem.
//
// Dependency-free by design: spawnFn/sleepFn/isTransient are all injected so
// this module never has to actually launch a subprocess (or really sleep) to
// be tested deterministically.

// Resource-exhaustion codes libuv surfaces when the OS transiently cannot
// fork/exec a new process. Not exhaustive of every possible transient errno,
// but the ones this guard has evidence of triggering under concurrent load.
export const TRANSIENT_SPAWN_ERROR_CODES = new Set(["EAGAIN", "ENOMEM", "EMFILE", "ENFILE"]);

// True only for a spawn that never actually launched, for a reason retrying
// might resolve. `res.error` unset (the subprocess ran, however it exited)
// or a non-transient code (e.g. ENOENT: the target genuinely doesn't exist)
// both return false — a retry cannot fix either of those.
export function isTransientSpawnError(res) {
  return Boolean(res?.error && TRANSIENT_SPAWN_ERROR_CODES.has(res.error.code));
}

function defaultSleep(ms) {
  // Synchronous sleep with no extra dependency: block this thread on a
  // futex wait that will never be signaled, for up to `ms`.
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

/**
 * Calls `spawnFn(...spawnArgs)` up to `maxAttempts` times. Retries only when
 * `isTransient(res)` is true for the just-returned result; any other result
 * (success, a real non-transient spawn error, or the subprocess having
 * actually run and exited non-zero) is returned on the first attempt.
 *
 * @param {Function} spawnFn - e.g. node:child_process's spawnSync
 * @param {Array} spawnArgs - arguments to apply to spawnFn
 * @param {object} [opts]
 * @param {number} [opts.maxAttempts=3]
 * @param {number} [opts.retryDelayMs=50] - base delay; multiplied by attempt
 *   number so later retries back off (50ms, 100ms, ...).
 * @param {Function} [opts.sleepFn] - injectable for tests; defaults to a real
 *   synchronous sleep.
 * @param {Function} [opts.isTransient] - injectable for tests; defaults to
 *   isTransientSpawnError.
 */
export function spawnSyncWithRetry(spawnFn, spawnArgs, opts = {}) {
  const {
    maxAttempts = 3,
    retryDelayMs = 50,
    sleepFn = defaultSleep,
    isTransient = isTransientSpawnError,
  } = opts;

  let res;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    res = spawnFn(...spawnArgs);
    if (!isTransient(res) || attempt === maxAttempts) return res;
    sleepFn(retryDelayMs * attempt);
  }
  return res;
}
