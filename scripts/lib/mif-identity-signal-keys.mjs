// mif-identity-signal-keys.mjs — the subset of scripts/lib/projection.mjs's
// toJsonld() recognized identity/type keys that unambiguously signal a
// canonical MIF-native document regardless of their VALUE -- unlike bare
// `id`/`type` (also recognized there, via `fm.id ?? fm["@id"]` /
// `fm.type ?? fm.conceptType`), which plenty of non-MIF documentation
// conventions also carry for unrelated purposes, so their mere presence can't
// safely signal "this is MIF". hooks/mif-guard.mjs derives its pre-write
// genre-signal detection from this list (issue #50) so a future authoring
// convention added to projection.mjs's recognition logic updates the guard by
// construction, not by separately-maintained discipline.
//
// Deliberately dependency-free (no imports beyond this array): the guard
// hook fires on EVERY Write/Edit tool call, even ones that early-exit before
// ever needing this list's value, so it must not drag in projection.mjs's
// heavier transitive dependencies (ajv, ajv-formats, js-yaml) just to read
// two strings (caught in review on PR #54).
export const MIF_IDENTITY_SIGNAL_KEYS = ["@id", "conceptType"];
