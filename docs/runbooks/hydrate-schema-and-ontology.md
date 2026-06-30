---
id: runbook-hydrate-schema-ontology
type: procedural
created: '2026-06-30T10:00:00Z'
modified: '2026-06-30T10:00:00Z'
namespace: runbook/mif-docs-hydration
title: 'mif-docs: Hydrate Schema & Ontology Caches'
tags:
  - runbook
  - schema
  - ontology
  - hydration
  - mif-docs
ontology:
  '@type': OntologyReference
  id: mif-docs
  version: 1.0.0
  uri: https://mif-spec.dev/ontologies/mif-docs
temporal:
  '@type': TemporalMetadata
  validFrom: '2026-06-30T00:00:00Z'
  recordedAt: '2026-06-30T10:00:00Z'
  ttl: P6M
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
    - '@id': urn:mif:adr-0002-ontologies-separate-repo
      '@type': prov:Entity
    - '@id': https://mif-spec.dev/schema/
      '@type': prov:Entity
citations:
  - '@type': Citation
    citationType: specification
    citationRole: source
    title: 'MIF canonical JSON Schema — the schema this runbook hydrates into the local cache'
    url: https://mif-spec.dev/schema/
    accessed: '2026-06-30'
  - '@type': Citation
    citationType: repository
    citationRole: source
    title: 'modeled-information-format/ontologies — the sibling repo the ontology cache is hydrated from'
    url: https://github.com/modeled-information-format/ontologies
relationships:
  - type: relates-to
    target: urn:mif:adr-0002-ontologies-separate-repo
entity:
  name: mif-docs Hydrate Schema and Ontology Caches
  entity_type: runbook
extensions:
  x-runbook-type: tactical
  x-related-adr: adr-0002-ontologies-separate-repo
---

# mif-docs: Hydrate Schema & Ontology Caches

## 1. Overview

This runbook refreshes the two cached inputs the **mif-docs** plugin validates
against: the canonical **MIF JSON Schema** (pulled from `mif-spec.dev/schema`)
and the **mif-docs ontology** (pulled from the sibling
`modeled-information-format/ontologies` repo). Both are *caches, never the
authority* — the plugin hydrates them, records the resolved version, and falls
back to the last hydrated copy when offline.

It covers a routine re-hydrate and the validation that proves it took. It does
**not** re-litigate *why* the ontology lives in a separate repo — that is the
decision record `adr-0002-ontologies-separate-repo`. Use this when the schema or
ontology has moved and your local cache is behind.

## 2. Prerequisites & Access

Confirm these before you start.

- Local checkout of the `mif-docs-plugin` repo with `npm ci` already run.
- Network reachability to `https://mif-spec.dev/schema` (for the schema) — see
  section 6 for offline behaviour.
- A sibling checkout of `modeled-information-format/ontologies` at `../ontologies`
  relative to the plugin repo (the path `hydrate-ontology` reads from).

## 3. When to re-hydrate

Re-hydrate when any of these holds — otherwise the cache is fine and you should
not churn it:

- A **schema version bump** on `mif-spec.dev/schema` (the canonical schema moved
  to a new version).
- An **ontology version bump** in the `ontologies` repo.
- `mif-validate` emits a **schema-resolution warning** (it fell back to a stale
  or missing cache).
- You are about to **cut a release** — vendor a fresh copy into the artifact
  rather than shipping a stale cache (see the release runbook).

## 4. Hydrate the schema

Fetch the canonical schema into the local cache and record the resolved version.

```bash
npm run hydrate-schema
```

Expected result: the schema is written under `schema/.cache/<version>/` and the
resolved version is recorded in `schema/VENDOR.lock`. Confirm the lock advanced:

```bash
git diff -- schema/VENDOR.lock
```

A changed `VENDOR.lock` (new `version` / resolved source) confirms the hydrate
took. If `VENDOR.lock` is unchanged, you were already current — that is fine.

## 5. Hydrate the ontology

Pull the mif-docs ontology from the sibling `../ontologies` repo into the local
ontology cache.

```bash
npm run hydrate-ontology
```

Expected result: the ontology is refreshed from `../ontologies`. If the command
errors that the sibling path is missing, clone or update
`modeled-information-format/ontologies` at `../ontologies` and re-run — this is
the most common failure, and it is a path problem, not a schema problem.

## 6. Offline behaviour (read vs release)

Hydration is **fail-safe for reads**: if `mif-spec.dev/schema` is unreachable,
`hydrate-schema` (and any validation that triggers it) falls back to the **last
hydrated copy** and emits a warning rather than failing. You can keep validating
docs offline against the cached schema.

This is *only* safe for read/validate. **Before a release, you must re-hydrate
online** so the artifact vendors a current schema — a release built on a stale
fallback cache may attest the wrong schema version. If you see the fallback
warning during release prep, stop and restore network before continuing.

## 7. Verification

Prove the refreshed ontology is internally consistent and the caches resolve.

```bash
npm run validate-ontology
```

Expected result: `validate-ontology` exits 0 — the ontology YAML conforms and the
namespaces/subtypes are intact. As an end-to-end check, run `mif-validate` on any
shipped exemplar and confirm there is **no** schema-resolution warning:

```bash
node scripts/mif-validate.mjs skills/sre-runbook/templates/good.md --level 3
```

Expected result: `RESULT: VALID` with `schema: <new-version>` and no fallback
warning, confirming docs now validate against the freshly hydrated schema.

## 8. Detection & symptoms

- **Stale `VENDOR.lock`.** `git diff schema/VENDOR.lock` shows no change after a
  known upstream bump → the hydrate did not reach the new version. Check network
  to `mif-spec.dev/schema`; you are likely on the offline fallback (section 6).
- **Schema-resolution warning from `mif-validate`.** The cache is missing or
  behind → run section 4, then re-verify (section 7).
- **Validation drift** — a doc that passed yesterday now fails (or vice versa)
  with no edit to the doc → the resolved schema/ontology version changed under
  you. Re-hydrate both caches, re-run `validate-ontology`, and re-validate the
  affected docs so the verdict is reproducible against a known version.
- **`hydrate-ontology` cannot find the source** → the `../ontologies` sibling
  checkout is missing or on the wrong branch; fix the path and re-run.

<!--
MIF Level 3 (highest this genre supports). The frontmatter lets a machine
consumer act on this runbook without parsing the prose:

- `temporal.validFrom` + `ttl: P6M` — answer "is this runbook still fresh?" A CI
  freshness gate flags it for review six months out, so the hydration steps are
  re-checked against the live scripts before they drift.
- `ontology` (`runbook` v1.0.0) — type the document as an operational runbook so
  tooling applies the right schema and expectations.
- `provenance` (`sourceType: user_explicit`, `trustLevel: verified`) — a verified,
  human-authored procedure outranks an inferred draft.
- `relationships[]` — without reading the body, a dependency walker sees this
  runbook `relates-to` the decision that put the ontology in its own repo
  (`adr-0002-ontologies-separate-repo`), the architectural fact that makes
  hydration necessary in the first place.

The document still reads as a human runbook and projects losslessly to JSON-LD
and back.
-->
