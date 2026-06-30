---
id: explanation-two-views
type: semantic
created: 2026-06-29T10:00:00Z
namespace: explanation/architecture
title: Why MIF Separates the Human and Machine Views
tags:
  - explanation
  - mif
  - design-rationale
modified: 2026-06-29T10:00:00Z
temporal:
  "@type": TemporalMetadata
  validFrom: 2026-06-29T00:00:00Z
  validUntil: 2027-06-29T00:00:00Z
  recordedAt: 2026-06-29T10:00:00Z
  ttl: P1Y
provenance:
  "@type": Provenance
  sourceType: user_explicit
  trustLevel: high_confidence
  wasAttributedTo:
    "@id": "urn:mif:team:mif-spec-authors"
    "@type": prov:Agent
citations:
  - "@type": Citation
    citationType: specification
    citationRole: source
    title: "MIF — Modeled Information Format Specification v1.0"
    url: https://mif-spec.dev/
    accessed: 2026-06-29
relationships:
  - type: relates-to
    target: /reference/cli/reference-mifx-export.md
  - type: relates-to
    target: /tutorials/getting-started/tutorial-first-mif-doc.md
---

# Why MIF Separates the Human and Machine Views

Every documentation format eventually has to answer one awkward question: who is
the document *for*? A human reading prose, or a machine parsing structure? MIF's
answer is that it refuses to choose — a single artifact carries both a
human-readable markdown view and a machine-readable JSON-LD view, and the two are
losslessly interconvertible. This piece explains why that separation exists, what
it costs, and what it buys.

## The tension it resolves

Documentation is read by two very different audiences with incompatible
preferences. People want flowing prose, headings they can skim, and the freedom
to phrase things naturally. Tools want fields they can query, types they can
validate, and identifiers they can link. Optimize hard for one and you punish the
other: pure prose is invisible to a validator, while a rigid data schema is
miserable to write and read.

MIF treats this not as a compromise to be split down the middle but as two
*views* of the same underlying meaning. The markdown is what a person edits; the
JSON-LD is what a system reasons over. Neither is the "real" document — they are
projections of one concept, and the round-trip between them is required to lose
nothing.

## Why not the obvious alternatives

The instinct is usually to pick a single source of truth and generate the other
side. Each variation of that idea was considered and set aside.

*Prose with the data generated from it.* Parsing meaning back out of free text is
brittle; the moment an author phrases something unexpectedly, the extracted data
drifts from what they meant. The structure becomes a guess.

*Data with the prose generated from it.* Templated prose reads like templated
prose. Authors lose the voice and nuance that made documentation worth writing,
and they resent editing a form instead of writing.

*Metadata bolted onto the side*, in a separate file or an external database. Now
the document and its structure can disagree, and nothing forces them back into
agreement. The two drift apart precisely because nothing binds them.

The separation MIF chose avoids all three failure modes by making the two views
*equal and bound*. Frontmatter plus body is the human view; the schema-checked
JSON-LD object is the machine view; the lossless round-trip is the contract that
keeps them honest. You edit either side and the other follows without loss.

## How the binding actually holds

The binding is not a convention or a habit — it is enforced. Each MIF document
projects to canonical JSON-LD that validates fail-closed against the published
schema, and the conversion is checked to be reversible. If a round-trip would
lose information, that is treated as an error rather than an acceptable rounding.
This is why MIF can promise that the friendly markdown an author sees and the
rigorous object a tool consumes are genuinely the same thing, not two artifacts
that happen to resemble each other.

That enforcement is what elevates the idea from a nice metaphor to an
architectural guarantee. A team can let people write naturally *and* let systems
validate, link, and query — without maintaining two copies or trusting that
they stayed in sync.

## Where this fits

This two-view design is the reason the rest of MIF can stay simple. Conceptual
levels, namespaces, and relationships all describe the *one* concept; they do not
have to be re-specified for each view, because there is only one meaning underneath.
It is also why MIF leans on JSON-LD specifically rather than plain JSON: JSON-LD
carries the semantic identifiers and types that let the machine view participate
in a larger graph, which a private ad-hoc schema could not.

## In short

Separating the human and machine views is not MIF hedging its bets — it is MIF
taking both audiences seriously at once and using a lossless round-trip to keep
its promise to each. The cost is the discipline of maintaining that round-trip;
the payoff is documentation that is pleasant to write and trustworthy to compute
over. To see the contract in practice, work through the `diataxis-tutorial`
exemplar that writes a first MIF document, or consult the `diataxis-reference`
exemplar for the field-by-field mechanics — both are recorded as typed
`relates-to` edges in this document's `relationships[]`.

<!--
This document is MIF Level 3. The frontmatter — not the prose — is what lets a
machine reason about it: `temporal` (validFrom/validUntil + ttl P1Y, recordedAt)
answers "is this rationale still current, and when is it due for review?";
`provenance` (sourceType user_explicit, trustLevel high_confidence, wasAttributedTo
a prov:Agent) answers "who stands behind this and how far do I trust it?";
`citations[]` answers "what authoritative source backs the claim?" (the MIF
specification); and the typed `relationships[]` let an agent traverse to the
tutorial and reference docs without parsing this sentence. Compare good-l1.md,
which carries the same explanation at the L1 floor and can answer none of these.
-->
