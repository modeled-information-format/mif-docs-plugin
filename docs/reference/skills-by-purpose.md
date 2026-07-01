---
id: reference-skills-by-purpose
type: semantic
created: '2026-06-30T11:00:00Z'
modified: '2026-06-30T11:00:00Z'
namespace: reference/skills
title: mif-docs skills by purpose
tags:
  - reference
  - mif-docs
  - skills
  - catalog
temporal:
  '@type': TemporalMetadata
  validFrom: '2026-06-30T00:00:00Z'
  recordedAt: '2026-06-30T11:00:00Z'
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
    - '@id': https://github.com/modeled-information-format/mif-docs-plugin
      '@type': prov:Entity
    - '@id': urn:mif:skill-set:mif-docs-genres
      '@type': prov:Entity
citations:
  - '@type': Citation
    citationType: tool
    citationRole: source
    title: mif-docs — MIF documentation plugin for Claude Code
    url: https://github.com/modeled-information-format/mif-docs-plugin
  - '@type': Citation
    citationType: specification
    citationRole: methodology
    title: Diátaxis — Reference
    url: https://diataxis.fr/reference/
    accessed: '2026-06-30'
relationships:
  - type: relates-to
    target: urn:mif:reference-genre-and-cli
  - type: relates-to
    target: urn:mif:tutorial-getting-started
  - type: relates-to
    target: urn:mif:explanation-one-artifact-two-readers
ontology:
  '@type': OntologyReference
  id: mif-docs
  version: 1.0.0
  uri: https://mif-spec.dev/ontologies/mif-docs
entity:
  name: mif-docs skills by purpose
  entity_type: reference-document
extensions:
  x-skill-count: 24
  x-purpose-group-count: 9
---

# mif-docs skills by purpose

Every skill the **mif-docs** suite ships, grouped by the job it does rather than
by the genre it emits. Where the [genre and CLI catalog](../genre-and-cli-catalog/)
is the terse lookup for scripts, recipes, and exit codes, this reference is the
**index** to the suite's 24 skills: a one-line orientation per skill, grouped by
the job it does, with each name linking to its own deep reference doc — what the
document type is, how the skill produces it, when it is beneficial, and the
verified provenance and citations behind it. Consult a section; do not read it
end to end.

Each genre skill ships four exemplars (`good-l1.md` at the L1 floor, `good.md` at
its target level, `bad.md`, and `evals/evals.json`) and is invoked directly, by
name, or routed through the orchestrator.

## Purpose groups at a glance

Each skill name links to its full reference doc.

| Group | Skills | What the group is for |
| --- | --- | --- |
| Orchestrator | [`doc-set-planner`](../skills/doc-set-planner/) | Decompose a broad subject into a coordinated document set and reconcile the cross-document graph. |
| Authoring helpers | [`mif-frontmatter`](../skills/mif-frontmatter/), [`ears-acceptance-criteria`](../skills/ears-acceptance-criteria/), [`mif-validate`](../skills/mif-validate/) | Supply or check the MIF layer and the acceptance criteria that every genre rides on. |
| Diátaxis quadrants | [`diataxis-tutorial`](../skills/diataxis-tutorial/), [`diataxis-how-to`](../skills/diataxis-how-to/), [`diataxis-reference`](../skills/diataxis-reference/), [`diataxis-explanation`](../skills/diataxis-explanation/) | The four user-need modes of product documentation. |
| Architecture & design | [`arc42-arch-doc`](../skills/arc42-arch-doc/), [`c4-model-diagram`](../skills/c4-model-diagram/), [`google-design-doc`](../skills/google-design-doc/), [`ai-architecture-doc`](../skills/ai-architecture-doc/) | Describe how a system is structured and why. |
| Decisions & proposals | [`adr`](../skills/adr/), [`engineering`](../skills/engineering/), [`rust-rfc`](../skills/rust-rfc/), [`python-pep`](../skills/python-pep/) | Record one decision, evaluate options before deciding, or propose one change for consensus. |
| Product & feature specs | [`prd`](../skills/prd/), [`feature-spec`](../skills/feature-spec/) | Scope what to build and the build-ready slice of it. |
| Kiro spec set | [`kiro-requirements`](../skills/kiro-requirements/), [`kiro-design`](../skills/kiro-design/), [`kiro-tasks`](../skills/kiro-tasks/) | The AWS Kiro three-document feature workflow. |
| Operations | [`sre-runbook`](../skills/sre-runbook/), [`playbook`](../skills/playbook/) | Drive response to a failure — one alert, or a class of incidents. |
| Release history | [`changelog`](../skills/changelog/) | A human-curated, versioned record of what changed. |

## Orchestrator

