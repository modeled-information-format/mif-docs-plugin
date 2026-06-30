---
name: python-pep
description: Write a Python Enhancement Proposal (PEP) — a formal design document proposing a change to the Python language, standard library, or process, with the canonical RFC822 header preamble plus Abstract, Motivation, Rationale, Specification, Backwards Compatibility, Security Implications, How to Teach This, Reference Implementation, Rejected Ideas, and Open Issues. Use when the user is proposing or drafting a Python language/stdlib/process change in PEP form. Anti-trigger; for a project's own architecture decision use an ADR skill, and for end-user task instructions use a how-to.
argument-hint: "<the proposed Python change>"
---

# python-pep

Produces a **Python Enhancement Proposal**: the standardized design document the
CPython community uses to propose and record changes. A PEP argues a change on
its merits, specifies it precisely enough to implement, and survives review by
the Steering Council or a delegate. It is *not* a tutorial, a changelog, or a
bug report — it is a durable, reviewable design record.

## The three PEP types

- **Standards Track** — a new feature or implementation change to Python (the
  language, the C API, or the standard library). Most PEPs are this type.
- **Informational** — design guidance, conventions, or community information
  that does not propose a new feature (e.g. the release schedule).
- **Process** — a change to a process *around* Python (decision-making,
  governance, tooling) rather than the language itself.

## Status lifecycle

```text
Draft ──> Accepted ──> Final
  │           │
  ├─> Rejected         (turned down on its merits)
  ├─> Withdrawn        (the author abandons it)
  ├─> Deferred         (no champion / not ready)
  └─> Superseded       (replaced by a later PEP)
```

- A PEP opens as **Draft**. Standards Track PEPs may pass through
  **Provisional/Accepted** before reaching **Final** once the reference
  implementation lands.
- **Rejected**, **Withdrawn**, and **Deferred** are terminal-for-now outcomes;
  **Superseded** points forward to the PEP that replaced it.
- The header's `Status:` field always reflects exactly one of these states.

## Pattern (industry: PEP 1 / PEP 12)

1. **Header preamble** — an RFC822-style block: `PEP`, `Title`, `Author`,
   `Status`, `Type` (one of the three above), `Created`, and — for Standards
   Track — `Python-Version`.
2. **Abstract** — a short (≈200 word) description of the proposal.
3. **Motivation** — why the status quo is insufficient; the problem being solved.
4. **Rationale** — why this design, and how it compares to alternatives.
5. **Specification** — the normative, implementable detail of the change.
6. **Backwards Compatibility** — what breaks, and the migration story. Required.
7. **Security Implications** — attack surface and risks, or an explicit "none".
8. **How to Teach This** — how the change is explained to new and existing users.
9. **Reference Implementation** — link to (or inline) working code; required
   before a Standards Track PEP can be marked Final.
10. **Rejected Ideas** — alternatives considered and why they were dropped.
11. **Open Issues** — unresolved questions still under discussion.

## Authoring rules

- One PEP, one proposal. Keep scope narrow enough to accept or reject as a unit.
- The Specification must be precise enough that two implementers produce the same
  behavior. Defer rationale and persuasion to their own sections.
- **Never omit Backwards Compatibility or Rejected Ideas** — reviewers read those
  first. "None" is an acceptable answer; silence is not.
- Address the reader as the Steering Council: state the change, then defend it.

## MIF frontmatter

`type: semantic` — a PEP is declarative design knowledge, not a time-bound log
or a how-to. Climb to L2 with `namespace` (e.g. `pep/standards-track`), `tags`,
and `title` when known. Gate every output with `mif-validate --level 1`.

### Why machine-readable

The frontmatter lets an agent answer questions about a PEP without parsing the
prose: is this proposal still current, where did it come from, what backs the
design, and which other PEPs does it touch. The L1 floor carries none of that —
to a machine it is opaque text. The climb adds the answers as structured fields:

- **L1 floor** — `id`, `type`, `created` + body. A complete PEP, but opaque to a
  machine. See `templates/good-l1.md`.
- **L3 (the highest this genre honestly supports)** — adds `modified`,
  `temporal` (validity window + `ttl`), `provenance` (source + trust), typed
  `citations[]`, and a `relationships[]` link. See `templates/good.md`, which
  gates at `mif-validate --level 3`.

See `templates/good.md` (a conformant Standards Track PEP at L3),
`templates/good-l1.md` (the same PEP at the L1 floor), and `templates/bad.md`
(a PEP with a malformed header and missing required sections — the most common
review-blocking errors).
