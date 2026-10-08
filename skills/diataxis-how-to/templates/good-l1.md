---
id: 737e5c88-b310-50b8-b207-54c9a271cc62
type: procedural
created: 2026-06-29T10:00:00Z
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
MIF Level 1 (floor): id, type, created + body only. This is a complete, valid
how-to — but to a machine consumer it is opaque prose. An agent cannot ask "is
this procedure still current?" (no temporal validity / ttl), "which reference
catalogs the commands it runs?" (no typed relationships), or "when was it last
revised?" (no modified) without parsing the steps. Compare good.md, the L2
ceiling, which adds namespace, modified, temporal validity, and a typed
`relates-to` link to the reference doc this how-to pairs with.
-->
