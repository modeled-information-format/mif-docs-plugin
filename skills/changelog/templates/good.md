---
id: changelog-mif-convert
type: episodic
created: 2026-06-29T10:00:00Z
modified: 2026-06-29T10:00:00Z
namespace: changelog/mif-convert
title: Changelog
tags:
  - changelog
  - release-notes
  - mif-convert
temporal:
  "@type": TemporalMetadata
  validFrom: 2026-01-15T00:00:00Z
  recordedAt: 2026-05-18T00:00:00Z
relationships:
  - type: relates-to
    target: /procedural/mif-convert/cli-reference.md
---

# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Streaming mode for `mif-convert roundtrip` so large corpora validate without
  loading every document into memory at once.

### Changed

- Validation errors now print the offending frontmatter key and line number.

## [1.2.0] - 2026-05-18

### Added

- `--level 3` provenance checks covering `citations[]` and `relationships[]`.
- JSON-LD projection output for the `emit-jsonld` subcommand.

### Fixed

- Round-trip no longer drops trailing link-reference definitions on reserialize.

## [1.1.0] - 2026-03-02

### Added

- `--no-roundtrip` flag to skip the lossless round-trip check for speed.

### Changed

- Default schema source moved to the canonical `mif-spec.dev` custom domain.

### Deprecated

- The `--legacy-id` flag is deprecated; URN-style ids are now the default.

## [1.0.0] - 2026-01-15

### Added

- First stable release: L1/L2 frontmatter validation against the canonical
  MIF schema, plus markdown to JSON-LD conversion.

### Security

- Schema fetches are pinned to a vendored copy, removing a network fetch during
  validation.

<!--
MIF Level 2 (standard): adds `modified`, `temporal`, and a typed `relates-to`
relationship to the L1 floor. A changelog is episodic, so `temporal` is the
honest ceiling for this genre — `validFrom` is the first release (2026-01-15,
1.0.0) and `recordedAt` is the latest entry (2026-05-18, 1.2.0); there is no
`validUntil`/`ttl` because a release history does not expire, and no
`provenance`/`citations` because nothing here is an attributable external claim.
Now a machine consumer can answer, from frontmatter alone: "what release window
does this record cover?" (`temporal.validFrom`..`recordedAt`), "when was it last
touched?" (`modified`), and "what does it document?" (`relationships[]` ->
`relates-to` the mif-convert CLI reference) — without parsing the prose.
Compare good-l1.md, the same changelog reduced to the L1 floor.
-->
