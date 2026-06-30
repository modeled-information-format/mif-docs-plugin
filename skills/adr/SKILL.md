---
name: adr
description: Write an Architectural Decision Record (ADR) in the Structured MADR format — one decision, its drivers, the options weighed with risk, the chosen outcome, the consequences accepted, and an audit trail — validated by the structured-madr Action in both smadr and MIF modes. Use when a team is making or capturing a consequential, hard-to-reverse technical choice and needs it documented with rationale. Anti-trigger; for a how-to use diataxis-how-to, for requirements use prd or feature-spec, not an ADR.
argument-hint: "<the decision to record>"
---

# adr

Produces an **Architectural Decision Record**: a short, immutable document that
captures one architecturally significant decision — the context that forced it,
the options considered, the option chosen, and the consequences the team accepts.
An ADR records a *decision*, not a task and not a requirement; if there are no
alternatives to weigh, it is not an ADR.

This genre is **fully aligned to Structured MADR (structured-madr)** — the
MIF-native ADR format. The emitted ADR validates against the canonical
`modeled-information-format/structured-madr` GitHub Action in **both** of its
modes: `smadr` (the structured-MADR frontmatter + section schema) and `mif` (MIF
conformance, levels 1-3). The suite reuses that Action; it does not re-implement
ADR validation.

## Pattern (Structured MADR)

Required frontmatter: `title`, `description`, `type: adr`, `category`, `tags`,
`status` (lifecycle enum), `created` (date), `updated` (date), `author`,
`project`. Optional: `technologies`, `audience`, `related` (each `*.md`).

Required sections, in order:

1. **# ADR-NNNN: \<Title\>** — H1 matches the frontmatter `title`.
2. **## Status** — the lifecycle state.
3. **## Context** → `### Background and Problem Statement` (+ `### Current
   Limitations`).
4. **## Decision Drivers** → `### Primary Decision Drivers` + `### Secondary
   Decision Drivers`. Express testable drivers in EARS (`ears-acceptance-criteria`).
5. **## Considered Options** — `### Option N: <Name>` each with a **Risk
   Assessment** (Technical / Schedule / Ecosystem).
6. **## Decision** — the chosen option and implementation specifics.
7. **## Consequences** — `### Positive` / `### Negative` / `### Neutral`.
8. **## Decision Outcome** — how the decision meets its objectives, with mitigations.
9. **## Related Decisions**, **## Links**, **## More Information**.
10. **## Audit** — dated entries with a status from {Pending, Compliant,
    Non-Compliant, Partial}.

## Lifecycle states

```text
proposed  ->  accepted  ->  deprecated
                       \->  superseded   (by a newer ADR)
```

- `proposed` — drafted, under review; the decision is not yet binding.
- `accepted` — the decision is in force.
- `deprecated` — no longer recommended, with no direct replacement.
- `superseded` — replaced by a newer ADR; link it (typically via a
  `relationships[]` entry of type `superseded-by`).

An accepted ADR is **immutable**: to change the decision, write a new ADR that
supersedes it rather than editing the outcome in place.

## Rules that keep it an ADR

- Exactly one decision per record. Split compound decisions into separate ADRs.
- At least two genuinely considered options; "no alternatives" means no ADR.
- Always state Consequences — the Bad and Neutral ones especially. An ADR that
  lists only upside is hiding its cost.
- Status MUST be one of the lifecycle enum; no free-form statuses ("done",
  "final").
- No placeholder text — every section reflects a real position.

## Why machine-readable — the point of MIF here

An ADR's value is mostly consumed by machines: an agent deciding whether a
decision still holds, a CI gate flagging a stale one, a dependency walker tracing
which spec realizes it. As prose (L1) all of that requires reading and inferring.
The MIF layer makes those questions answerable by *reading frontmatter*:

| Question an agent asks | Answered by (frontmatter) |
| --- | --- |
| Is this decision still valid? | `temporal.validUntil` / `ttl` |
| What replaces or realizes it? | typed `relationships[]` (`superseded-by`, `realized-by`) |
| Where did it come from; can I trust it? | `provenance` (W3C-PROV) + `trustLevel` |
| What kind of thing is this? | `ontology` (`decision-record`) + `conceptType` |
| What evidence backs it? | `citations[]` |

The same document still reads as a human ADR and projects losslessly to JSON-LD
and back — one artifact, two readers.

## The MIF L1 -> L2 -> L3 climb (one doc, smadr's profiles)

In Structured MADR the MIF level is a property of the **projection**, not of a
separate file: structured-madr derives the MIF JSON-LD from the ADR's frontmatter
(`created`/`updated` → `temporal`, `author`/`project` → `provenance`, `related` →
`relationships[]`, `technologies` → `entities[]`, `conceptType: semantic`). So a
single complete ADR satisfies the MIF floor at every level. `templates/good.md`
validates with the structured-madr Action at **`mif --level 1`, `2`, and `3`**
(all pass) and in **`smadr` strict** mode (0 errors).

Validate the ADR with the canonical Action, not this suite's `mif-validate`
(which keys on `conceptType` and is for the other genres):

```bash
# smadr mode (structural)            # mif mode (conformance, level 1|2|3)
node <action>/src/validate.js        node <action>/.github/bin/mif-validate.js --level 3
```

`templates/bad.md` shows the antipattern: no options, no consequences, a status
outside the enum, missing required sections.
