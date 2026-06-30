---
id: explanation-two-views
type: semantic
created: 2026-06-29T10:00:00Z
---

# Why MIF Separates the Human and Machine Views

Every documentation format eventually has to answer one awkward question: who is
the document *for* — a human reading prose, or a machine parsing structure? MIF
refuses to choose. A single artifact carries both a human-readable markdown view
and a machine-readable JSON-LD view, and the two are losslessly interconvertible.

## The tension it resolves

People want flowing prose; tools want fields they can query, types they can
validate, and identifiers they can link. Optimize hard for one and you punish the
other. MIF treats this not as a compromise to split down the middle but as two
*views* of the same meaning: the markdown is what a person edits, the JSON-LD is
what a system reasons over, and neither is the "real" document.

## Why not the obvious alternatives

Generating the data from prose is brittle — extracted structure drifts from what
the author meant. Generating the prose from data reads like a filled-in form.
Bolting metadata onto the side lets the document and its structure silently
disagree. MIF makes the two views *equal and bound* instead, and enforces a
lossless round-trip so they cannot drift.

## In short

Separating the human and machine views lets a team write naturally *and* let
systems validate, link, and query — without maintaining two copies. The cost is
the discipline of the round-trip; the payoff is documentation that is pleasant to
write and trustworthy to compute over.

<!--
MIF Level 1 (floor): id, type, created + body only. This is a complete, valid
explanation — but to a machine consumer it is opaque prose. It cannot be queried
for "is this rationale still current?", "who authored it and how far do I trust
it?", "what source backs it?", or "what does it relate to?". Compare good.md,
which carries the same explanation at full L3: temporal validity, W3C-PROV
provenance, a citation to the MIF spec, and typed relationships to the tutorial
and reference docs.
-->
