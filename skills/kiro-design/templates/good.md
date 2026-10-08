---
id: 138267b4-62e0-55db-a00a-1da7698c8050
type: semantic
created: '2026-06-29T10:00:00Z'
modified: '2026-06-29T10:00:00Z'
namespace: spec/kiro/design/avatar-upload
title: 'Design: Profile Avatar Upload'
tags:
  - kiro
  - design
  - profile
temporal:
  '@type': TemporalMetadata
  validFrom: '2026-06-29T00:00:00Z'
  ttl: P3M
  recordedAt: '2026-06-29T10:00:00Z'
provenance:
  '@type': Provenance
  sourceType: user_explicit
  trustLevel: high_confidence
relationships:
  - type: derived-from
    target: /spec/kiro/requirements/avatar-upload.md
  - type: realized-by
    target: /spec/kiro/tasks/avatar-upload.md
ontology:
  '@type': OntologyReference
  id: mif-docs
  version: 1.0.0
  uri: https://mif-spec.dev/ontologies/mif-docs
entity:
  name: Profile Avatar Upload
  entity_type: design-spec
---

# Design: Profile Avatar Upload

## Overview

Avatar upload is handled by an `AvatarController` that validates the image,
delegates storage to an `AvatarStore`, and updates the user's profile pointer.
Previews are client-side; nothing is persisted until the user confirms
(satisfies Requirements 1 and 2).

## Architecture

```mermaid
flowchart LR
  UI[Profile UI] --> C[AvatarController]
  C --> V[ImageValidator]
  C --> S[AvatarStore]
  C --> P[(Profile DB)]
  S --> O[(Object Storage)]
```

## Components and Interfaces

- **ImageValidator** — `validate(file) -> Ok | Error{too_large | unsupported}`.
  Enforces PNG/JPEG and the 5 MB limit (satisfies Requirement 1.2, 1.3).
- **AvatarStore** — `put(userId, bytes) -> url`, `delete(url)`. Writes to object
  storage; schedules deletion of the prior image (satisfies Requirement 3.1).
- **AvatarController** — orchestrates validate -> store -> update profile
  pointer (satisfies Requirement 1.1).

## Data Models

`Profile`:

| Field | Type | Notes |
| --- | --- | --- |
| `user_id` | uuid | primary key |
| `avatar_url` | string \| null | current avatar object URL |
| `avatar_updated_at` | timestamp | last change |

## Error Handling

- `too_large` / `unsupported` -> 400 with the specific error code; no storage
  write occurs (satisfies Requirement 1.2, 1.3).
- Object-storage write failure -> 502; the profile pointer is left unchanged.

## Testing Strategy

- **Unit:** ImageValidator accepts PNG/JPEG ≤ 5 MB, rejects others (Req 1.2/1.3).
- **Integration:** upload -> stored -> profile pointer updated (Req 1.1); replace
  -> prior image scheduled for deletion (Req 3.1).
- **Edge:** exactly-5 MB boundary; concurrent replace.
