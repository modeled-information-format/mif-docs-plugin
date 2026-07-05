---
id: fixture:engine-parity-drift-description
type: semantic
created: '2026-07-05T00:00:00Z'
description: The description key this document exists to carry.
tags:
  - fixture
  - engine-parity
---

# Engine-Parity Fixture: description Key

Minimal reproduction of modeled-information-format/mif-rs#38. The node engine
round-trips this document losslessly; the Rust engine drops the `description:`
frontmatter key on re-serialization and rejects it as round-trip drift. The
parity harness expects this disagreement and fails the day it disappears, so
the expectation list is pruned in the same change that picks up the fixed
mif-rs release.