The engine that plans and decomposes a broad subject instead of assembling it
document by document. One engine reads a declarative per-group recipe, fans out
to the member genre skills, and reconciles the MIF `relationships[]` graph across
them.

### `doc-set-planner`

Takes a subject plus a target group, loads the recipe from
`recipes/<group>.json`, decomposes the subject into the recipe's member
documents, invokes each member skill on its slice (in parallel where possible),
then wires the cross-document relationship graph and proves the set is
link-complete — every declared cross-`relationships[]` target resolves to a
produced member.

- **Authors:** a coordinated set of documents plus the relationship graph that links them.
- **Reach for it when:** a request spans multiple documents — "document the auth
  system", "produce the full spec set for feature X".
- **Not this when:** a single genre artifact is wanted; invoke that genre skill directly.
- **Recipes:** `diataxis` (the four quadrants), `ai-spec` (feature-spec +
  ai-architecture-doc), `kiro` (requirements + design + tasks), `architecture`
  (arc42 + C4 + ADRs).

## Authoring helpers

These do not emit a finished genre artifact. They supply or check the MIF layer
every genre rides on, and turn requirements into gradeable acceptance criteria.

### `mif-frontmatter`

Authors MIF Level 1–3 frontmatter for any document, climbing from the L1 floor to
L2 and L3 only as the drafting context supplies real detail — never inventing
provenance or temporal data to reach a level.

- **Authors:** MIF-conformant YAML frontmatter that projects losslessly to canonical JSON-LD.
- **Reach for it when:** any document needs MIF frontmatter, or an existing doc must climb a level.
- **Not this when:** the body genre is the work; pair this with a genre skill.
- **MIF level / type:** L1–L3, genre-dependent.

### `ears-acceptance-criteria`

The EARS helper. Turns a requirement, decision driver, or finding into an
acceptance criterion in EARS notation (Easy Approach to Requirements Syntax) that
a human and an agent grade identically.

- **Authors:** a single EARS-notation acceptance criterion.
- **Reach for it when:** writing acceptance criteria for a PRD, feature spec,
  architecture doc, ADR decision driver, or Kiro requirements document.
- **Not this when:** drafting prose requirements that are not meant to be machine-gradeable.
- **Used by:** the `prd`, `feature-spec`, `kiro-requirements`, and `ai-architecture-doc` genres.

### `mif-validate`

Deterministically proves a document is MIF-conformant: it schema-checks the
JSON-LD against the canonical `mif-spec.dev` schema, enforces the L1/L2/L3 floor,
and verifies the Markdown ↔ JSON-LD round-trip is lossless. It also converts a
document to either output form.

- **Authors:** a pass/fail conformance verdict, and the converted output form.
- **Reach for it when:** gating a document after authoring or editing, or
  converting between Markdown and JSON-LD.
- **Not this when:** authoring content; this is the gate, not a generator.
- **MIF level / type:** validates at L1, L2, or L3.

## Diátaxis quadrants

The four modes of [Diátaxis](https://diataxis.fr/), each matched to a distinct
user need. The modes do not mix: a tutorial teaches, a how-to performs a known
task, a reference is consulted, an explanation illuminates.

### `diataxis-tutorial`

A learning-oriented, hands-on lesson that takes a beginner through one concrete
success by doing, not by explaining.

- **Authors:** a getting-started / onboarding lesson.
- **Reach for it when:** the goal is the learner's confidence through a guided first success.
- **Not this when:** the reader already knows the task (use `diataxis-how-to`) or wants facts (use `diataxis-reference`).
- **MIF level / type:** L2, `procedural`.

### `diataxis-how-to`

A task-oriented recipe that walks a competent user through accomplishing one
real, already-understood goal from start to finish.

- **Authors:** a how-to guide for a single task.
- **Reach for it when:** the user knows what they want to do and needs the steps.
- **Not this when:** the reader is learning (use `diataxis-tutorial`) or looking up facts (use `diataxis-reference`).
- **MIF level / type:** L2, `procedural`.

### `diataxis-reference`

A dry, information-oriented, exhaustive description of one thing — a CLI command,
config file, API endpoint, or schema — whose structure mirrors the thing it
describes.

- **Authors:** reference material a reader consults rather than reads through.
- **Reach for it when:** the user needs lookup material.
- **Not this when:** the reader is learning by doing or accomplishing a task.
- **MIF level / type:** L3, `semantic`.

### `diataxis-explanation`

An understanding-oriented discussion that illuminates the why — background,
design rationale, trade-offs, history, and connections to other ideas.

- **Authors:** a discursive explanation of a concept or decision.
- **Reach for it when:** the reader needs to grasp a concept, not perform a task.
- **Not this when:** the goal is task completion or fact lookup.
- **MIF level / type:** L3, `semantic`.

## Architecture & design

Genres that describe how a system is structured and why, from durable narrative
to leveled diagrams to trade-off-driven design.

### `arc42-arch-doc`

An arc42 architecture document — the 12-section industry template (introduction
and goals, constraints, context, solution strategy, building blocks, runtime,
deployment, cross-cutting concepts, decisions, quality requirements, risks and
technical debt, glossary).

- **Authors:** a full system / software architecture description (SAD).
- **Reach for it when:** a durable, structured account of how a system is built and why is needed.
- **Not this when:** recording a single decision (use `adr`) or task steps (use a runbook / how-to).
- **MIF level / type:** L3, `semantic`.

### `c4-model-diagram`

A C4 model document — Simon Brown's four levels of abstraction (System Context,
Container, Component, Code) rendered as notation-independent Mermaid C4 diagrams
plus an element catalog of people, systems, containers, and components.

