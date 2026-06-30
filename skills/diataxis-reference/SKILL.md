---
name: diataxis-reference
description: Write a Diataxis reference — a dry, information-oriented, exhaustive description of ONE thing (a CLI command, config file, API endpoint, or schema) whose structure mirrors the thing itself. Use when the user needs lookup material they consult, not read through. Anti-trigger; for learning by doing use diataxis-tutorial, for accomplishing a known task use diataxis-how-to.
argument-hint: "<the one thing to describe (CLI, config, API, schema)>"
---

# diataxis-reference

Produces a **reference** in the Diataxis sense: *information-oriented*. The reader
already knows what they are doing and has arrived to look one fact up — a flag's
default, a field's type, an endpoint's status codes. Reference is neutral and
exhaustive; it is not a tutorial (learning-oriented) and not an explanation
(understanding-oriented) — keep those modes out.

## Pattern (industry: Diataxis, diataxis.fr)

1. **Subject line** — one neutral sentence naming the single thing described
   (one command, one file, one endpoint, one schema).
2. **Synopsis / shape** — the canonical signature or structure (a usage line, a
   skeleton config block, a request template) the rest mirrors.
3. **Itemised body** — every item described uniformly. For each: **name, type,
   default, constraints, description**. Use tables or definition lists so the
   layout is identical for every entry.
4. **Boundary facts** — the dry edges: exit codes, status codes, environment
   variables, files read/written, limits. Tabulate; do not narrate.
5. **Examples** — minimal, literal invocations or payloads. Show *what*, never a
   guided *how*.

## Rules that keep it a reference

- Describe, do not instruct. No numbered learning steps, no "first… then…".
- State facts, not opinions or rationale. No "why", no "we recommend", no
  "best practice" — link to an explanation doc for that.
- Be exhaustive and uniform: every item gets the same fields in the same order.
  A missing default is `none` or `—`, never silence.
- Mirror the structure of the thing. The doc's section order matches the thing's
  own order (argument order, field order, endpoint order).
- Stay consistent and predictable: same table columns throughout, same wording
  for "required", same type vocabulary.

## MIF frontmatter

`type: semantic` (declarative knowledge — facts that are true independent of any
task or moment). Climb to L2 with `namespace` (e.g. `reference/cli`), `tags`, and
`title` when known. Gate every output with `mif-validate`; the floor is
`--level 1`.

## Why machine-readable — the point of MIF here

A reference is consumed by agents as much as by people: an agent looking up a
flag's default needs to know the page still describes the current tool, can be
trusted, and where to go for the *why* it deliberately omits. As plain prose
(L1) all of that requires reading and inferring. The MIF layer makes those
questions answerable by *reading frontmatter*:

| Question an agent asks | Answered by (frontmatter) |
| --- | --- |
| Is this reference still current? | `temporal.validFrom` / `ttl` |
| What does it document; can I trust it? | `provenance` (W3C-PROV `wasDerivedFrom`) + `trustLevel` |
| What evidence backs it? | `citations[]` (the tool, the Diátaxis spec) |
| Where is the rationale a reference omits? | typed `relationships[]` (`relates-to` the explanation) |

The same document still reads as a human reference and projects losslessly to
JSON-LD and back — one artifact, two readers.

## The L1 -> L3 climb (exemplars)

This skill ships the **same `mifx export` reference at two MIF levels** so the
climb is explicit:

- `templates/good-l1.md` — **L1 floor**: `id`, `type`, `created` + body. A valid,
  readable reference, but opaque to a machine consumer.
- `templates/good.md` — **L3 (highest the genre supports)**: adds `modified`,
  `temporal` validity, W3C-PROV `provenance` (`wasDerivedFrom` the CLI it
  documents), `citations[]`, and a typed `relates-to` `relationships[]` link to
  the explanation doc. Validate with `mif-validate --level 3`.

Author at the **highest level the drafting context supports** (grade down rather
than fabricate). `templates/bad.md` shows the antipattern: a reference that has
drifted into tutorial/explanation mixing — the most common error.
