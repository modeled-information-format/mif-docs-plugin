---
name: mif-frontmatter
description: Author MIF (Modeled Information Format) Level 1-3 frontmatter for any document, climbing from the L1 floor to L2/L3 only when the drafting context supplies real detail. Use whenever a doc needs MIF-conformant YAML frontmatter that projects losslessly to the canonical JSON-LD.
argument-hint: "<path to the document> [--level 1|2|3]"
---

# mif-frontmatter

Shared substrate for every genre skill in this suite. It governs the YAML
frontmatter that makes a document a MIF unit: a block that projects to the
canonical JSON-LD and validates fail-closed against
`https://mif-spec.dev/schema/`.

## The "one artifact, two readers" contract

A MIF doc exists in two interconvertible forms — human-readable **markdown**
(frontmatter + body) and machine-readable **JSON-LD** (the schema-checked
canonical object). Authoring is bidirectional and the round-trip is lossless;
see the `mif-validate` skill for the tooling.

## Level floors (attempt the highest the context supports)

| Level | Frontmatter fields | Emit when |
| --- | --- | --- |
| **L1 (hard floor)** | `id`, `type`, `created` (+ body becomes `content`) | **Always.** Below L1 is a skill error. |
| **L2** | `namespace`, `modified`, `temporal` | review cadence / topic namespace known |
| **L3** | `provenance`, `citations[]`, `relationships[]` | doc sourced from real, attributable input |

### Field projection (markdown frontmatter -> JSON-LD)

- `id` -> `@id` (auto-prefixed `urn:mif:` if not already a URN)
- `type` -> `conceptType`; MUST be one of `semantic`, `episodic`, `procedural`
  (declarative knowledge / time-bound record / how-to). `@type` is always
  `Concept`. The document *genre* (adr, tutorial, runbook…) lives in
  `namespace`/`tags`, **not** in `type`.
- `created` -> `created` (ISO-8601 date-time)
- body -> `content`
- every other field passes through verbatim (it must be a valid MIF property or
  an open extension key).

## Grade-down rule (never fabricate)

Attempt the highest level the drafting context supports, **field by field**. If a
level's required field cannot be populated from real input (no citations -> no
L3; no review cadence -> omit `temporal`), **drop to the next lower level rather
than writing a placeholder**. Never emit empty or `TODO` MIF fields. This helper
*proposes* frontmatter; `mif-validate` *disposes*.

## Minimal L1 example

```yaml
---
id: 7b3c1e90-5a2f-4c8d-9e10-2f6a4b8c1d3e
type: semantic
created: 2026-06-29T10:30:00Z
---
```
