---
id: fe3a45f1-0019-588c-9c73-52f96719312b
type: semantic
created: 2026-06-29T10:00:00Z
namespace: rfc/antipattern
title: "Antipattern: An RFC That Skipped the Hard Sections"
tags:
  - antipattern
  - rfc
---

# RFC: Add a `?.` Operator

## Summary

We should add a `?.` operator for optional chaining. It would be really useful.

## Motivation

Everyone knows that dealing with `Option` is annoying. Developers want this and
other languages have it, so we should have it too. It would make the code much
nicer and people would be happier writing it.

<!-- ANTIPATTERN: hand-wavy motivation. "Everyone knows", "developers want it",
     "other languages have it", "much nicer" — no concrete scenario, no example
     of the friction, no evidence of who hits the problem or why now. A real
     Motivation shows the painful code and names the cost. -->

## Guide-level explanation

You write `a?.b?.c` and it does the right thing. It is intuitive, so users will
pick it up quickly without needing much explanation.

<!-- ANTIPATTERN: "does the right thing" / "intuitive" is not teaching. The
     guide-level section must actually show the feature as shipped — a worked
     example, the result type, how it reads — not assert that it is obvious. -->

## Reference-level explanation

It works like the `?` operator but for chaining. The compiler figures out the
types. Implementation should be straightforward.

<!-- ANTIPATTERN: no desugaring, no typing rules, no precedence, no interaction
     with the existing `?` token. "The compiler figures it out" and
     "straightforward" are exactly the precision the reference section exists to
     supply. An implementer cannot build from this. -->

## Prior art

Some other languages have something like this.

<!-- ANTIPATTERN: name them and say how they behave. Vague prior art gives
     reviewers nothing to compare against. -->

## Unresolved questions

None that I can think of.

<!-- ANTIPATTERN: a non-trivial feature always has open questions (indexing,
     diagnostics, formatter interaction). "None" signals the design was not
     examined, not that it is complete. -->

<!-- ANTIPATTERN: the "Drawbacks" section is MISSING entirely. Every RFC must
     state honest reasons NOT to do this (new operator to learn, lexer ambiguity
     with `?`, encourages deep nesting). Omitting it turns the RFC into pure
     advocacy and hides the cost from reviewers. -->

<!-- ANTIPATTERN: the "Rationale and alternatives" section is MISSING entirely.
     The RFC never says why `?.` beats a method, overloading `?`, or doing
     nothing, and never states the cost of inaction. Without alternatives there
     is no design argument to evaluate — only a conclusion. -->
