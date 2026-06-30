---
id: pep-9999-math-clamp
type: semantic
created: 2026-06-29T10:00:00Z
---

# PEP 9999 – Add math.clamp() to the Standard Library

```text
PEP: 9999
Title: Add math.clamp() to the Standard Library
Author: Pat Developer <pat@example.com>
Status: Draft
Type: Standards Track
Created: 29-Jun-2026
Python-Version: 3.15
```

## Abstract

This PEP proposes adding a `clamp()` function to the `math` module.
`math.clamp(x, lo, hi)` returns `x` constrained to the closed interval
`[lo, hi]`. The idiom `max(lo, min(x, hi))` is written constantly, is easy to
get subtly wrong, and hides its intent; a named function makes it explicit.

## Motivation

Clamping a value to a range is one of the most frequently re-implemented
one-line helpers in the ecosystem. The absence of a canonical function invites
argument-order bugs, inverted-bound surprises when `lo > hi`, and call sites
that the reader must decode.

## Specification

A new positional-only function `clamp(x, lo, hi, /)` is added to `math`. If
`lo > hi`, raise `ValueError`. If a bound is NaN, raise `ValueError`. If `x` is
NaN, return NaN. Otherwise return `lo` if `x < lo`, `hi` if `x > hi`, else `x`.

## Backwards Compatibility

Adding a new function to `math` is backwards compatible: no existing name,
signature, or behavior changes. No deprecation is required.

## Rejected Ideas

- Add `clamp` as a builtin — clamping is numeric, not a language primitive.
- Keyword arguments `clamp(x, min=..., max=...)` — they shadow the builtins.
- Silently swap inverted bounds — hides a `lo > hi` mistake instead of raising.

<!--
MIF Level 1 (floor): id, type, created + body only. This is a complete, valid
PEP — but to a machine consumer it is opaque prose. It cannot be queried for
"is this proposal still current?", "where did it come from / can I trust it?",
"what backs the design?", or "which PEP does it relate to?" — those answers live
in structured frontmatter, not in the text. Compare templates/good.md (full L3:
temporal validity, provenance, citations, and a typed relationship to PEP 485).
-->