- **Authors:** leveled architecture diagrams for mixed technical / non-technical audiences.
- **Reach for it when:** mapping or communicating software architecture at varying zoom levels.
- **Not this when:** recording a decision (use `adr`) or a single sequence / deployment view.
- **MIF level / type:** L3, `semantic`.

### `google-design-doc`

A Google-style engineering design doc — an informal, trade-off-focused narrative
that frames a problem, proposes one design, and weighs the alternatives it
rejected.

- **Authors:** a design narrative to align a team before building.
- **Reach for it when:** a non-trivial technical approach needs sign-off, with rationale on record.
- **Not this when:** a single immutable decision (use `adr`), an evaluation
  built around a mandatory comparison table (use `engineering`), product
  requirements (use `feature-spec`), or an operational procedure (use
  `sre-runbook`).
- **MIF level / type:** L3, `semantic`.

### `ai-architecture-doc`

A composite AI-spec architecture document that embeds an arc42 / C4-style
structure plus testable non-functional requirements and an ADR-style decision log
in one spec-channel artifact a coding agent can consume.

- **Authors:** an architecture spec built for agent consumption.
- **Reach for it when:** an architecture spec must carry structure, NFRs, and decisions together.
- **Not this when:** a pure narrative is wanted (use `arc42-arch-doc`) or diagrams alone (use `c4-model-diagram`).
- **MIF level / type:** L3, `semantic`.

## Decisions & proposals

One records a decision already made, one evaluates options against criteria
before a decision is made, and the others propose a change and seek consensus
before it is made.

### `adr`

An Architectural Decision Record in the Structured MADR format — one decision,
its drivers, the options weighed with risk, the chosen outcome, the consequences
accepted, and an audit trail. Validated by the structured-madr Action in both
smadr and MIF modes.

- **Authors:** a single, auditable architecture decision record.
- **Reach for it when:** capturing a consequential, hard-to-reverse technical choice with rationale.
- **Not this when:** writing a how-to (use `diataxis-how-to`) or requirements
  (use `prd` / `feature-spec`); an evaluation needing a comparison table
  belongs in `engineering` instead.
- **MIF level / type:** L3, `semantic`.

### `engineering`

An engineering decision / evaluation report — Problem/Context, Options
Considered, a mandatory options-vs-criteria Trade-offs comparison table,
Decision, Implementation Notes, and Consequences, with an additive optional
ANSI/NISO Z39.18 technical-report overlay.

- **Authors:** an engineering decision or evaluation report grounded in a
  required comparison table.
- **Reach for it when:** a team must evaluate concrete options against stated
  decision drivers and document the choice for the engineers who build or
  operate it.
- **Not this when:** the decision is already made with no evaluation to show
  (use `adr`), or the alignment narrative reasons in prose rather than a
  mandatory table (use `google-design-doc`).
- **MIF level / type:** L3, `semantic`.

### `rust-rfc`

A Rust-style RFC — a structured design proposal with Summary, Motivation,
Guide-level and Reference-level explanation, Drawbacks, Rationale and
alternatives, Prior art, Unresolved questions, and Future possibilities.

- **Authors:** a request-for-comments design proposal.
- **Reach for it when:** a substantial change needs written design consensus before implementation.
- **Not this when:** the decision is already made and being recorded (use `adr`),
  or the change is a small bug fix.
- **MIF level / type:** L3, `semantic`.

### `python-pep`

A Python Enhancement Proposal — the canonical RFC822 header preamble plus
Abstract, Motivation, Rationale, Specification, Backwards Compatibility, Security
Implications, How to Teach This, Reference Implementation, Rejected Ideas, and
Open Issues.

