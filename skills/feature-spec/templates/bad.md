---
id: 3a0cf6e5-346e-5410-a211-d3d31fa001c9
type: semantic
created: 2026-06-29T10:00:00Z
namespace: spec/feature/antipattern
title: "Antipattern: A Feature Spec That Is Just Prose"
tags:
  - antipattern
  - feature-spec
---

# Contact Export Feature

<!-- ANTIPATTERN: no Overview/Acceptance/Design/Edge Cases structure — the genre's
     four sections are missing, so a reader cannot tell contract from commentary. -->

We should let users export their contacts somehow. It would be really useful for
people who want their data, and we have wanted this for a while. The team agrees
it is important and we should probably build it this quarter.

<!-- ANTIPATTERN: "somehow", "probably", "this quarter" — vague intent and
     scheduling, no testable behavior. An implementer cannot start from this. -->

## How it should work

The export should be fast and handle big lists well, and it should produce a nice
file that opens cleanly in Excel. Make sure it handles errors gracefully and is
secure.

<!-- ANTIPATTERN: "handle errors gracefully", "be secure", "handle big lists
     well" — no acceptance criteria. None of this is a verifiable statement a
     human and an agent would grade identically. EARS is required here. -->

The developer can figure out the columns and the endpoint shape based on what
makes sense for our API.

<!-- ANTIPATTERN: design deferred to the implementer's guess — no named
     components, no interface, no data shape. The spec abdicates the Design
     section entirely. -->

That's basically it — should be straightforward to build.

<!-- ANTIPATTERN: no Edge Cases section at all. Empty list, RFC 4180 quoting,
     unauthenticated callers, formula injection, mid-stream failure — every
     boundary that actually breaks implementations is unmentioned. This is the
     single most common reason a "spec" ships the wrong behavior. -->
