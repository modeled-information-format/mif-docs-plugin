---
id: reference-skills-by-purpose
type: semantic
created: '2026-06-30T11:00:00Z'
modified: '2026-07-11T12:00:00Z'
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
  x-skill-count: 43
  x-purpose-group-count: 13
---

# mif-docs skills by purpose

Every skill the **mif-docs** suite ships, grouped by the job it does rather than
by the genre it emits. Where the [genre and CLI catalog](../genre-and-cli-catalog/)
is the terse lookup for scripts, recipes, and exit codes, this reference is the
**index** to the suite's 43 skills: a one-line orientation per skill, grouped by
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
| Authoring helpers | [`mif-frontmatter`](../skills/mif-frontmatter/), [`ears-acceptance-criteria`](../skills/ears-acceptance-criteria/), [`mif-validate`](../skills/mif-validate/), [`mif-corpus`](../skills/mif-corpus/), [`mif-provenance`](../skills/mif-provenance/) | Supply or check the MIF layer and the acceptance criteria that every genre rides on. |
| Diátaxis quadrants | [`diataxis-tutorial`](../skills/diataxis-tutorial/), [`diataxis-how-to`](../skills/diataxis-how-to/), [`diataxis-reference`](../skills/diataxis-reference/), [`diataxis-explanation`](../skills/diataxis-explanation/) | The four user-need modes of product documentation. |
| Architecture & design | [`arc42-arch-doc`](../skills/arc42-arch-doc/), [`c4-model-diagram`](../skills/c4-model-diagram/), [`google-design-doc`](../skills/google-design-doc/), [`ai-architecture-doc`](../skills/ai-architecture-doc/) | Describe how a system is structured and why. |
| Decisions & proposals | [`adr`](../skills/adr/), [`engineering`](../skills/engineering/), [`rust-rfc`](../skills/rust-rfc/), [`python-pep`](../skills/python-pep/) | Record one decision, evaluate options before deciding, or propose one change for consensus. |
| Product & feature specs | [`prd`](../skills/prd/), [`feature-spec`](../skills/feature-spec/) | Scope what to build and the build-ready slice of it. |
| Kiro spec set | [`kiro-requirements`](../skills/kiro-requirements/), [`kiro-design`](../skills/kiro-design/), [`kiro-tasks`](../skills/kiro-tasks/) | The AWS Kiro three-document feature workflow. |
| Operations | [`sre-runbook`](../skills/sre-runbook/), [`playbook`](../skills/playbook/) | Drive response to a failure — one alert, or a class of incidents. |
| Release history | [`changelog`](../skills/changelog/) | A human-curated, versioned record of what changed. |
| Scholarly & scientific writing | [`academic`](../skills/academic/), [`systematic-review`](../skills/systematic-review/), [`computing-paper`](../skills/computing-paper/), [`humanities-mla`](../skills/humanities-mla/), [`humanities-chicago`](../skills/humanities-chicago/) | Formal research writing under a discipline's citation and structural conventions. |
| Regulated & compliance reports | [`clinical-submission`](../skills/clinical-submission/), [`nist-sp`](../skills/nist-sp/), [`regulatory-disclosure`](../skills/regulatory-disclosure/), [`compliance-audit`](../skills/compliance-audit/), [`security-pentest`](../skills/security-pentest/), [`legal-memo`](../skills/legal-memo/) | Reports produced against an external regulatory, standards, or audit framework. |
| Research & market intelligence | [`market-research-report`](../skills/market-research-report/), [`sustainability-report`](../skills/sustainability-report/), [`trend-analysis`](../skills/trend-analysis/), [`competitive-quadrant`](../skills/competitive-quadrant/) | Evidence-grounded reports characterizing a market, trend, or competitive landscape. |
| Business communication | [`briefing`](../skills/briefing/), [`exec-summary`](../skills/exec-summary/) | Short, audience-facing updates and decision summaries. |

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

