---
id: rfc-optional-chaining-operator
type: semantic
created: 2026-06-29T10:00:00Z
---

# RFC: Optional Chaining with the `?.` Operator

## Summary

Add a postfix `?.` operator that short-circuits a member access or method call
when the receiver is `None`, producing `None` for the whole expression instead
of a nested `match`. `a?.b?.c` evaluates to the inner value wrapped in `Option`,
or `None` the moment any link in the chain is absent.

## Motivation

Reaching through several `Option` layers reads badly today: a nested `match` is
verbose and an `and_then` chain reverses reading order and hides the field names
in closures. The friction pushes authors toward `unwrap()`, trading clarity for
panics on every optional traversal.

## Guide-level explanation

Follow a possibly-`None` value with `?.` instead of `.` to keep going only if it
is present:

```rust
let n = config.database?.pool?.max_connections;
```

Read left to right; if any link is `None` the whole expression is `None`. The
result is always an `Option`, so `n` has type `Option<u32>`.

## Reference-level explanation

`?.` is sugar. `recv?.tail` where `recv: Option<T>` desugars to
`match recv { Some(__x) => Some(__x.tail), None => None }`, evaluating `recv`
exactly once. Chained `?.` flattens — `a?.b?.c` is `Option<U>`, never
`Option<Option<U>>` — and `?.` is a single token distinct from `?` then `.`.

## Drawbacks

Another operator to learn, a whitespace-sensitive clash with the `?`
try-operator, and it makes deep optional nesting cheap enough to entrench.

## Rationale and alternatives

Chosen over doing nothing (combinators reverse reading order; `unwrap` panics),
over a method (cannot name a field without a closure), and over overloading `?`
(would make it context-dependent).

## Prior art

C# `?.`, Swift optional chaining, Kotlin `?.`, and JavaScript/TypeScript `?.`
(ES2020) all short-circuit member access on an absent receiver.

## Unresolved questions

Should `?.` also index (`a?.[i]`)? What diagnostic fires on a non-`Option`
receiver? Can the formatter accidentally split `?.` into `? .`?

## Future possibilities

A sibling operator for `Result` chaining, user-definable chaining via a
`Try`-like trait, and optional indexing built on the same short-circuit rule.

<!--
MIF Level 1 (floor): id, type, created + body only. This is a complete, valid
RFC — but to a machine consumer it is opaque prose. It cannot be queried for
"is this proposal still fresh?", "who authored it and how confident?", "what
prior art backs it?", or "which other RFC does it relate to?". good.md climbs to
L3, adding temporal validity, provenance, citations, and a typed relationship so
every one of those questions is answerable from frontmatter alone.
-->
