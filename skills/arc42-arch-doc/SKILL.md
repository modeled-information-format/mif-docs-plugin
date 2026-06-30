---
name: arc42-arch-doc
description: Author an arc42 architecture document — the 12-section industry template (introduction & goals, constraints, context, solution strategy, building blocks, runtime, deployment, cross-cutting concepts, decisions, quality requirements, risks & tech debt, glossary) that captures a system's architecture as durable declarative knowledge. Use when the user needs a system/software architecture description, an arc42 doc, a software architecture document (SAD), or to record how a system is structured and why. Anti-trigger; for a single decision use an ADR (structured-madr/Nygard), and for task steps use a runbook/how-to.
argument-hint: "<the system to document>"
---

# arc42-arch-doc

Produces a **software architecture document** following the **arc42** template
(arc42.org): a stable, 12-section structure for describing what a system is, how
it is built, and why those choices were made. The output is *declarative
knowledge about a system* — semantic, not a time-stamped event log and not a
step-by-step procedure.

## The 12 arc42 sections (industry pattern)

Document them in order. Each has a defined job; do not merge or skip the
load-bearing ones (1, 3, 5, 8, 9).

1. **Introduction and Goals** — what the system does, its top 3–5 quality goals,
   and the key stakeholders (role → concern/expectation).
2. **Architecture Constraints** — fixed rules the architecture must obey
   (technical, organizational, regulatory) that are *not* free design choices.
3. **Context and Scope** — the system as a black box: external actors and
   neighboring systems, plus the business and technical interfaces crossing the
   boundary. Defines what is in vs. out of scope.
4. **Solution Strategy** — the handful of fundamental decisions (technology,
   decomposition approach, key patterns) that shape everything else; a short
   bridge from goals (1) to structure (5).
5. **Building Block View** — the static decomposition: the system broken into
   black-box building blocks (level 1), then their responsibilities and, where
   useful, their internals (level 2+).
6. **Runtime View** — how building blocks collaborate at runtime for a few
   important scenarios (a request flow, startup, an error path).
7. **Deployment View** — the technical infrastructure: nodes/environments and
   which building blocks are mapped onto them.
8. **Cross-cutting Concepts** — concepts that apply across building blocks
   (persistence, security/authn, error handling, logging, i18n) so they are not
   re-specified per component.
9. **Architecture Decisions** — the important, hard, or expensive decisions with
   their rationale (or links to ADRs). Why, not just what.
10. **Quality Requirements** — quality goals made concrete as a quality tree plus
    testable scenarios (stimulus → expected response/measure).
11. **Risks and Technical Debt** — known architectural risks and accrued debt,
    each with an impact and a mitigation or pay-down plan.
12. **Glossary** — domain and technical terms with definitions, so the doc has a
    single shared vocabulary.

## Authoring rules that keep it arc42

- **Pragmatic, not exhaustive** — include a section only with real content; if a
  section truly does not apply, say so in one line rather than padding it. Never
  leave `TBD`/`TODO` standing in a published doc.
- **Goals drive structure** — the quality goals in §1 must reappear as concrete
  scenarios in §10 and motivate the decisions in §4 and §9.
- **Black box before white box** — §3 and §5-level-1 describe boundaries and
  responsibilities before any internal detail.
- **Decisions carry rationale** — §9 records *why*; an outcome with no reasoning
  is not an architecture decision.
- **Diagrams are summarized in prose** — every diagram (context, building block,
  deployment) needs a sentence of explanation so the doc reads without it.

## MIF frontmatter

`type: semantic` — an architecture document is durable declarative knowledge
about a system, not a dated event (`episodic`) or a how-to (`procedural`). The
genre label `arc42` lives in `namespace`/`tags`, never in `type`. Climb to L2
naturally with a `namespace` (e.g. `architecture/<system>`), `title`, and `tags`
when the system is known. Gate every output with `mif-validate --level 1`.

### Why machine-readable

The same 12 sections of prose are readable by a person at any level. The MIF
frontmatter is what lets an *agent* reason about the document without parsing it:
`temporal` answers "is this architecture still current?", `provenance` answers
"where did it come from and who stands behind it?", typed `relationships[]`
answer "what C4 model and ADRs does it connect to?", and `ontology` answers "what
kind of document is this?". Climb only as far as the system honestly supports.

See `templates/good-l1.md` (the same Linkly architecture at the **L1 floor** —
`id`/`type`/`created` only; valid, but opaque to every query above) and
`templates/good.md` (the same doc at **MIF Level 3** — ontology, temporal
validity, W3C-PROV provenance, an arc42.org citation, and typed cross-genre
relationships). `templates/bad.md` shows the common failure: missing sections and
`TBD` filler.
