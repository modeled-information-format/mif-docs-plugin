---
id: rfc-optional-chaining-operator
type: semantic
created: 2026-06-29T10:00:00Z
modified: 2026-06-29T10:00:00Z
namespace: rfc/language-features
title: "RFC: Optional Chaining with the ?. Operator"
tags:
  - rfc
  - language-feature
  - ergonomics
  - option
temporal:
  "@type": TemporalMetadata
  validFrom: 2026-06-29T00:00:00Z
  recordedAt: 2026-06-29T10:00:00Z
  ttl: P1Y
provenance:
  "@type": Provenance
  sourceType: user_explicit
  trustLevel: high_confidence
citations:
  - "@type": Citation
    citationType: documentation
    citationRole: background
    title: "C# null-conditional operators ?. and ?[]"
    url: https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/operators/member-access-operators
    accessed: 2026-06-26
  - "@type": Citation
    citationType: documentation
    citationRole: background
    title: "The Swift Programming Language — Optional Chaining"
    url: https://docs.swift.org/swift-book/documentation/the-swift-programming-language/optionalchaining/
    accessed: 2026-06-26
  - "@type": Citation
    citationType: documentation
    citationRole: background
    title: "Kotlin — Null safety (safe-call operator ?.)"
    url: https://kotlinlang.org/docs/null-safety.html
    accessed: 2026-06-26
  - "@type": Citation
    citationType: specification
    citationRole: background
    title: "TC39 Optional Chaining proposal (ECMAScript 2020)"
    url: https://github.com/tc39/proposal-optional-chaining
    accessed: 2026-06-26
  - "@type": Citation
    citationType: documentation
    citationRole: background
    title: "The Rust Reference — The question mark operator"
    url: https://doc.rust-lang.org/reference/expressions/operator-expr.html
    accessed: 2026-06-26
relationships:
  - type: relates-to
    target: /semantic/rfc/rfc-try-operator.md
---

# RFC: Optional Chaining with the `?.` Operator

## Summary

Add a postfix `?.` operator that short-circuits a member access or method call
when the receiver is `None`, producing `None` for the whole expression instead
of panicking or requiring a nested `match`. `a?.b?.c` evaluates to the inner
value wrapped in `Option`, or `None` the moment any link in the chain is absent.

## Motivation

Reaching through several layers of optional data is common and reads badly today.
Consider a parsed configuration where every layer may be missing:

```rust
struct Config { database: Option<Database> }
struct Database { pool: Option<Pool> }
struct Pool { max_connections: Option<u32> }
```

To read `max_connections` defensively, an author writes one of two unpleasant
forms. The nested `match` is verbose:

```rust
let n = match &config.database {
    Some(db) => match &db.pool {
        Some(pool) => pool.max_connections,
        None => None,
    },
    None => None,
};
```

The combinator form is shorter but reverses reading order and buries the field
names in closures:

```rust
let n = config.database.as_ref()
    .and_then(|db| db.pool.as_ref())
    .and_then(|pool| pool.max_connections);
```

Neither form lets the reader see "database, then pool, then max_connections" in
the order they are written. The friction is paid on every optional traversal —
config loading, AST walking, JSON navigation — and it pushes authors toward
`unwrap()`, trading clarity for panics. A dedicated operator makes the common
case read in source order with no closures.

## Guide-level explanation

When a value might be `None`, follow it with `?.` instead of `.` to keep going
only if the value is present:

```rust
let n = config.database?.pool?.max_connections;
```

Read it left to right: take `config.database`; if it is `None`, the whole
expression is `None` and evaluation stops; otherwise unwrap it and continue to
`.pool`, and so on. The result of an optional chain is always an `Option`, so
`n` here has type `Option<u32>`.

Because the result is just an `Option`, you finish the chain with the tools you
already know:

```rust
let n = config.database?.pool?.max_connections.unwrap_or(16);
```

You can call methods through the operator too:

```rust
let name = user.profile?.display_name().to_uppercase();
```

If `user.profile` is `None`, `display_name()` is never called and `name` is
`None`. Use `?.` wherever you would otherwise write a nested `match` or a chain
of `and_then`; reach for plain `.` when the value is not optional.

## Reference-level explanation

`?.` is sugar; it introduces no new runtime concept. An expression of the form
`recv?.tail` where `recv: Option<T>` desugars to:

```rust
match recv {
    Some(__x) => Some(__x.tail),
    None => None,
}
```

`tail` may be a field access (`?.field`) or a method call (`?.method(args)`).
The desugaring binds the unwrapped receiver to a fresh temporary `__x`, so any
side effects in `recv` are evaluated exactly once.

Typing rules:

- The receiver of `?.` must be `Option<T>` for some `T`; applying it to a
  non-optional value is a type error suggesting plain `.`.
- If the tail expression has type `U`, the chain element has type `Option<U>`.
- Chained `?.` flattens: `a?.b?.c` does not produce `Option<Option<U>>`. Each
  `?.` consumes one `Option` layer and re-wraps a single layer, so the chain's
  type is `Option<U>` where `U` is the type of the final tail.

