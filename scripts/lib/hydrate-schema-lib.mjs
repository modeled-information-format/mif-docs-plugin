// Pure comparison logic for hydrate-schema.mjs's idempotency check, split
// out so it's testable without a real network fetch or filesystem write.

// True when the resolved lock's tracked identity (source/channel/version/
// file set) differs from what's already recorded — the only fields that
// matter for "is this actually a different hydrate," ignoring hydratedAt.
export function lockMetadataChanged(existingLock, meta) {
  if (!existingLock) return true;
  return (
    existingLock.source !== meta.source ||
    existingLock.channel !== meta.channel ||
    existingLock.resolvedVersion !== meta.resolvedVersion ||
    JSON.stringify(existingLock.files) !== JSON.stringify(meta.files)
  );
}

// Parse VENDOR.lock's raw text, tolerating a lock that is corrupt or carries
// merge-conflict markers. An unreadable lock is treated as no lock at all, so
// the run rewrites it — the same self-healing the script had back when it only
// ever wrote the lock and never read it back.
export function parseLock(rawLockText) {
  if (rawLockText === null || rawLockText === undefined) return null;
  try {
    return JSON.parse(rawLockText);
  } catch {
    return null;
  }
}

// The composed decision: does this run have to rewrite VENDOR.lock?
//
// `fileStates` carries one entry per fetched file — { existing, fetched } —
// where `existing` is the cached file's current content, or null when the file
// is not on disk yet. An ABSENT cache file is not a content change:
// schema/.cache/ is gitignored, so every clean checkout has to repopulate it,
// and counting that as a change rewrote hydratedAt on every fresh clone. Only
// a cached file whose bytes actually differ from upstream, or a change in the
// lock's tracked identity, means the lock is stale.
export function shouldWriteLock(fileStates, existingLock, meta) {
  const contentChanged = fileStates.some(
    ({ existing, fetched }) => existing !== null && existing !== fetched,
  );
  return contentChanged || lockMetadataChanged(existingLock, meta);
}
