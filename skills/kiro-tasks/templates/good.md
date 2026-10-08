---
id: 83c09437-64e3-5c8d-84ca-2372983a09b3
type: procedural
created: '2026-06-29T10:00:00Z'
modified: '2026-06-29T10:00:00Z'
namespace: spec/kiro/tasks/avatar-upload
title: 'Tasks: Profile Avatar Upload'
tags:
  - kiro
  - tasks
  - profile
temporal:
  '@type': TemporalMetadata
  validFrom: '2026-06-29T00:00:00Z'
  ttl: P3M
  recordedAt: '2026-06-29T10:00:00Z'
provenance:
  '@type': Provenance
  sourceType: agent_inferred
  trustLevel: high_confidence
relationships:
  - type: derived-from
    target: /spec/kiro/design/avatar-upload.md
ontology:
  '@type': OntologyReference
  id: mif-docs
  version: 1.0.0
  uri: https://mif-spec.dev/ontologies/mif-docs
entity:
  name: Profile Avatar Upload
  entity_type: task-plan
---

# Tasks: Profile Avatar Upload

- [ ] 1. Implement the image validator
  - [ ] 1.1 Accept PNG and JPEG, reject other formats with `unsupported`
  - [ ] 1.2 Reject files over 5 MB with `too_large`
  - [ ] 1.3 Unit-test the boundary at exactly 5 MB
  - _Requirements: 1.2, 1.3_

- [ ] 2. Implement the avatar store
  - [ ] 2.1 Write `put(userId, bytes) -> url` to object storage
  - [ ] 2.2 Schedule deletion of the prior image on replace
  - _Requirements: 1.1, 3.1; Design: AvatarStore_

- [ ] 3. Wire the AvatarController
  - [ ] 3.1 Orchestrate validate -> store -> update profile pointer
  - [ ] 3.2 Return 400 with the specific error code on validation failure
  - [ ] 3.3 Leave the profile pointer unchanged on storage failure (502)
  - _Requirements: 1.1, 1.2, 1.3; Design: AvatarController, Error Handling_

- [ ] 4. Add the preview flow
  - [ ] 4.1 Render a client-side preview before confirm
  - [ ] 4.2 Ensure no stored change occurs until the user confirms
  - _Requirements: 2.1, 2.2_

- [ ] 5. Integration tests
  - [ ] 5.1 Upload -> stored -> profile pointer updated
  - [ ] 5.2 Replace -> prior image scheduled for deletion
  - _Requirements: 1.1, 3.1_
