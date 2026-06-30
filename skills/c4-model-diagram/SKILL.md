---
name: c4-model-diagram
description: Author a C4 model architecture document — Simon Brown's four levels of abstraction (System Context, Container, Component, Code) rendered as notation-independent Mermaid C4 diagrams plus an element catalog of people, systems, containers, and components. Use when the user needs to map or communicate software architecture at varying zoom levels for mixed technical/non-technical audiences. Anti-trigger; for a point-in-time decision record use adr, for a sequence/data-flow or deployment-only view use the matching diagram genre instead.
argument-hint: "<the system to map across C4 levels>"
---

# c4-model-diagram

Produces a **C4 model** in Simon Brown's sense (c4model.com): a set of nested
diagrams that describe a software system at **four levels of abstraction**, each
zooming in one notch. C4 is *abstraction-first and notation-independent* — the
value is the consistent set of boxes-and-lines abstractions (person, software
system, container, component), not any particular drawing tool. Mermaid C4 is
one rendering; the abstractions are the contract.

## The four levels (zoom in one level at a time)

1. **Level 1 — System Context.** The system as a single box, surrounded by its
   **users (people)** and the **other software systems** it talks to. Audience:
   everyone, technical and not. Answers "what is this and who/what uses it".
2. **Level 2 — Container.** Zooms into the system box to show the deployable /
   runnable **containers** (web app, API, mobile app, database, message broker —
   *not* Docker containers specifically) and how they communicate. Audience:
   technical people inside and outside the team.
3. **Level 3 — Component.** Zooms into one container to show its major
   **components** (groupings of related functionality behind an interface) and
   their relationships. Audience: developers of that container.
4. **Level 4 — Code.** Zooms into one component (classes / functions). **Usually
   omitted** — it ages fast and is better generated on demand from the IDE. Most
   C4 docs stop at Level 3.

## Pattern (each level is the same shape)

- A **Mermaid C4 diagram** in a fenced ` ```mermaid ` block using the matching
  block keyword: `C4Context`, `C4Container`, or `C4Component`. Declare people
  with `Person(...)`, systems with `System(...)`/`System_Ext(...)`, containers
  with `Container(...)`/`ContainerDb(...)`, components with `Component(...)`,
  group an in-scope system with a `System_Boundary`/`Container_Boundary`, and
  connect everything with `Rel(...)` labelled by *what* flows and *how*.
- An **element catalog** under the diagram: a short table or list naming each
  element, its kind (person / system / container / component), and its single
  **responsibility**. The catalog is the durable part; the diagram is its view.

## Authoring rules (what keeps it a true C4 model)

- **One level of abstraction per diagram.** Never mix containers and components
  in the same picture — that is the most common C4 failure.
- **People and boundaries are mandatory at Level 1.** A diagram with only
  technical boxes and no actors and no system boundary is an arbitrary
  architecture sketch, not C4.
- **Label every relationship** with intent and (where useful) technology/protocol
  ("Reads from, via JDBC"), and keep the arrows directional.
- **Consistent naming** across levels: the container you zoom into at Level 3 is
  the same named container from the Level 2 diagram.
- Keep technology choices on **containers and components**, not on people or
  external systems.

## MIF frontmatter

`type: semantic` — a C4 model is declarative architectural knowledge (what the
system *is*), not a time-bound event or a how-to. Climb to L2 with `namespace`
(e.g. `architecture/c4/<system>`), `title`, and `tags` when known. Gate every
output with `mif-validate` at its target level; the floor is `--level 1`.

## Why machine-readable — the point of MIF here

A C4 model is consumed as much by tools as by people: a docs pipeline checking
whether an architecture view is stale, an agent tracing which larger document
embeds it, a reviewer asking where the model came from. As prose with embedded
diagrams (L1) every one of those needs reading and inference. The MIF layer makes
them answerable from frontmatter alone:

| Question a consumer asks | Answered by (frontmatter) |
| --- | --- |
| Is this architecture view still current? | `temporal.validFrom` / `validUntil` / `ttl` |
| What kind of document is this? | `ontology` (`architecture-view`) + `conceptType` |
| Where did the model come from; can I trust it? | `provenance` (W3C-PROV) + `trustLevel` |
| What larger document embeds these diagrams? | typed `relationships[]` (`relates-to` the arc42 genre) |

The same document still reads as a human C4 model and projects losslessly to
JSON-LD and back — one artifact, two readers.

## The L1 -> L3 climb (two exemplars)

This skill ships the **same model at two MIF levels** so the climb is explicit:

- `templates/good-l1.md` — **L1 floor**: `id`, `type`, `created` + the body
  (diagrams + element catalogs). A complete, valid C4 model, but opaque to a
  machine consumer. Validate with `mif-validate --level 1`.
- `templates/good.md` — **L3 (the highest this genre honestly supports)**: adds
  `namespace`, `modified`, `temporal` validity, an `architecture-view`
  `ontology` type, W3C-PROV `provenance`, and a typed `relates-to` relationship
  into the arc42 document genre. Validate with `mif-validate --level 3`.

Author at the **highest level the context supports** (grade down rather than
fabricate). `templates/bad.md` shows the antipattern: a "C4" diagram that mixes
abstraction levels and shows tech-only boxes with no people or boundaries.
