---
id: explanation-one-artifact-two-readers
type: semantic
created: '2026-06-30T10:00:00Z'
namespace: explanation/design
title: One Artifact, Two Readers
tags:
  - explanation
  - mif-docs
  - design-rationale
modified: '2026-06-30T10:00:00Z'
temporal:
  '@type': TemporalMetadata
  validFrom: '2026-06-30T00:00:00Z'
  validUntil: '2027-06-30T00:00:00Z'
  recordedAt: '2026-06-30T10:00:00Z'
  ttl: P1Y
provenance:
  '@type': Provenance
  sourceType: agent_inferred
  trustLevel: high_confidence
  agent: anthropic/claude-code
  wasAttributedTo:
    '@id': https://github.com/modeled-information-format
    '@type': prov:Agent
  wasGeneratedBy:
    '@id': urn:mif:activity:mif-docs-self-documentation
    '@type': prov:Activity
  wasDerivedFrom:
    - '@id': https://mif-spec.dev/
      '@type': prov:Entity
    - '@id': urn:mif:source:projection.mjs
      '@type': prov:Entity
citations:
  - '@type': Citation
    citationType: specification
    citationRole: source
    title: MIF — Modeled Information Format Specification v1.0
    url: https://mif-spec.dev/
    accessed: '2026-06-30'
  - '@type': Citation
    citationType: specification
    citationRole: methodology
    title: Diátaxis — Explanation
    url: https://diataxis.fr/explanation/
    accessed: '2026-06-30'
  - '@type': Citation
    citationType: specification
    citationRole: methodology
    title: 'JSON-LD 1.1 — A JSON-based Serialization for Linked Data'
    url: https://www.w3.org/TR/json-ld11/
    accessed: '2026-06-30'
relationships:
  - type: relates-to
    target: urn:mif:tutorial-getting-started
  - type: relates-to
    target: urn:mif:how-to-validate-and-author
  - type: relates-to
    target: urn:mif:reference-genre-and-cli
ontology:
  '@type': OntologyReference
  id: mif-docs
  version: 1.0.0
  uri: https://mif-spec.dev/ontologies/mif-docs
entity:
  name: One Artifact, Two Readers
  entity_type: explanation
extensions:
  x-diataxis-quadrant: explanation
  x-projection-deterministic: true
---

# One Artifact, Two Readers

Every document the **mif-docs** plugin produces is read by two audiences that
want incompatible things. A person wants an arc42 architecture document, a
Diátaxis tutorial, a Keep a Changelog history — a native artifact in its own
genre, written and read as that genre always was. A machine wants typed fields it
can query, a schema it can validate, and identifiers it can link into a graph.
mif-docs refuses to choose between them: each document is simultaneously a
native-genre human artifact **and** a MIF-conformant machine unit. This piece
explains how that dual identity holds, what the climb between levels costs, and
why conformance is enforced rather than trusted.

## Two readers, one file

The genre is the human reader's contract. A how-to still opens with a goal and
walks through numbered steps; an ADR still records one decision and its
consequences. mif-docs does not dilute the genre to make room for metadata — the
body is exactly the document that genre always was.

The MIF layer is the machine reader's contract. It lives in the YAML frontmatter:
an `id`, a `type` (the conceptType), a `created` timestamp at the floor, climbing
to namespaces, temporal validity, provenance, citations, and typed
relationships. A tool never has to parse the prose to learn what the document is,
whether it is still current, who stands behind it, or what it links to — the
frontmatter answers all of that structurally.

These are not two files that resemble each other. They are two *views* of one
meaning. Frontmatter plus body is the human view; the schema-checked JSON-LD
object is the machine view. Neither is the "real" document.

## The deterministic projection

What binds the two views is a projection with no judgment in it. The plugin
parses the YAML frontmatter and the body and projects them to a canonical JSON-LD
object: the `id` becomes a `urn:mif:` `@id`, the `type` becomes `conceptType`,
the body becomes `content`, and every other frontmatter field passes through
verbatim. The reverse projection reconstructs the markdown. Because the transform
is mechanical, the same document always projects to the same object — there is no
language model in the path, and identical input yields an identical result.

This is why the round-trip can be required to lose nothing. The validator
projects markdown to JSON-LD, back to markdown, and forward again, then compares
the two JSON-LD objects. If they differ, information was lost, and that is treated
as a failure rather than acceptable rounding. The lossless round-trip is the
contract that keeps the human view and the machine view genuinely the same thing.

## The L1→L3 climb, and grading down

MIF is layered so that the machine view can be as rich as the drafting context
honestly allows, and no richer. Level 1 is the floor every document meets:
`id`, `type`, `created`. Level 2 adds the always-derivable standard fields —
`namespace`, `modified`, and `temporal` validity. Level 3 adds the attributable
fields — `provenance` and a `temporal.validFrom` — that let a consumer ask who
authored a claim and how far to trust it.

Each genre climbs as high as its content warrants and no further. A reference or
an explanation reaches Level 3, because it is derived from a source and carries
provenance and citations worth recording. A how-to or a tutorial settles at Level
2: a procedure carries no provenance the way a decision record does, so inventing
those fields would be dishonest metadata. Climbing is opportunistic, not
mandatory — a document grades *down* to the floor gracefully rather than
fabricating structure it cannot back. That is why every genre ships both a
`good-l1.md` at the floor and a `good.md` at its target level.

## Why conformance is enforced, not trusted

A convention that documents "should" carry good frontmatter decays the moment
someone is in a hurry. mif-docs does not rely on goodwill. It registers a
PostToolUse hook — the fail-closed guard — that re-runs the deterministic
validator on every genre document the instant it is written or edited. A document
that fails `mif-validate --level 1` makes the guard exit 2 and **blocks** the
write. Conformance is not a promise the author makes; it is a gate the tooling
enforces, proven in both directions by the plugin's own hook test on every push.

This matters because the whole value of the two-view design rests on the views
actually staying in sync. If a non-conformant document could slip through, the
machine view would quietly drift from the human view and every downstream query,
link, and validation built on it would inherit the lie. Enforcing conformance at
the moment of authorship is what turns "one artifact, two readers" from an
aspiration into a guarantee. (ADR documents are the one exception the guard skips
— they are enforced by the structured-madr action instead, not left unchecked.)

## In short

mif-docs takes both readers seriously at once: the human gets a native-genre
artifact, the machine gets a schema-conformant unit, and a deterministic, lossless
projection makes them one document rather than two. The L1→L3 climb lets each
genre be as structured as it can honestly be, and the fail-closed guard makes
conformance something the tool guarantees rather than the author promises. To see
the contract in practice, work through the getting-started tutorial; for the
validate/author/convert mechanics, follow the how-to; for the field-by-field
catalog, consult the reference. All three are recorded as typed `relates-to`
edges in this document's `relationships[]`.
