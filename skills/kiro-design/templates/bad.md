---
id: 4cb232d6-687c-5097-94e1-7a414a1fe18b
type: semantic
created: 2026-06-29T10:00:00Z
namespace: spec/kiro/design/antipattern
title: "Antipattern: A Design With No Data Models, Tests, or Traceability"
tags:
  - antipattern
  - kiro
---

# Design: Avatar Upload

<!-- ANTIPATTERN: no traceability anywhere — not one section references a
     requirement number, so you cannot tell which requirements this design
     covers or whether any are orphaned. -->

## Overview

We'll add an upload endpoint and store the file somewhere.

<!-- ANTIPATTERN: "somewhere" — no Architecture, no Components and Interfaces. -->

## Implementation

Use whatever image library is handy and save to disk.

<!-- ANTIPATTERN: no Data Models section — the Profile entity and avatar fields
     are undefined. -->

<!-- ANTIPATTERN: no Error Handling section (what happens on oversized or
     wrong-format files?) and no Testing Strategy section. A Kiro design.md must
     cover error handling and testing and must trace to the numbered
     requirements; this does neither. -->
