---
id: arch-mif-provenance
type: semantic
created: '2026-07-11T12:00:00Z'
modified: '2026-07-11T12:00:00Z'
namespace: architecture/mif-docs
title: mif-provenance — Witnessed Provenance Architecture Specification
summary: Composite architecture spec for the mif-provenance helper — arc42/C4-style building blocks, EARS non-functional requirements, and the decision log for witnessed (hook-observed) provenance stamping over an append-only session ledger.
tags:
  - architecture
  - mif-docs
  - provenance
  - witnessed
  - hooks
temporal:
  '@type': TemporalMetadata
  validFrom: '2026-07-11T00:00:00Z'
  recordedAt: '2026-07-11T12:00:00Z'
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
    - '@id': https://github.com/modeled-information-format/mif-docs-plugin/issues/63
      '@type': prov:Entity
citations:
  - '@type': Citation
    citationType: repository
    citationRole: source
    title: 'mif-docs-plugin#63 — the mif-provenance Epic (architecture as accepted scope)'
    url: https://github.com/modeled-information-format/mif-docs-plugin/issues/63
  - '@type': Citation
    citationType: documentation
    citationRole: methodology
    title: arc42 — the building-block and quality-requirement structure this spec borrows
    url: https://arc42.org/overview
    accessed: '2026-07-11'
  - '@type': Citation
    citationType: documentation
    citationRole: methodology
    title: Claude Code hooks reference — the observation surface
    url: https://docs.anthropic.com/en/docs/claude-code/hooks
    accessed: '2026-07-11'
relationships:
  - type: relates-to
    target: urn:mif:arch-arc42-mif-docs
  - type: derived-from
    target: urn:mif:adr-0005-provenance-consent
  - type: relates-to
    target: urn:mif:reference-provenance-ledger
  - type: relates-to
    target: urn:mif:reference-skill-mif-provenance
ontology:
  '@type': OntologyReference
  id: mif-docs
  version: 1.0.0
  uri: https://mif-spec.dev/ontologies/mif-docs
entity:
  name: mif-provenance Architecture Specification
  entity_type: architecture-document
extensions:
  x-spec-style: composite-arc42-c4-nfr-decision-log
  x-epic: mif-docs-plugin#63
---

# mif-provenance — Witnessed Provenance Architecture Specification

## 1. Introduction and goals

The suite's existing helpers assert and shape-check the MIF `provenance`
block but cannot establish that it is factually true: `mif-frontmatter`
writes provenance from drafting context, and `mif-validate` passes any
schema-valid block regardless of whether the named agent authored the
document. mif-provenance closes that gap with **witnessed provenance**:
session facts observed by plugin hooks, stamped into frontmatter, **never
asserted by the model being described**.

Goals, in priority order: (1) consent before observation, (2) observation
never disturbs the observed session, (3) determinism everywhere a verdict is
produced, (4) honesty about the trust ceiling of an unsigned local witness.

## 2. Constraints

- Claude Code hook payloads are the primary vendor-documented interface. One
  scoped amendment to the Epic's original "no transcript parsing" non-goal
  (made on explicit user direction): the model id — optional in the
  SessionStart payload and absent from every other event — is read via a
  **bounded tail-scan** of the payload's own `transcript_path` for the newest
  assistant line's `message.model`. One field from the file's last window;
  conversation content is never parsed.
- No new required dependencies: Node only, reusing the plugin's existing
  `js-yaml`/`ajv` stack — and the capture path must stay as dependency-light
  as `mif-guard.mjs`.
- Stamped documents must remain `mif-validate`-valid at their prior level
  with a lossless round-trip.
- No signing infrastructure; the trust ceiling is documented rather than
  engineered away.

## 3. Building blocks (C4 component view)

Four components, one external store:

| Component | Code | Responsibility |
| --- | --- | --- |
| Config Resolver | `scripts/lib/provenance-config.mjs` | The single consent surface: deep-merge `mifProvenance` across the settings hierarchy with the refusal-wins carve-out; fail closed on every config error (ADR-0005). |
| Capture Hooks | `hooks/provenance-{session-start,post-tool-use,session-end}.mjs` | Append witnessed session facts to the ledger; consult the resolver first; fail open on every operational error. |
| mif-provenance skill | `skills/mif-provenance/` + `scripts/mif-provenance.mjs` + `scripts/lib/provenance-stamp.mjs` | `stamp` (witnessed-only fields, fixed `user_stated` trust policy, never `confidence`) and `verify` (deterministic drift report, never restamps). |
| Corpus Check | `scripts/provenance-corpus-check.mjs` | Witnessed-vs-asserted coverage by agent and model; byte-idempotent; wired into CI with a run-twice-and-diff gate. |
| Session Ledger (store) | `<git-dir>/ai-provenance/session.jsonl` | Append-only JSONL contract ([reference](../reference/provenance-ledger.md)); never committed, never leaves the machine. |

