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
import { lockMetadataChanged } from '../scripts/lib/hydrate-schema-lib.mjs';

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
