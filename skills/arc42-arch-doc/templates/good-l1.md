---
id: arc42-linkly
type: semantic
created: 2026-06-29T10:00:00Z
---

# Linkly URL Shortener — Architecture (arc42)

## 1. Introduction and Goals

Linkly turns long URLs into short codes and redirects visitors who follow them,
counting clicks per link. Top quality goals: **performance** (redirect under
50 ms median), **availability** (redirects stay up at 99.9% even when link
creation is down), and **operability** (one engineer deploys and rolls back
without coordination). Stakeholders: end users (fast, correct redirects), link
owners (create links, watch counts), on-call engineers (deploy, monitor, recover).

## 2. Architecture Constraints

Runs on the existing Kubernetes cluster (no new infrastructure); persistence uses
the managed PostgreSQL offering already on contract; all services are written in
Go to match team skills and the shared CI image.

## 3. Context and Scope

Linkly is a black box with three external parties: the **browser/HTTP client**
(`GET /{code}` → 301 redirect), the **link owner web app** (JSON API to create
and list links), and the **analytics sink** (receives click events async). In
scope: code generation, redirect resolution, click counting. Out of scope: user
accounts and billing (owned by the identity service).

## 4. Solution Strategy

Cache the code→URL mapping in memory with read-through to PostgreSQL for
performance; split the read path (redirects) from the write path (creation) so
each scales and fails independently for availability; ship one stateless binary
per service behind the cluster ingress for operability. Short codes are random
base62 (7 chars), checked for collision on insert.

## 5. Building Block View

Level 1 decomposes Linkly into three black boxes: the **Redirect Service**
(resolves a code to a target URL and emits a click event; read-only, the hot
path), the **Link API** (validates and persists new links, generates unique
codes, lists an owner's links), and the **Click Aggregator** (consumes click
events and increments per-link counters). The two HTTP services share a
`linkstore` library wrapping PostgreSQL and the cache.

## 6. Runtime View

**Scenario: a visitor follows a short link.** The browser sends `GET /aZ3kP9q`;
the Redirect Service checks the in-memory cache, reads PostgreSQL on a miss and
populates the cache, publishes a fire-and-forget `click` event, and returns
`301 Location: <target>`. The Click Aggregator later increments the counter from
the queued event, keeping click counting off the redirect's critical path.

## 7. Deployment View

Each service is a separate Deployment in one Kubernetes namespace: `redirect`
(3+ replicas, scaled on CPU, behind the public ingress), `link-api` (2 replicas,
behind an authenticated internal route), and `click-aggregator` (1 replica,
consuming the in-cluster queue). Managed PostgreSQL and a queue are external
managed services; redirect and creation outages are independent.

## 8. Cross-cutting Concepts

All state lives in PostgreSQL; services are stateless and restartable and the
cache is rebuildable, never authoritative. The Link API requires a
platform-issued JWT; the redirect path is public and read-only. Observability is
structured JSON logs with a request id plus Prometheus metrics for redirect
latency and cache hit rate. An unknown code returns `404`; a store outage on the
read path serves from cache and degrades to `503` only when both miss.

## 9. Architecture Decisions

Random base62 codes rather than URL hashes (hashes leak the target and collide on
long inputs); redirect and creation split into separate services (keeps the
availability-critical read path independent of the write path); asynchronous
click counting via a queue (protects redirect latency; real-time counts are not a
goal). Each is recorded as a full ADR in `docs/adr/`.

## 10. Quality Requirements

- **Performance** — given a warm cache, a valid code resolves within 50 ms at the
  median and 150 ms at p99.
- **Availability** — when the Link API is down, redirects for existing codes
  continue to succeed.
- **Operability** — when a bad release is detected, on-call rolls a single service
  back to the previous image in under 5 minutes.

## 11. Risks and Technical Debt

The single Click Aggregator replica risks counter lag or loss if it crashes
(events persist in the queue; scale to 2 before high-traffic campaigns); cache
stampede on cold start risks a latency spike after a deploy (pre-warm the top 1%
of codes on startup); no per-owner code-reuse limit allows namespace-exhaustion
abuse (add per-owner rate limiting, tracked, not yet built).

## 12. Glossary

- **Short code** — the 7-character base62 identifier in a short link's path.
- **Redirect path** — the read-only flow that resolves a code to a target URL.
- **Click event** — an asynchronous message recording that a short link was followed.
- **Read-through cache** — a cache that loads from the store on a miss and serves
  it thereafter.

<!--
MIF Level 1 (floor): id, type, created + body only. This is a complete, valid
arc42 architecture document — but to a machine consumer it is opaque prose. It
cannot be queried for "is this architecture still current?" (no temporal
validity), "where did it come from / who stands behind it?" (no provenance),
"what C4 model or ADRs does it relate to?" (no typed relationships), or "what
kind of document is this?" (no ontology). Compare good.md, which carries the full
L3 metadata — ontology, temporal validity, W3C-PROV provenance, an arc42.org
citation, and typed cross-genre relationships — so a machine answers all of those
from frontmatter alone.
-->