Precedence and associativity match the existing `.` operator: `?.` binds tighter
than arithmetic and comparison, and chains left-associatively. `a?.b.c` parses as
`(a?.b).c`, which is a type error unless `a?.b` is itself optional — the operator
guards exactly one access, not the remainder of the chain.

Interaction with the existing `?` try-operator is purely lexical: `?.` is a
single token, distinct from `?` followed by `.`. In a function returning
`Option`, `x?.y` (optional chaining) and `x?.y` written as `x?` then `.y` (early
return) are different programs; the tokenizer resolves `?.` greedily, and a
space (`x? .y`) selects the try-operator reading.

The operator is defined only for `Option`. `Result` is out of scope (see Future
possibilities) because its short-circuit value carries an `E` that the operator
cannot synthesize.

## Drawbacks

- **Another operator to learn.** `?.` adds surface area to an already dense
  sigil vocabulary (`?`, `.`, `..`, `..=`), and its single-token distinction
  from `?` + `.` is a real footgun for readers and for macro authors who
  tokenize by hand.
- **Encourages deep optional nesting.** Making traversal cheap can entrench data
  models with many `Option` layers that would be better redesigned (e.g. with a
  non-optional default or a typestate) rather than threaded through.
- **Lexer ambiguity near the try-operator.** The whitespace-sensitive split
  between `x?.y` and `x? .y` is subtle and will surface in confusing diagnostics
  and formatter churn.
- **No `Result` story on day one** means users will still reach for `and_then`
  in mixed `Option`/`Result` chains, so the ergonomic win is partial.

## Rationale and alternatives

The proposed design wins because it reads in source order, reuses the existing
`.` precedence, and desugars to code authors could already write by hand — so it
adds no new semantics to reason about. Alternatives considered:

- **Do nothing.** `and_then`/`?` already cover these cases. Rejected: the
  combinator form reverses reading order and the panic form (`unwrap`) is unsafe;
  the friction is precisely what pushes authors toward panics.
- **A method, e.g. `Option::map_field`.** Methods cannot name a field or forward
  arbitrary method calls without a closure, so this collapses back into the
  `and_then` ergonomics this RFC is trying to replace.
- **Overload `?` to chain instead of return inside `Option`-returning
  functions.** Rejected: it makes `?` context-dependent and breaks the existing
  early-return meaning that users rely on.
- **A `let`-chain / postfix `match`.** More general but far heavier syntax for
  the narrow, extremely common "reach through optionals" case.

The impact of *not* doing this is status quo: optional traversal stays verbose
or unsafe, and `unwrap()` remains the path of least resistance.

## Prior art

- **C# `?.`** (null-conditional) and **Swift `?.`** (optional chaining) are the
  direct inspirations; both short-circuit member access on a nullable/optional
  receiver and yield a nullable/optional result, matching this proposal's shape.
- **Kotlin `?.`** behaves identically for nullable types.
- **JavaScript/TypeScript `?.`** added optional chaining in ES2020, validating
  broad demand for the ergonomic even in dynamically typed settings.
- Within this language, the existing **`?` try-operator** establishes the
  precedent that a short-circuiting postfix sigil is idiomatic; `?.` is its
  `Option`-flattening sibling, and this RFC `relates-to` that operator's own
  proposal (see `relationships[]`) because the two must agree on tokenization.

## Unresolved questions

- Should `?.` index as well as access fields and methods (`a?.[i]`), or is
  indexing deferred to a follow-up?
- What is the exact diagnostic when `?.` is applied to a non-`Option` receiver —
  a hard error, or a machine-applicable suggestion to use `.`?
- Does the formatter ever insert the whitespace that flips `x?.y` into
  `x? .y`, and if so how is that prevented?
- Should a lint warn when a `?.` chain exceeds some depth, nudging toward a data
  model redesign?

## Future possibilities

- **`Result` chaining.** A sibling operator (or an extension of `?.`) that
  threads an error type would generalize the ergonomic to fallible traversal.
- **User-definable chaining** via a `Try`-like trait, letting custom optional
  wrappers (e.g. a domain `Maybe<T>`) participate in `?.`.
- **Optional indexing and slicing** (`a?.[i]`, `a?.[i..j]`) built on the same
  short-circuit rule.
- **Assignment through the chain** (`a?.b = x`, a no-op when `a` is `None`),
  mirroring the C# null-conditional assignment story.

<!--
MIF Level 3 (full). Beyond the L1 floor (id/type/created), this RFC carries:
`temporal` (validFrom + ttl P1Y + recordedAt) so an agent can flag a proposal
that has sat undecided past its one-year freshness window; `provenance`
(sourceType: user_explicit, trustLevel: high_confidence) so a consumer knows a
human authored it deliberately, not an inference; `citations[]` so the Prior-art
claims (C#, Swift, Kotlin, JS/TC39, the Rust `?` operator) are resolvable instead
of name-dropped; and a typed `relationships[]` (`relates-to` the `?` try-operator
RFC) so the proposal graph is walkable. A machine can now answer "is this still
fresh?", "who asserted it?", "what backs its prior-art claims?", and "what else
does it touch?" from frontmatter alone. The same document projects losslessly to
JSON-LD and back. Compare good-l1.md, the bare L1 floor where none of this is
answerable.
-->
