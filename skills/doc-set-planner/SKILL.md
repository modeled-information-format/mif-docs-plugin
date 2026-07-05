---
name: doc-set-planner
description: Plan and decompose a broad documentation subject into a coordinated SET of MIF documents, fan out to the genre member skills, and reconcile the cross-document MIF relationship graph. Use when a request spans multiple documents ("document the auth system", "produce the full spec set for feature X") rather than a single genre artifact.
argument-hint: "<subject> [--recipe diataxis|ai-spec|kiro|architecture]"
---

# doc-set-planner

The orchestration engine of the suite. A broad subject is *planned and
decomposed*, not hand-assembled doc-by-doc. One engine + declarative per-group
recipes (mirroring an orchestrator -> fan-out pattern): take a subject, decompose
it into a group's member documents, fan out to the member genre skills, and
reconcile the cross-document MIF `relationships[]` graph.

## Engine flow (genre-agnostic)

1. **Scope** — take the subject + target group; load the group recipe from
   `recipes/<group>.json`.
2. **Plan** — decompose into the recipe's member docs; emit a plan (what each
   member covers, the shared MIF namespace, the intended cross-link graph).
   When a semantic corpus is available, search it for each planned member
   first (see *Semantic discovery* below) and surface strong hits as
   "existing coverage — extend instead of create?" decisions in the plan.
3. **Fan-out** — invoke each member skill with its slice; members author
   independently (in parallel where possible).
4. **Reconcile** — wire MIF `relationships[]` across members per the recipe's
   cross-link contract; dedupe entities. When a corpus is available, offer
   find-similar results per member as *candidate* additional
   `relationships[]` targets for the author to accept or reject.
5. **Validate** — every member passes its own acceptance (`mif-validate --level
   1`) **and** the set is *link-complete*: every declared cross-`relationships[]`
   target resolves to a produced member.

## Recipes (data, not code) — `recipes/*.json`

| Recipe | Members | Decomposition | Cross-link contract |
| --- | --- | --- | --- |
| `diataxis` | tutorial, how-to, reference, explanation | subject -> 4 user-need modes | each mode links to its siblings |
| `ai-spec` | prd, feature-spec, ai-architecture-doc | problem -> solution -> architecture | PRD `realized-by` feature-spec; feature-spec `depends-on` arch-doc |
| `kiro` | kiro-requirements, kiro-design, kiro-tasks | feature -> req -> design -> tasks | tasks trace-to design trace-to requirements |
| `architecture` | arc42-arch-doc, c4-model-diagram | subject -> narrative + diagrams | C4 diagrams referenced by matching arc42 sections |

## What stays standalone

Singletons have no member set and are invoked directly: `adr`, `changelog`,
`sre-runbook`, `playbook`, `rust-rfc`, `python-pep`, `google-design-doc`,
`engineering`, `academic`, `systematic-review`, `computing-paper`,
`humanities-mla`, `humanities-chicago`, `clinical-submission`, `nist-sp`,
`regulatory-disclosure`, `compliance-audit`, `security-pentest`,
`legal-memo`, `market-research-report`, `sustainability-report`,
`trend-analysis`, `competitive-quadrant`, `briefing`, `exec-summary`.

## Semantic discovery (optional, via mif-corpus)

When the optional mif-rs tooling is available (an `mif-mcp` server or the
`mif-cli` binary — see the `mif-corpus` skill for resolution order and store
conventions), the engine uses it at exactly two points:

- **Plan** — search the corpus (`search_documents` / `mif-cli search`) with
  each planned member's one-line scope. A hit scoring roughly 0.55 or higher
  is surfaced in the plan as an existing-coverage decision: extend the found
  doc, or proceed and cross-link it. State the score and id; the human (or
  calling context) decides.
- **Reconcile** — for each produced member, run find-similar
  (`find_similar_documents` / `mif-cli find-similar`) on its `urn:mif:` id
  and offer the top matches as candidate `relationships[]` targets beyond
  the recipe's contract. Candidates are suggestions; never write them into a
  member silently.

Two hard rules. First, **the corpus never gates**: recipe decomposition, the
cross-link contract, and `planner-check` behave byte-identically with or
without it — similarity output adds candidates and decisions, not verdicts.
Second, **absence is stated, not papered over**: with no corpus available the
engine runs exactly as before, and if discovery was asked for explicitly, say
the tooling is not installed rather than substituting string search.

## Link-completeness check

```bash
node scripts/planner-check.mjs <recipe>   # asserts every recipe member exists
                                           # and the cross-link graph closes
```

`planner-check` is deterministic and corpus-independent by design: it checks
the declared cross-link graph over the recipe's declared member set, never
similarity.
