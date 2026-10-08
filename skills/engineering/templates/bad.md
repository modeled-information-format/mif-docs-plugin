---
id: 2eecb311-ae80-537b-aa5a-5c26d8514d57
type: semantic
created: 2026-06-30T10:00:00Z
namespace: engineering/antipattern
title: 'Antipattern: An Engineering Report With No Trade-offs Table'
tags:
  - antipattern
  - engineering-report
---

# Engineering Report: New Caching Layer

<!-- ANTIPATTERN: titled as an engineering report, but there is no Trade-offs
     comparison table anywhere below — the mandatory section this genre exists
     to require is simply missing. -->

We evaluated a few caching approaches and decided to add Redis in front of the
database to make reads faster.

## Options Considered

We looked at Redis, Memcached, and an in-process cache.

<!-- ANTIPATTERN: options are named but never mapped against the stated
     decision drivers in a comparison table — there are no stated decision
     drivers at all. -->

## Decision

We're going with Redis because it's the most popular choice.

<!-- ANTIPATTERN: the Decision asserts a preference ("most popular") instead of
     referencing trade-off evidence — there is no evidence to reference,
     because no Trade-offs table was built. -->

## Implementation

We will use the official client library and a single Redis cluster.

<!-- ANTIPATTERN: no Consequences section, and "Implementation" is not
     actionable — no dependency, migration step, or rollout sequence is named. -->
