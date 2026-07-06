---
id: runbook-cut-attested-release
type: procedural
created: '2026-06-30T10:00:00Z'
modified: '2026-07-06T00:00:00Z'
namespace: runbook/mif-docs-release
title: 'mif-docs: Cut an Attested Release'
tags:
  - runbook
  - release
  - slsa
  - attestation
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
    - '@id': urn:mif:adr-0003-attested-delivery
      '@type': prov:Entity
    - '@id': urn:mif:source:release.yml
      '@type': prov:Entity
citations:
  - '@type': Citation
    citationType: tool
    citationRole: methodology
    title: 'gh attestation verify — fail-closed workstation verification of release provenance'
    url: https://cli.github.com/manual/gh_attestation_verify
  - '@type': Citation
    citationType: tool
    citationRole: source
    title: 'actions/attest-build-provenance — generates the SLSA build provenance this runbook verifies'
    url: https://github.com/actions/attest-build-provenance
  - '@type': Citation
    citationType: specification
    citationRole: background
    title: 'SLSA — Supply-chain Levels for Software Artifacts'
    url: https://slsa.dev/
    accessed: '2026-06-30'
relationships:
  - type: relates-to
    target: urn:mif:adr-0003-attested-delivery
  - type: relates-to
    target: urn:mif:how-to-validate-and-author
entity:
  name: mif-docs Cut an Attested Release
  entity_type: runbook
extensions:
  x-runbook-type: tactical
  x-related-adr: adr-0003-attested-delivery
---

# mif-docs: Cut an Attested Release

## 1. Overview

This runbook is the tactical procedure for cutting an attested `v`-release of the
**mif-docs** plugin from the `modeled-information-format/mif-docs-plugin` repo. A
release is "attested" when `.github/workflows/release.yml` builds a reproducible
`git archive` tarball, generates SLSA build provenance, and **fail-closed
verifies** that provenance with `gh attestation verify --signer-workflow`
*before* uploading `mif-docs-plugin-<tag>.tar.gz`. It covers the full path from a
green `main` to a marketplace pin update.

It does **not** cover authoring docs or changing gates — for that, see the
attested-delivery decision record (`adr-0003-attested-delivery`) and the
validate/author how-to (`how-to-validate-and-author`). This runbook assumes the
gates are already wired and you simply need to ship.

## 2. Prerequisites & Access

Confirm these before you start; sorting out access mid-cut wastes a release
window.

- `gh` CLI authenticated as a **user account** (a PAT, not a bot) with write
  access to `modeled-information-format/mif-docs-plugin`. The human/PAT identity
  is load-bearing in section 5 — a bot-created release does not fire the
  `release: published` event that triggers the workflow.
- Push access to `main` (for the version bump) and permission to create releases.
- Local checkout of `mif-docs-plugin` on an up-to-date `main`.
- A workstation with `gh attestation verify` available (gh 2.40+).

## 3. Pre-flight: confirm CI is green and bump the version

1. **Confirm CI green on `main`.** Do not cut from a red tree.

   ```bash
   gh run list --repo modeled-information-format/mif-docs-plugin \
     --branch main --workflow ci.yml --limit 1
   ```

   Expected: the latest `ci.yml` run is `completed` / `success`
   (`pin-check` + `actionlint`, `validate`, `adr-smadr` all green). If it is
   failing, stop and fix CI first — an attested release of a broken tree is still
   broken.

2. **Bump the plugin version.** Edit `plugin.json` so `version` is the new
   release (e.g. `0.1.0` → `0.2.0`), commit on a branch, and merge to `main` the
   normal way. The tag you cut in section 5 must match this version.

   ```bash
   gh release list --repo modeled-information-format/mif-docs-plugin --limit 3
   ```

   Expected: the new version is **not** already an existing release tag. Re-using
   a tag will not re-attest a prior artifact — pick the next unused `vX.Y.Z`.

## 4. Dry-run the release workflow

Before cutting anything immutable, prove the pipeline is green end to end.
`workflow_dispatch` runs `release.yml` in **dry-run** mode — it builds, attests,
and verifies but does **not** upload.

```bash
gh workflow run release.yml --repo modeled-information-format/mif-docs-plugin --ref main
gh run watch --repo modeled-information-format/mif-docs-plugin \
  "$(gh run list --repo modeled-information-format/mif-docs-plugin \
      --workflow release.yml --limit 1 --json databaseId -q '.[0].databaseId')"
```

Expected result: the run reaches `success` with the **build → attest → verify**
steps all green. If `verify` fails here, the signer-workflow identity or the
attestation is wrong — fix it now, while nothing has been published. Do not
proceed to the real cut until the dry-run is clean.

## 5. Cut the release (this triggers the attested upload)

Create the GitHub Release at the target commit **as a user/PAT, not a bot**. The
`release: published` event is what triggers `release.yml` to run for real: gate →
reproducible tarball → SLSA attest → fail-closed verify → upload
`mif-docs-plugin-<tag>.tar.gz`.

