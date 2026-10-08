---
id: 737e5c88-b310-50b8-b207-54c9a271cc62
type: procedural
created: '2026-06-29T10:00:00Z'
modified: '2026-06-29T10:00:00Z'
namespace: how-to/security
title: How to Rotate an API Key Without Downtime
tags:
  - how-to
  - security
  - api-keys
temporal:
  '@type': TemporalMetadata
  validFrom: '2026-06-29T00:00:00Z'
  recordedAt: '2026-06-29T10:00:00Z'
  ttl: P1Y
relationships:
  - type: relates-to
    target: /reference/secret-cli.md
ontology:
  '@type': OntologyReference
  id: mif-docs
  version: 1.0.0
  uri: https://mif-spec.dev/ontologies/mif-docs
entity:
  name: Rotate an API Key Without Downtime
  entity_type: how-to-guide
---

# How to Rotate an API Key Without Downtime

Rotate a production API key on a schedule or after a suspected leak while keeping
every running service authenticated throughout the cutover.

## Prerequisites

- `admin` access to the API provider's key console.
- The current key stored in your secret manager as `api/primary-key`.
- Deploy access to roll the services that read that secret.

## Step 1 — Issue a new key alongside the old one

Create a second active key without revoking the first:

```bash
provider keys create --name "primary-$(date +%Y%m%d)" --scopes read,write
```

Copy the returned key value. Both keys are now valid at the same time.

## Step 2 — Stage the new key as a pending secret version

Write the new value as a new version without promoting it yet:

```bash
secret-cli set api/primary-key --value "$NEW_KEY" --stage pending
```

## Step 3 — Roll the services onto the pending version

Restart each consuming service so it loads the pending version:

```bash
deploy rollout --selector reads-secret=api/primary-key --use-stage pending
```

Confirm every replica reports ready before continuing:

```bash
deploy status --selector reads-secret=api/primary-key
```

## Step 4 — Promote the new version

Make the pending version primary so future reads default to it:

```bash
secret-cli promote api/primary-key
```

## Step 5 — Revoke the old key

With all traffic on the new key, revoke the old one:

```bash
provider keys revoke --name primary-previous
```

The key is rotated. Every service stayed authenticated and no requests failed.

<!--
MIF Level 2 (ceiling for this genre): adds namespace, modified, temporal
validity (validFrom + ttl: P1Y + recordedAt), and a typed `relates-to`
relationship to the reference doc this how-to pairs with
(/reference/secret-cli.md). Now an agent can answer, from frontmatter alone:
"is this procedure still current?" (temporal.ttl P1Y flags it for review one
year after recordedAt — procedures rot when the CLI changes), "when was it last
revised?" (modified), and "which reference catalogs the commands it runs?"
(relationships[] — the Diataxis how-to↔reference pairing made machine-traversable)
— no step parsing. The same document still reads as a human how-to and projects
losslessly to JSON-LD and back. L2 is the honest ceiling: a procedure carries no
ontology/provenance/citations the way a decision record (ADR L3) does.
-->
