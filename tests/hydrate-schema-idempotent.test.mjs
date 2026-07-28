// Regression: hydrate-schema.mjs used to rewrite schema/VENDOR.lock's
// hydratedAt on every run, even when the resolved version and every fetched
// file were byte-identical to what was already cached — a re-run against an
// unchanged upstream schema always produced git diff noise. lockMetadataChanged
// is the pure comparison that decides whether a run is a real change; it must
// say "unchanged" whenever source/channel/resolvedVersion/files all match,
// regardless of hydratedAt (which it never even looks at), and "changed" the
// moment any one of them differs, including no prior lock at all.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  lockMetadataChanged,
  parseLock,
  shouldWriteLock,
} from '../scripts/lib/hydrate-schema-lib.mjs';

const meta = {
  source: 'https://mif-spec.dev/schema',
  channel: 'latest',
  resolvedVersion: '1.3.0',
  files: ['mif.schema.json', 'citation.schema.json'],
};

test('no existing lock is always a change', () => {
  assert.equal(lockMetadataChanged(null, meta), true);
});

test('identical metadata is not a change, regardless of hydratedAt', () => {
  const existingLock = { ...meta, hydratedAt: '2020-01-01T00:00:00.000Z' };
  assert.equal(lockMetadataChanged(existingLock, meta), false);
});

test('a different resolvedVersion is a change', () => {
  const existingLock = { ...meta, resolvedVersion: '1.2.0', hydratedAt: 'x' };
  assert.equal(lockMetadataChanged(existingLock, meta), true);
});

test('a different channel is a change', () => {
  const existingLock = { ...meta, channel: 'v1.3.0', hydratedAt: 'x' };
  assert.equal(lockMetadataChanged(existingLock, meta), true);
});

test('a different source is a change', () => {
  const existingLock = { ...meta, source: 'https://old.example/schema', hydratedAt: 'x' };
  assert.equal(lockMetadataChanged(existingLock, meta), true);
});

test('a different files list is a change, order-sensitive', () => {
  const existingLock = { ...meta, files: [...meta.files].reverse(), hydratedAt: 'x' };
  assert.equal(lockMetadataChanged(existingLock, meta), true);
});

test('an added or removed file is a change', () => {
  const existingLock = { ...meta, files: [meta.files[0]], hydratedAt: 'x' };
  assert.equal(lockMetadataChanged(existingLock, meta), true);
});

// shouldWriteLock is the composed decision the script actually calls. Testing
// lockMetadataChanged alone is not enough: the first cut of this fix had a
// correct metadata comparison and still rewrote the lock on every clean
// checkout, because the caller counted repopulating the gitignored
// schema/.cache/ as a content change. These cases pin the composition.

const cached = (text) => ({ existing: text, fetched: text });
const lockOf = (m) => ({ ...m, hydratedAt: '2020-01-01T00:00:00.000Z' });

test('a clean checkout — cache absent, metadata identical — writes nothing', () => {
  const fileStates = meta.files.map(() => ({ existing: null, fetched: '{"a":1}' }));
  assert.equal(shouldWriteLock(fileStates, lockOf(meta), meta), false);
});

test('a warm cache with identical bytes writes nothing', () => {
  const fileStates = meta.files.map(() => cached('{"a":1}'));
  assert.equal(shouldWriteLock(fileStates, lockOf(meta), meta), false);
});

test('a cached file whose upstream bytes changed writes the lock', () => {
  const fileStates = [cached('{"a":1}'), { existing: '{"a":1}', fetched: '{"a":2}' }];
  assert.equal(shouldWriteLock(fileStates, lockOf(meta), meta), true);
});

test('changed metadata writes the lock even on a clean checkout', () => {
  const fileStates = meta.files.map(() => ({ existing: null, fetched: '{"a":1}' }));
  const existingLock = lockOf({ ...meta, resolvedVersion: '1.2.0' });
  assert.equal(shouldWriteLock(fileStates, existingLock, meta), true);
});

test('no existing lock writes the lock even when the cache is warm', () => {
  const fileStates = meta.files.map(() => cached('{"a":1}'));
  assert.equal(shouldWriteLock(fileStates, null, meta), true);
});

// parseLock keeps a corrupt or conflict-marked VENDOR.lock from throwing:
// before the idempotency check, the script never read the lock back, so a bad
// one self-healed on the next run. It has to keep self-healing.

test('parseLock returns null when there is no lock on disk', () => {
  assert.equal(parseLock(null), null);
});

test('parseLock returns null for a corrupt or conflict-marked lock', () => {
  assert.equal(parseLock('<<<<<<< HEAD\n{"a":1}\n=======\n{"a":2}\n>>>>>>> other'), null);
  assert.equal(parseLock('not json at all'), null);
});

test('parseLock round-trips a valid lock', () => {
  assert.deepEqual(parseLock(JSON.stringify(lockOf(meta))), lockOf(meta));
});

test('an unreadable lock is treated as absent, so the run rewrites it', () => {
  const fileStates = meta.files.map(() => cached('{"a":1}'));
  assert.equal(shouldWriteLock(fileStates, parseLock('{ broken'), meta), true);
});
