---
id: d1b4f87a-932e-5a63-b3a3-1ad42ec5e201
type: semantic
created: 2026-06-29T10:00:00Z
namespace: spec/architecture/antipattern
title: "Antipattern: Diagrams Without Constraints or Decisions"
tags:
  - antipattern
  - architecture
---

# Architecture: Notification Service

<!-- ANTIPATTERN: a composite architecture doc that is only a picture. -->

## Diagram

```mermaid
flowchart LR
  A[API] --> B[Worker] --> C[(DB)]
```

That's the architecture.

<!-- ANTIPATTERN: no Context section — drivers and external dependencies are
     undocumented. -->

## Notes

It should scale and be secure.

<!-- ANTIPATTERN: no Non-Functional Requirements. "Scale and be secure" is not
     testable; there are no measurable, EARS-style NFRs an implementer can
     verify. -->

<!-- ANTIPATTERN: no Decision Log at all — none of the architectural choices
     (why a queue, why this datastore) are captured, so the rationale is lost
     and the next engineer cannot tell intent from accident. -->
