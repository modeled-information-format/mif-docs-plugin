---
name: rust-rfc
description: Write a Rust-style RFC (request for comments / enhancement proposal) — a structured design proposal with Summary, Motivation, Guide-level explanation, Reference-level explanation, Drawbacks, Rationale and alternatives, Prior art, Unresolved questions, and Future possibilities. Use when a substantial language/library/platform change needs written design consensus BEFORE implementation. Anti-trigger; for a decision already made and being recorded use an ADR (structured-madr), and for a bug or small change use a plain issue.
argument-hint: "<the proposed change>"
---

# rust-rfc

Produces a **Request for Comments** in the rust-lang sense: a complete written
proposal that argues for a change and specifies it precisely enough to build,
authored *before* the work begins so reviewers can reach consensus on the design.
An RFC is forward-looking and persuasive; it is not an ADR (which records a
decision already taken) and not an issue (which reports a problem without a
designed solution).

## The split that defines the genre: guide-level vs reference-level

A Rust RFC explains the same feature **twice, for two audiences**. Getting this
split right is the whole craft:

- **Guide-level explanation** — written as if the feature *already shipped* and
  you are teaching it to a user. Narrative, example-driven, names the new
  concepts, shows how it *feels* to use. No desugaring, no edge cases — just the
  happy path a docs chapter would show.
- **Reference-level explanation** — written for the implementer. Precise and
  exhaustive: desugaring, type rules, grammar/precedence, interaction with
  existing features, corner cases, error behavior. If the guide section says
  "and it just works," this section says exactly *how*.

Same feature, two altitudes. If a reader can use the feature from the guide
section and build it from the reference section, the split is correct.

## Pattern (industry: rust-lang RFC template, 0000-template.md)

1. **Summary** — one paragraph: what is being proposed.
2. **Motivation** — why; the concrete problem, who hits it, why now. No
   hand-waving — name the friction with an example.
3. **Guide-level explanation** — teach it as shipped (see split above).
4. **Reference-level explanation** — specify it for implementers (see split).
5. **Drawbacks** — honest reasons *not* to do this. Required; never empty.
6. **Rationale and alternatives** — why this design over the others considered,
   and what happens if we do nothing. Required; list real alternatives.
7. **Prior art** — how other languages/libraries/ecosystems solved this.
8. **Unresolved questions** — what consensus must still settle before merge.
9. **Future possibilities** — adjacent work this unlocks but does not commit to.

## Rules that keep it an RFC

- Every section is substantive. The two sections authors most want to skip —
  **Drawbacks** and **Rationale and alternatives** — are mandatory; an RFC
  without them is just advocacy.
- Motivation must be concrete: a real scenario and the friction it causes, not
  "this would be nice" or "developers want it."
- "Other languages/ecosystems already have this" is Prior art, not Motivation.
  It is supporting evidence at most — it can back up a concrete scenario, but
  it cannot replace one. If the Motivation section's own justification (its
  "why now") leans on a comparison to other languages instead of resting on
  the scenario, the cost it imposes, and who pays it, that is the same
  hand-waving the rule above forbids, just relocated to the closing paragraph.
  Keep the "why now" argument grounded in the concrete scenario already given.
- Keep guide-level and reference-level distinct. Desugaring in the guide section
  or teaching tone in the reference section is the most common drift.
- Propose, do not decide. The RFC argues a position; the discussion and a
  separate decision record settle it.

## When it's not an RFC

If the request describes a decision that has already been made (a team already
chose an approach, already adopted a library, already settled a debate),
don't write an RFC — an RFC is pre-decision, forward-looking, and persuasive;
retrofitting one onto a settled choice is reverse-engineering a debate that
never happened. Recommend the right genre instead (usually an ADR via
structured-madr, since that genre records a decision already taken along with
its drivers, options, and consequences) and explain why, using the same
"before consensus" vs. "after the decision" distinction this skill draws
between RFCs and ADRs. Don't stop at naming the genre — offer to actually
draft it: ask for whatever concrete inputs that genre needs (e.g. for an ADR:
the options considered, the chosen outcome, the decision drivers) and propose
producing the artifact, not just a description of what it would contain.

## MIF frontmatter

`type: semantic` — an RFC is declarative design knowledge, not a how-to and not
a time-bound event.

### Why machine-readable

The frontmatter lets an agent reason about the RFC without parsing prose. With
the full layer it can answer "is this proposal still fresh, or has it sat
undecided past its review window?" (`temporal`), "who asserted it and how
confident are they?" (`provenance`), "what backs the prior-art claims?"
(`citations[]`), and "what other proposals does it touch?" (`relationships[]`) —
all from structured fields, not by reading the body.

### The L1 → L3 climb

- **L1 floor** — `templates/good-l1.md`: `id`, `type`, `created` + body. A
  complete, valid RFC, but opaque to a machine — none of the questions above are
  answerable. Gate with `mif-validate --level 1`.
- **L2** — add `namespace` (e.g. `rfc/language-features`), `modified`, and
  `temporal` (proposal-freshness window) when a real review cadence exists.
- **L3 full** — `templates/good.md`: the same RFC carrying `temporal`
  (`validFrom` + `ttl: P1Y` + `recordedAt`), `provenance` (`sourceType:
  user_explicit`, `trustLevel: high_confidence`), `citations[]` for the prior
  art, and a typed `relationships[]` (`relates-to` the `?` try-operator RFC).
  Gate with `mif-validate --level 3`. The document projects losslessly to
  JSON-LD and back.

Author at the **highest level the drafting context supports** (grade down rather
than fabricate) — publish a valid L1 RFC now rather than inventing metadata, and
upgrade L1 → L2 → L3 as review dates, sources, and relationships become explicit.

See `templates/good-l1.md` (the floor) and `templates/good.md` (the complete
nine-section RFC at L3) for the climb, and `templates/bad.md` (an RFC that
dropped Drawbacks and Alternatives and hand-waves its Motivation — the genre's
defining failure).
