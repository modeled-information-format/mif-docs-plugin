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
