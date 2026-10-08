---
id: 83c09437-64e3-5c8d-84ca-2372983a09b3
type: procedural
created: 2026-06-29T10:00:00Z
---

# Tasks: Profile Avatar Upload

- [ ] 1. Implement the image validator
  - [ ] 1.1 Accept PNG and JPEG, reject other formats with `unsupported`
  - [ ] 1.2 Reject files over 5 MB with `too_large`
  - _Requirements: 1.2, 1.3_

- [ ] 2. Implement the avatar store
  - [ ] 2.1 Write `put(userId, bytes) -> url` to object storage
  - [ ] 2.2 Schedule deletion of the prior image on replace
  - _Requirements: 1.1, 3.1_

- [ ] 3. Wire the AvatarController
  - [ ] 3.1 Orchestrate validate -> store -> update profile pointer
  - [ ] 3.2 Return 400 with the specific error code on validation failure
  - _Requirements: 1.1, 1.2, 1.3_

- [ ] 4. Integration tests
  - [ ] 4.1 Upload -> stored -> profile pointer updated
  - [ ] 4.2 Replace -> prior image scheduled for deletion
  - _Requirements: 1.1, 3.1_

<!--
MIF Level 1 (floor): id, type, created + body. A machine consumer cannot tell
which design this task list derives from or whether it is current. good.md climbs
to L3 with temporal validity, provenance, and a derived-from relationship to the
Kiro design doc, closing the requirements -> design -> tasks traceability chain.
-->