- **Authors:** a formal PEP proposing a language, standard-library, or process change.
- **Reach for it when:** proposing or drafting a Python change in PEP form.
- **Not this when:** recording a project's own architecture decision (use `adr`)
  or end-user instructions (use a how-to).
- **MIF level / type:** L3, `semantic`.

## Product & feature specs

Scope what to build and why, then the build-ready slice an implementer or coding
agent acts on.

### `prd`

A Product Requirements Document that leads with the problem, defines success
metrics and non-goals, and expresses functional requirements as testable EARS
criteria.

- **Authors:** a product requirements document.
- **Reach for it when:** scoping what to build and why, before design.
- **Not this when:** describing the technical how (use `feature-spec` or `google-design-doc`).
- **MIF level / type:** L3, `semantic`.

### `feature-spec`

A lightweight, AI-ready feature specification — roughly 500–2000 tokens with
Overview, EARS acceptance criteria, Design, and Edge Cases, that an implementer or
coding agent can act on directly.

- **Authors:** a concise, build-ready feature spec.
- **Reach for it when:** a single feature needs an actionable spec.
- **Not this when:** describing org-wide architecture (use `arc42-arch-doc`), a
  decision (use `adr`), or a multi-feature product (use `prd`).
- **MIF level / type:** L2, `semantic`.

## Kiro spec set

The AWS Kiro three-document workflow: numbered requirements feed a traceable
design, which feeds a test-driven task list. Usually produced together via the
`kiro` recipe.

### `kiro-requirements`

The `requirements.md` of a Kiro spec set — numbered requirements, each a user
story plus EARS acceptance criteria.

- **Authors:** the first Kiro artifact, feeding `design.md` and `tasks.md`.
- **Reach for it when:** starting a Kiro spec from requirements.
- **Not this when:** writing the technical design (use `kiro-design`) or task list (use `kiro-tasks`).
- **MIF level / type:** L3, `semantic`.

### `kiro-design`

The `design.md` of a Kiro spec set — the technical design that traces back to the
numbered requirements.

- **Authors:** the second Kiro artifact, between requirements and tasks.
- **Reach for it when:** turning Kiro requirements into a traceable design.
- **Not this when:** writing the requirements (use `kiro-requirements`) or the task list (use `kiro-tasks`).
- **MIF level / type:** L3, `semantic`.

### `kiro-tasks`

The `tasks.md` of a Kiro spec set — a numbered, checkbox implementation plan where
each task is small, test-driven, and traces to the design and requirements it
implements.

- **Authors:** the third Kiro artifact that drives implementation.
- **Reach for it when:** turning a Kiro design into an executable task list.
- **Not this when:** writing the requirements (use `kiro-requirements`) or the design (use `kiro-design`).
- **MIF level / type:** L2, `procedural`.

## Operations

Drive response to failure — one specific alert under pressure, or a class of
incidents across roles and phases.

### `sre-runbook`

A tactical, step-by-step procedure an on-call responder follows to detect,
diagnose, and remediate one specific alert or failure condition under pressure.

- **Authors:** an incident-response runbook for a named alert or symptom.
- **Reach for it when:** a named failure (latency SLO burn, queue backlog,
  replica lag) needs a tactical procedure.
- **Not this when:** coordinating a class of incidents (use `playbook`) or teaching (use `diataxis-tutorial`).
- **MIF level / type:** L2, `procedural`.

### `playbook`

A strategic operational playbook that coordinates a class of situations — a Sev1
outage, for instance — across roles, decision points, and phases.

- **Authors:** a higher-altitude incident / operations coordination document.
- **Reach for it when:** coordinating a class of incidents across roles and phases.
- **Not this when:** fixing one specific alert step by step (use `sre-runbook`).
- **MIF level / type:** L3, `procedural`.

## Release history

### `changelog`

A CHANGELOG in the Keep a Changelog 1.x format — a human-curated,
reverse-chronological record of notable changes per released version, grouped by
Added / Changed / Deprecated / Removed / Fixed / Security and versioned with
SemVer.

- **Authors:** release notes / version history humans read.
- **Reach for it when:** recording notable changes per version for human readers.
- **Not this when:** writing a forward-looking roadmap, a marketing announcement,
  or dumping raw git log lines.
- **MIF level / type:** L2, `semantic`.

## See also

The [genre and CLI catalog](../genre-and-cli-catalog/) is the companion quick-lookup:
the doc-set recipes, the scripts in `scripts/`, and every exit code. The
[getting-started tutorial](../../tutorials/getting-started/) installs the suite and
validates a first document; the [explanation](../../explanation/one-artifact-two-readers/)
covers why each document is at once a human artifact and a machine unit. All three
are linked from this reference's `relationships[]`, which keeps rationale out of
the catalog per Diátaxis.