```bash
# Replace v0.2.0 with your bumped version; --target pins the exact commit.
gh release create v0.2.0 \
  --repo modeled-information-format/mif-docs-plugin \
  --target main \
  --title "mif-docs v0.2.0" \
  --notes "Attested release. Artifact verified fail-closed before upload."
```

Expected result: the publish triggers a `release.yml` run on the `release`
event. Watch it to completion:

```bash
gh run watch --repo modeled-information-format/mif-docs-plugin \
  "$(gh run list --repo modeled-information-format/mif-docs-plugin \
      --workflow release.yml --event release --limit 1 \
      --json databaseId -q '.[0].databaseId')"
```

When it is green, the release has `mif-docs-plugin-v0.2.0.tar.gz` attached. The
same run also tags `mif-docs--v0.2.0` at this commit (read from `plugin.json`'s
`name`/`version`) — that is the tag shape Claude Code's dependency resolver
looks for when another plugin declares a semver range on `mif-docs` (e.g.
`"version": "^0.2.0"`), rather than the bare `v0.2.0` tag above.

## 6. Verify the artifact from a workstation

Independently verify the uploaded artifact's attestation — do not trust the run's
own green check alone.

```bash
gh release download v0.2.0 \
  --repo modeled-information-format/mif-docs-plugin \
  --pattern 'mif-docs-plugin-v0.2.0.tar.gz'

gh attestation verify mif-docs-plugin-v0.2.0.tar.gz \
  --repo modeled-information-format/mif-docs-plugin \
  --signer-workflow modeled-information-format/mif-docs-plugin/.github/workflows/release.yml
```

Also confirm the dependency-resolution alias tag landed:

```bash
git ls-remote --tags https://github.com/modeled-information-format/mif-docs-plugin.git \
  | grep 'refs/tags/mif-docs--v0.2.0'
```

Expected result for the alias-tag check: a line containing
`refs/tags/mif-docs--v0.2.0`. Empty output means the tagging step in
`release.yml` failed or didn't run — check the run's logs.

Expected result: `gh attestation verify` prints a success line confirming the
provenance was issued by the `release.yml` signer workflow for this repo. A
non-zero exit means the artifact is **not** trustworthy — go to section 8.

## 7. Register the new tag in the marketplace

Update the `claude-code-plugins` marketplace pin so installs resolve to the new
release. Pin **both** the tag and its commit sha (the org enforces sha pins).

```bash
git rev-parse v0.2.0   # the sha to pin alongside the tag
```

Edit the marketplace entry for `mif-docs` to point at the new `tag` + `sha`, open
the PR, and let `catalog-admission` run. Expected result: `catalog-admission`
re-verifies the release attestation fail-closed and goes green; once merged,
`claude plugin install mif-docs@modeled-information-format` resolves to the new
version.

## 8. Detection, symptoms & rollback

**Symptom: a tag was published but no artifact appeared.** The attestation step
failed — the verify gate is fail-closed, so a failed attest/verify uploads
nothing. The published tag with an empty release is the tell.

```bash
gh run list --repo modeled-information-format/mif-docs-plugin \
  --workflow release.yml --event release --limit 1
gh run view --repo modeled-information-format/mif-docs-plugin \
  "$(gh run list --repo modeled-information-format/mif-docs-plugin \
      --workflow release.yml --event release --limit 1 \
      --json databaseId -q '.[0].databaseId')" --log-failed
```

Read the failed step: a red **verify** step means the signer-workflow path or the
attestation did not match; a red **attest** step means provenance generation
failed.

**Rollback.** A published release with no verified artifact is not a usable
release — retract it rather than leaving a half-cut tag:

```bash
gh release delete v0.2.0 --repo modeled-information-format/mif-docs-plugin --cleanup-tag
```

Then fix the root cause, re-run the section 4 dry-run until green, and re-cut from
section 5. Do **not** update the marketplace pin (section 7) until section 6
verification passes from a workstation — an unverified artifact must never be the
pinned target.

<!--
MIF Level 3 (highest this genre supports). The frontmatter lets a machine
consumer act on this runbook without parsing the prose:

- `temporal.validFrom` + `ttl: P6M` — answer "is this runbook still fresh?" A CI
  freshness gate flags it for review six months after `validFrom`, so the
  release procedure is re-checked against the live workflow before it drifts.
- `ontology` (`runbook` v1.0.0) — type the document as an operational runbook so
  tooling applies the right schema and expectations.
- `provenance` (`sourceType: user_explicit`, `trustLevel: verified`) — a verified,
  human-authored procedure outranks an inferred draft.
- `relationships[]` — without reading the body, a dependency walker sees this
  runbook `relates-to` the attested-delivery decision (`adr-0003-attested-delivery`)
  it operationalises and the validate/author how-to (`how-to-validate-and-author`)
  that precedes a cut.

The document still reads as a human runbook and projects losslessly to JSON-LD
and back.
-->
