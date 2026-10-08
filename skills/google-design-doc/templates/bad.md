---
id: ec9f60dd-1204-57ed-b8ba-0d0f6c92e8c3
type: semantic
created: 2026-06-29T10:00:00Z
namespace: design/antipattern
title: "Antipattern: A Design Doc With No Trade-offs"
tags:
  - antipattern
  - design-doc
---

# Design: New Caching Layer

<!-- ANTIPATTERN: titled as a design doc, but as written below it is a
     one-option proposal, not a design — there is nothing to weigh. -->

We are going to add Redis in front of the database to make reads faster. This
doc describes how we will do it.

## Overview

The service will check Redis first. On a miss it reads the database and writes
the value back to Redis with a 5-minute TTL. We will use the official client
library and a single Redis cluster.

<!-- ANTIPATTERN: jumps straight to the chosen implementation with no Context
     and Scope section — a reviewer never learns what problem this solves, how
     bad it is today, or what is in vs out of scope. -->

## Implementation

We will add a `Cache` interface with `Get` and `Set`, wire it into the read
path, and deploy a three-node Redis cluster. Cache keys are the entity ID. We
will tune the TTL later once we see production traffic.

<!-- ANTIPATTERN: "tune later" / "once we see traffic" — unresolved design
     decisions hand-waved away in a doc you are asking people to approve. -->

<!-- ANTIPATTERN: there is NO Goals and Non-Goals section. Nothing states what
     success means or what is deliberately out of scope, so review cannot bound
     the design and scope creep is invited. -->

<!-- ANTIPATTERN: there is NO Alternatives Considered section. Read-through vs
     write-through caching, an in-process LRU, a CDN, or simply adding a
     database read replica are never mentioned — so the reader cannot tell
     whether Redis is the right call or the first thing that came to mind. A
     design doc with one option and no rejected alternatives is a proposal
     wearing a design doc's title. -->

## Security

It should be fine, Redis is internal.

<!-- ANTIPATTERN: cross-cutting concerns dismissed in a sentence. No mention of
     privacy (is cached data sensitive?) or observability (hit rate, eviction,
     staleness alerts) at all. -->
