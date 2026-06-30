---
name: changelog
description: Write or update a CHANGELOG in the Keep a Changelog 1.x format — a human-curated, reverse-chronological record of notable changes per released version, grouped by Added/Changed/Deprecated/Removed/Fixed/Security and versioned with SemVer. Use when the user needs release notes or a version history humans will read. Anti-trigger; not for forward-looking roadmaps, marketing release announcements, or a raw dump of git commit log lines.
argument-hint: "<changes or version to record> [path to CHANGELOG.md]"
---

# changelog

Produces a **changelog** in the Keep a Changelog 1.x sense: a *curated, time-bound
record* of what changed between released versions, written **for humans**, not a
machine dump of commits. It is episodic — every entry is anchored to a version
and a release date.

## Pattern (industry: Keep a Changelog 1.x, keepachangelog.com)

1. **Title + intro** — an `# Changelog` H1 and a one-line statement that the file
   follows Keep a Changelog and Semantic Versioning.
2. **`## [Unreleased]`** — the top section, accumulating changes not yet released.
3. **Version sections** — `## [x.y.z] - YYYY-MM-DD`, newest first
   (reverse-chronological). The date is ISO-8601.
4. **Grouped subsections** — within each version, `###` headings drawn only from
   the fixed set, in this order: **Added, Changed, Deprecated, Removed, Fixed,
   Security**. Include only the groups that apply.
5. **Link-reference definitions** (optional) — at the bottom, `[x.y.z]: <url>`
   compare/diff links matching each version header.

## Rules that keep it a changelog

- One entry block per **version**, not per commit. Curate; summarize the notable
  user-facing change, don't paste `git log`.
- Group same *kinds* of change together using the six canonical categories — no
  ad-hoc category names.
- **Latest version on top**; `## [Unreleased]` above all releases.
- Follow **SemVer**: breaking changes bump MAJOR, features MINOR, fixes PATCH.
- Always give released versions a date; flag removals/Deprecated and Security
  explicitly so readers can assess upgrade risk.
- Write for a human reader deciding whether/how to upgrade — clear, past-tense,
  no internal jargon or bare commit hashes.

## MIF frontmatter

`type: episodic` (a changelog is a time-bound record). Gate every output with
`mif-validate`; the floor is `--level 1`.

### Why machine-readable

A changelog is read as much by agents as by people — a release bot asking "what
window does this history cover?", a freshness check asking "when was this last
updated?", a dependency walker asking "what does this document?". As plain prose
(L1) every one of those needs the markdown parsed and inferred. The MIF layer
makes them answerable by *reading frontmatter*: `temporal.validFrom`..`recordedAt`
bound the release window, `modified` dates the last edit, and a typed
`relationships[]` (`relates-to`) names the tool the log documents. The same file
still reads as a human changelog and projects losslessly to JSON-LD and back.

Because a changelog is episodic, **L2 is the honest ceiling** for this genre:
`temporal` fits, but `provenance`/`citations` (L3) would be fabricated — a
release history is not an attributable external claim.

### The L1 -> L2 climb (two exemplars)

- `templates/good-l1.md` — **L1 floor**: `id`, `type`, `created` + body. A valid
  changelog, but opaque to a machine consumer.
- `templates/good.md` — **L2 (highest this genre supports)**: adds `namespace`,
  `modified`, `temporal` validity, and a typed `relates-to` relationship.
  Validate with `mif-validate --level 2`.

Author at the highest level the context honestly supports (grade down rather than
fabricate). `templates/bad.md` shows the antipattern: a changelog reduced to
ungrouped, undated, unversioned git-log lines — the most common failure.