### `mif-corpus`

Semantic discovery over the suite's MIF documents via the optional mif-rs
tools: ingest docs into a gitignored local vector store, search them by
meaning, surface find-similar candidates for cross-linking, and report corpus
statistics.

- **Authors:** ranked discovery candidates and ingest/stats reports — never a verdict.
- **Reach for it when:** asking "which doc covers X?", hunting `relationships[]`
  targets, or checking coverage before planning a doc set.
- **Not this when:** proving conformance; that is `mif-validate`, and similarity
  is a suggestion signal, never a gate.
- **Requires:** the optional `mif-mcp` server or `mif-cli` binary; states
  unavailability plainly when neither is installed.

### `mif-provenance`

Witnessed provenance: stamps hook-observed session facts (`agent`,
`agentVersion`, the session activity URN) into a document's `provenance`
block from the capture ledger, and verifies an existing block against that
ledger. The distinction from its siblings is the witness: `mif-frontmatter`
*asserts* provenance from drafting context and `mif-validate` *shape-checks*
whatever block is present — only `mif-provenance` proves the named session
actually touched the document. Trust ceiling: `user_stated` (a local,
unsigned ledger), stated plainly on every stamp; `confidence` is never
written. Opt-in, fail-closed consent under the `mifProvenance` settings key,
where an explicit disable at any scope wins
([ADR-0005](../../adr/0005-provenance-consent-in-settings-hierarchy/)). New to
this? [Witness your documents' provenance](../../how-to/witness-document-provenance/)
is the user-facing walk-through.

- **Authors:** a witnessed `provenance` block, or a deterministic match/drift verdict — never prose.
- **Reach for it when:** a document authored in a capture-enabled session
  should carry witnessed rather than asserted provenance, or a block needs
  drift-checking against the ledger.
- **Not this when:** authoring the rest of the frontmatter (`mif-frontmatter`)
  or proving schema/level conformance (`mif-validate`).
- **Requires:** capture enabled (`mifProvenance.capture: true`) so the session
  ledger exists; declines any document the ledger did not witness.

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

## Scholarly & scientific writing

Formal research writing under a discipline's own citation and structural
conventions — empirical, systematic, or argumentative, each with its own rules
for what counts as evidence.

### `academic`

A peer-review-style IMRaD scholarly paper — Introduction, Methods, Results,
Discussion — with a selectable citation style (author-date/APA or
numbered/Vancouver-IMRaD).

- **Authors:** an empirical or synthesis research paper.
- **Reach for it when:** the deliverable is a scholarly write-up of a study,
  experiment, or literature synthesis.
- **Not this when:** the review requires a mandatory PRISMA flow diagram and
  registered protocol (use `systematic-review`), or the deliverable is a design
  narrative rather than a study (use `google-design-doc`).
- **MIF level / type:** L3, `semantic`.

### `systematic-review`

A PRISMA systematic review and meta-analysis — search strategy, PRISMA flow
diagram of identification/screening/inclusion, risk-of-bias assessment, and
synthesis of results.

- **Authors:** a systematic review or meta-analysis with a registered
  protocol.
- **Reach for it when:** synthesizing a body of literature under PRISMA's
  reporting standard, with reproducible inclusion/exclusion counts.
- **Not this when:** a general scholarly write-up with no mandatory flow
  diagram or protocol (use `academic`).
- **MIF level / type:** L3, `semantic`.

### `computing-paper`

An ACM/IEEE computing conference or journal paper — related work,
approach/system design, evaluation, conclusion & future work — with IEEE
numbered citations.

- **Authors:** a systems/computing research paper with an empirical
  evaluation section.
- **Reach for it when:** the venue expects ACM/IEEE structure and
  numbered citations.
- **Not this when:** the citation convention is author-date/APA (use
  `academic`), or the deliverable evaluates options rather than presents novel
  research (use `engineering`).
- **MIF level / type:** L3, `semantic`.

### `humanities-mla`

An MLA 9th-edition humanities paper — in-text parenthetical author-page
citations, a Works Cited list, argumentative thesis-driven structure.

- **Authors:** a literary or humanities argumentative essay.
- **Reach for it when:** MLA is the required citation convention (author-page,
  Works Cited).
- **Not this when:** the convention is Chicago notes-bibliography (use
  `humanities-chicago`), or the paper is empirical/IMRaD (use `academic`).
- **MIF level / type:** L3, `semantic`.

### `humanities-chicago`

A Chicago Manual of Style humanities paper — notes-bibliography system
(footnotes/endnotes) plus a Bibliography.

- **Authors:** a historical or humanities essay citing via footnotes/endnotes.
- **Reach for it when:** Chicago notes-bibliography is the required
  convention.
- **Not this when:** the convention is MLA author-page/Works Cited (use
  `humanities-mla`).
- **MIF level / type:** L3, `semantic`.

## Regulated & compliance reports

Reports produced against an external regulatory, standards, or audit
framework, where the framework's own structure is non-negotiable.

### `clinical-submission`

A clinical study report / eCTD-aligned regulated submission — ICH E3 CSR
structure within the CTD module frame, efficacy and safety kept distinct.

- **Authors:** a clinical study report for regulatory submission.
- **Reach for it when:** the deliverable must follow ICH E3 / CTD structure.
- **Not this when:** the same trial is being written up as a peer-reviewed
  journal manuscript (use `academic`).
- **MIF level / type:** L3, `semantic`.

### `nist-sp`

A NIST Special Publication (e.g. SP 800-series) — normative numbered sections
with explicit shall/should/may force, Definitions/Glossary, numbered
References, lettered Appendices.

- **Authors:** a normative technical-guidance publication.
- **Reach for it when:** the deliverable must read as a NIST SP with
  normative force.
- **Not this when:** the deliverable is an audit finding against controls
  (use `compliance-audit` or `security-pentest`), or a single decision record
  (use `adr`).
- **MIF level / type:** L3, `semantic`.

### `regulatory-disclosure`

An SEC-style annual disclosure report — Reg S-K / Form 10-K item order
(Business, Risk Factors, Properties & Legal Proceedings, MD&A, Financial
Statements, Controls & Procedures).

- **Authors:** an SEC-style annual/periodic disclosure filing.
- **Reach for it when:** the fixed Reg S-K item order is the required
  structure.
- **Not this when:** the deliverable is a SOC 2-style controls audit (use
  `compliance-audit`) or an ESG/sustainability disclosure (use
  `sustainability-report`).
- **MIF level / type:** L3, `semantic`.

### `compliance-audit`

A compliance audit report (SOC 2-style) — management's assertion, system
description, criteria/framework in scope, tests-of-controls & findings matrix
with severity, remediation plan.

- **Authors:** an internal-controls compliance audit report.
- **Reach for it when:** assessing controls against a named framework (e.g.
  SOC 2, ISO 27001) with a mandatory findings matrix.
- **Not this when:** the assessment is an offensive security engagement (use
  `security-pentest`), or a single decision record (use `adr`).
- **MIF level / type:** L3, `semantic`.

### `security-pentest`

A penetration-test report (PTES/OWASP-style) — authorization & scope
statement, dual-audience executive/technical structure, mandatory
severity-ranked findings table with CVSS.

- **Authors:** a penetration-test / offensive-security engagement report.
- **Reach for it when:** reporting an authorized security assessment with
  CVSS-scored findings.
- **Not this when:** the assessment is a controls/framework audit (use
  `compliance-audit` or `nist-sp`).
- **MIF level / type:** L3, `semantic`.

### `legal-memo`

A predictive legal memorandum — IRAC (Issue, Rule, Application, Conclusion),
Bluebook citation style.

- **Authors:** a predictive legal analysis memo.
- **Reach for it when:** answering a legal question under IRAC with cited
  authority.
- **Not this when:** recording an internal technical decision (use `adr`).
- **MIF level / type:** L3, `semantic`.

## Research & market intelligence

Evidence-grounded reports characterizing a market, trend, or competitive
landscape, each with its own required figure or table.

### `market-research-report`

A market research report — methodology/sampling/fieldwork disclosure,
segmentation, findings, conclusions, ESOMAR/ISO 20252 convention.

- **Authors:** a fieldwork-grounded market research study.
- **Reach for it when:** the deliverable rests on disclosed sampling and
  fieldwork methodology.
- **Not this when:** the deliverable is forward-looking scenario/trajectory
  analysis (use `trend-analysis`) or a vendor comparison (use
  `competitive-quadrant`).
- **MIF level / type:** L3, `semantic`.

### `sustainability-report`

A GRI-Standards sustainability/ESG report — GRI 1 Foundation, GRI 2 General
Disclosures, GRI 3 Material Topics, GRI 200/300/400 topic standards, and a
mandatory GRI Content Index.

- **Authors:** a GRI-structured sustainability/ESG report.
- **Reach for it when:** the deliverable must carry a GRI Content Index and
  topic-standard disclosures.
- **Not this when:** the deliverable is a SOC 2-style controls audit (use
  `compliance-audit`) or an SEC filing (use `regulatory-disclosure`).
- **MIF level / type:** L3, `semantic`.

### `trend-analysis`

A trajectory report — drivers and inhibitors, momentum indicators, scenarios
projected over time, with a Mermaid scenario diagram.

- **Authors:** a forward-looking trend/trajectory report.
- **Reach for it when:** projecting a trend's direction and drivers/inhibitors
  over time.
- **Not this when:** the deliverable is a fieldwork-grounded market study
  (use `market-research-report`) or a vendor comparison (use
  `competitive-quadrant`).
- **MIF level / type:** L3, `semantic`.

### `competitive-quadrant`

A two-axis competitive-quadrant report (Gartner Magic Quadrant-style) — a
mandatory Mermaid quadrant chart, per-vendor Strengths/Cautions.

- **Authors:** a two-axis vendor/product comparison.
- **Reach for it when:** placing several vendors on two evaluation axes with
  a required quadrant figure.
- **Not this when:** the deliverable is a descriptive market survey with no
  quadrant placement (use `market-research-report`).
- **MIF level / type:** L3, `semantic`.

## Business communication

Short, audience-facing updates and decision summaries — not research
artifacts, and not meant to be read end to end by a fresh reader without
context.

### `briefing`

A one-page briefing or standup update — What's New, Why It Matters, What's
Next.

- **Authors:** a recurring status/stakeholder-sync update.
- **Reach for it when:** a reader who already has context needs a short,
  time-bound update.
- **Not this when:** the reader needs a standalone summary with no prior
  context (use `exec-summary`).
- **MIF level / type:** L3, `episodic` (time-bound to its coverage period,
  unlike most genres in this suite).

### `exec-summary`

A 1-2 page decision-oriented executive summary — BLUF (bottom line up
front), key findings, recommendation, risks.

- **Authors:** a standalone decision summary for a reader with no prior
  context.
- **Reach for it when:** a decision-maker needs the bottom line first, without
  reading the full underlying report.
- **Not this when:** the reader already has context and just needs a
  recurring update (use `briefing`).
- **MIF level / type:** L3, `semantic`.

## See also

The [genre and CLI catalog](../genre-and-cli-catalog/) is the companion quick-lookup:
the doc-set recipes, the scripts in `scripts/`, and every exit code. The
[getting-started tutorial](../../tutorials/getting-started/) installs the suite and
validates a first document; the [explanation](../../explanation/one-artifact-two-readers/)
covers why each document is at once a human artifact and a machine unit. All three
are linked from this reference's `relationships[]`, which keeps rationale out of
the catalog per Diátaxis.
