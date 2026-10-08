---
id: e3c243f6-38e3-53a5-bfea-4fa4c307ce29
type: episodic
created: 2026-06-29T10:00:00Z
namespace: changelog/antipattern
title: "Antipattern: A Changelog That Is Just a Git Log"
tags:
  - antipattern
  - changelog
---

# Changes

<!-- ANTIPATTERN: titled "Changes" with no intro stating the format/SemVer
     contract, so a reader cannot tell how to interpret it. -->

Here is everything that happened since last time.

<!-- ANTIPATTERN: no `## [Unreleased]` section and no versioned `## [x.y.z]`
     headers — there is no way to see what shipped in which release. -->

```text
a1b2c3d fix stuff
9f8e7d6 wip
4c5d6e7 Merge branch 'feature/x' into main
2b3c4d5 update deps
7e8f9a0 oops typo
1a2b3c4 add new thing and also change another thing and remove an old flag
```

<!-- ANTIPATTERN: raw `git log` lines pasted verbatim — one entry per commit
     instead of one curated block per version. Hashes and "wip"/"oops" messages
     are noise to a human deciding whether to upgrade. -->

<!-- ANTIPATTERN: no dates anywhere, so the timeline of releases is unknowable. -->

<!-- ANTIPATTERN: no grouping into Added / Changed / Deprecated / Removed /
     Fixed / Security — related changes are not collected, and the last commit
     mixes an add, a change, and a removal in a single line. -->

<!-- ANTIPATTERN: no Semantic Versioning — nothing signals whether these changes
     are breaking, a feature, or a patch. -->
