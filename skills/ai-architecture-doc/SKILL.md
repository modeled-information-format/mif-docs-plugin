---
name: ai-architecture-doc
description: Write a composite AI-spec architecture document that embeds an arc42/C4-style structure plus testable non-functional requirements and an ADR-style decision log in one spec-channel artifact. Use for an architecture spec a coding agent can consume. Anti-trigger; for a pure narrative use arc42-arch-doc, for diagrams alone use c4-model-diagram.
argument-hint: "<the system or feature to spec for an agent>"
---

# ai-architecture-doc

Produces the spec channel's **composite architecture document**: it embeds the
structural view (arc42/C4 building blocks and components), the **non-functional
requirements** (NFRs) the system must meet, and an embedded **decision log** of
ADR-style entries — in one artifact an implementer or agent can act on.

## Pattern

1. **Context** — the system, its drivers, and external dependencies.
2. **Architecture** — an arc42/C4-style building-block + component view (compose
   the `arc42-arch-doc` and `c4-model-diagram` genres conceptually).
3. **Non-Functional Requirements** — performance, security, scalability,
   observability; testable, expressed as EARS where applicable
   (`ears-acceptance-criteria`).
4. **Decision Log** — ADR-style entries (decision, status, rationale,
   consequences) capturing the choices the architecture embodies.

## Why composite

The spec channel needs structure *and* quality constraints *and* decisions
together, so a downstream agent has the whole contract in one place rather than
chasing three documents. For standalone uses, reach for `arc42-arch-doc`,
`c4-model-diagram`, or `adr` directly.

## MIF frontmatter

`type: semantic`. Climb to L2 with `namespace`, `tags`, `title`. Gate with
`mif-validate --level 1`. See `templates/good.md` and `templates/bad.md`.
