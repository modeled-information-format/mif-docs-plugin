---
id: changelog-mif-convert
type: episodic
created: 2026-06-29T10:00:00Z
---

# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Streaming mode for `mif-convert roundtrip` so large corpora validate without
  loading every document into memory at once.

## [1.0.0] - 2026-01-15

### Added

- First stable release: L1/L2 frontmatter validation against the canonical
  MIF schema, plus markdown to JSON-LD conversion.

<!--
MIF Level 1 (floor): id, type, created + body only. This is a complete, valid
changelog — but to a machine consumer it is opaque prose. With only L1 it cannot
answer "what release window does this cover?", "when was it last updated?", or
"what does it document?" without parsing the markdown. Compare good.md, the same
changelog at L2: it adds `modified`, `temporal` (validFrom..recordedAt), and a
typed `relates-to` relationship so those questions are answered from frontmatter.
-->