A `file_touch` is appended to the touched FILE's repository ledger (where
`stamp`/`verify` later look), while session lines land in the session cwd's
repository — a session in one repo routinely writes into a sibling repo.

Data flow: settings files → **Resolver** → (gate) → **Hooks** → ledger →
**skill verbs** → document frontmatter → **Corpus Check** → coverage report.
The PostToolUse hook additionally hosts the mediated stamp path (`auto`/
`ask`) so capture and stamping order within one write is a program fact, not
a hook-scheduling accident.

## 4. Runtime scenarios

1. **Capture (enabled)** — SessionStart appends the session line; each
   Write/Edit/MultiEdit appends a `file_touch`; SessionEnd appends the
   terminal line.
2. **Capture (disabled)** — every hook resolves config, sees off, and exits 0
   silently before any git discovery or ledger I/O.
3. **Explicit stamp** — the skill selects the witnessing session (flag, env,
   or the unambiguous single toucher), derives expected fields from the
   ledger, splices only the `provenance` block and `modified` line, and
   declines rather than regress the document's MIF level.
4. **Mediated stamp** — `auto` stamps after capture in the same hook process;
   `ask` emits the exact approval command and writes nothing (CI/headless:
   behaves as `off`).
5. **Audit** — `verify` re-derives expectations per document; the corpus
   check aggregates witnessed-vs-asserted coverage.

## 5. Non-functional requirements (EARS)

1. WHEN any capture hook fires with effective `capture: false`, it SHALL exit
   0 having written nothing and emitted nothing, deciding within the 50 ms
   budget (structurally: config resolution precedes all git/ledger I/O).
2. IF any component on the hook path errors for any reason, THEN it SHALL
   exit 0 and leave the document, the ledger, and the session flow unchanged.
3. IF a settings file is missing, malformed, or partially readable, THEN the
   affected scope SHALL resolve to `capture: false` and `stamp: "off"`; a
   configuration error SHALL never enable observation.
4. An explicit disable at any settings scope SHALL override an enable at
   every other scope.
5. WHEN `stamp` runs, it SHALL write only ledger-witnessed fields and SHALL
   NOT write `confidence` under any configuration.
6. WHEN the ledger records no touch of a document by the selected session,
   `stamp` SHALL decline and `verify` SHALL report the document as
   unwitnessed; neither SHALL write provenance naming a session that did not
   touch the document.
7. The `verify` verdict and the corpus report SHALL be deterministic:
   identical inputs yield identical (byte-identical, for the report) outputs,
   with no model in the path.
8. Every stamped document SHALL remain valid at its prior `mif-validate`
   level with a lossless round-trip, stamping modifying only the
   `provenance` block and `modified` timestamp.
9. Outside a git repository, capture SHALL disable; no alternative store is
   invented.

## 6. Failure postures (deliberately asymmetric)

| Surface | Posture | Why |
| --- | --- | --- |
| Config resolution | Fail **closed** (to disabled) | Consent: an unreadable consent surface must never be ridden over. |
| Capture hooks | Fail **open** (exit 0, no output) | Reliability: observation must never block or alter the observed session. |
| Stamp | Decline rather than degrade | A document's conformance outranks its provenance. |
| Verify / corpus check | Deterministic script, no model | The `mif-validate` precedent: verdicts must be reproducible evidence. |

## 7. Decision log

| # | Decision | Where recorded |
| --- | --- | --- |
| 1 | Consent rides the settings hierarchy under one `mifProvenance` key; refusal wins over every precedence rule; config errors fail closed | [ADR-0005](../adr/0005-provenance-consent-in-settings-hierarchy.md) |
| 2 | Ledger lives under the repo's own git dir, append-only JSONL, shared-contract with a future commit-trailer consumer | [Ledger contract](../reference/provenance-ledger.md) |
| 3 | Trust ceiling fixed at `user_stated`; `confidence` never written | [Skill reference](../reference/skills/mif-provenance.md) |
| 4 | Capture and mediated stamp share one PostToolUse process to make ordering deterministic | This spec, §3 |
| 5 | Session selection may only land on a ledger-witnessed toucher; ambiguity errors out | This spec, §4; SKILL.md |

## 8. Risks and technical debt

- **Ledger tamperability** is accepted and priced into the trust ceiling; a
  signed witness would be a new ADR, not a patch.
- **Hook payload drift** (fields appearing/disappearing across Claude Code
  releases) degrades gracefully: unwitnessed fields are recorded as null and
  omitted from stamps, never guessed.
- **`ask` mode's approval surface** is the conversation, not a modal; if
  Claude Code grows a first-class confirmation primitive for PostToolUse,
  the mediated path should adopt it.
