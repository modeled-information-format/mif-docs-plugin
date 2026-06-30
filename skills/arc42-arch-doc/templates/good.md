---
id: arc42-linkly
type: semantic
created: 2026-06-29T10:00:00Z
modified: 2026-06-29T10:00:00Z
namespace: architecture/linkly
title: Linkly URL Shortener — Architecture Document (arc42)
tags:
  - arc42
  - architecture
  - url-shortener
ontology:
  "@type": OntologyReference
  id: architecture-doc
  version: 1.0.0
  uri: https://mif-spec.dev/ontologies/architecture-doc
temporal:
  "@type": TemporalMetadata
  validFrom: 2026-06-29T00:00:00Z
  validUntil: 2027-06-29T00:00:00Z
  recordedAt: 2026-06-29T10:00:00Z
  ttl: P1Y
provenance:
  "@type": Provenance
  sourceType: user_explicit
  trustLevel: verified
  confidence: 0.95
  wasGeneratedBy:
    "@id": "urn:mif:activity:arc42-authoring-2026-06-29"
    "@type": prov:Activity
  wasAttributedTo:
    "@id": "urn:mif:team:platform-architecture"
    "@type": prov:Agent
citations:
  - "@type": Citation
    citationType: specification
    citationRole: methodology
    title: "arc42 — Template for Architecture Communication and Documentation"
    url: https://arc42.org/
    accessed: 2026-06-26
relationships:
  - type: relates-to
    target: /skills/c4-model-diagram/templates/good.md
    strength: 0.7
  - type: relates-to
    target: /skills/adr/templates/good.md
    strength: 0.6
---

# Linkly URL Shortener — Architecture (arc42)

## 1. Introduction and Goals

Linkly turns long URLs into short, shareable codes and redirects visitors who
follow them. It also counts clicks per link for the owner.

Top quality goals:

1. **Performance** — a redirect resolves in under 50 ms at the median.
2. **Availability** — redirects stay up (99.9%) even when link *creation* is down.
3. **Operability** — one engineer can deploy and roll back without coordination.

Stakeholders:

| Role | Concern |
| --- | --- |
| End user | Follows short links and expects a fast, correct redirect. |
| Link owner | Creates links, watches click counts. |
| On-call engineer | Deploys, monitors, and recovers the service. |

## 2. Architecture Constraints

- Runs on the company's existing Kubernetes cluster (no new infrastructure).
- Persistence must use the managed PostgreSQL offering already on contract.
- All services are written in Go to match team skills and the shared CI image.

## 3. Context and Scope

Linkly is a black box with three external parties:

- **Browser / HTTP client** — requests `GET /{code}` and receives a 301 redirect.
- **Link owner (web app)** — calls the JSON API to create and list links.
- **Analytics sink** — receives click events asynchronously for reporting.

In scope: code generation, redirect resolution, click counting. Out of scope:
user accounts and billing (owned by the platform's identity service).

## 4. Solution Strategy

| Goal | Strategy |
| --- | --- |
| Performance | Cache the code→URL mapping in memory; read-through to PostgreSQL. |
| Availability | Split read path (redirects) from write path (creation) so each scales and fails independently. |
| Operability | Single deployable binary per service, stateless, behind the cluster ingress. |

Short codes are random base62 (7 chars), checked for collision on insert.

## 5. Building Block View

Level 1 decomposes Linkly into three black boxes:

- **Redirect Service** — resolves `code` to a target URL and emits a click event.
  Read-only against the store; the hot path.
- **Link API** — validates and persists new links, generates unique codes, lists
  a owner's links.
- **Click Aggregator** — consumes click events and increments per-link counters.

The two HTTP services share a `linkstore` library that wraps PostgreSQL and the
in-memory cache; the aggregator uses it write-only for counters.

## 6. Runtime View

**Scenario: a visitor follows a short link.**

1. Browser sends `GET /aZ3kP9q` to the Redirect Service.
2. Service looks up `aZ3kP9q` in the in-memory cache; on a miss it reads
   PostgreSQL and populates the cache.
3. Service publishes a `click` event (fire-and-forget) to the queue.
4. Service returns `301 Location: <target>`; the Click Aggregator later
   increments the counter from the queued event.

Click counting is off the redirect's critical path, so a slow aggregator never
slows a redirect.

## 7. Deployment View

All services run as separate Deployments in one Kubernetes namespace:

- `redirect` (3+ replicas, horizontally scaled on CPU) — behind the public ingress.
- `link-api` (2 replicas) — behind an authenticated internal route.
- `click-aggregator` (1 replica) — consumes the in-cluster queue.
- Managed **PostgreSQL** and a **queue** are external managed services.

A redirect outage and a creation outage are independent because the first two
Deployments share nothing but the database.

## 8. Cross-cutting Concepts

- **Persistence** — all state lives in PostgreSQL; services are stateless and
  restartable. The cache is rebuildable and never authoritative.
- **Security** — the Link API requires a platform-issued JWT; the redirect path
  is public and read-only. No secrets in code; config via mounted env.
- **Observability** — structured JSON logs with a request id; Prometheus metrics
  for redirect latency and cache hit rate.
- **Error handling** — an unknown code returns `404`; a store outage on the read
  path serves from cache and degrades to `503` only when both miss.

## 9. Architecture Decisions

| Decision | Rationale |
| --- | --- |
| Random base62 codes, not hashes of the URL | Hashes leak the target and collide on long inputs; random codes are opaque and uniform. |
| Split redirect and creation into separate services | Keeps the availability-critical read path independent of the write path. |
| Asynchronous click counting via a queue | Protects redirect latency; exact-real-time counts are not a goal. |

Each is recorded as a full ADR in `docs/adr/`; this table is the index.

## 10. Quality Requirements

Quality tree (goal → scenario):

- **Performance**
  - *Redirect latency:* given a warm cache, when a valid code is requested, the
    service responds within 50 ms at the median, 150 ms at p99.
- **Availability**
  - *Creation outage isolation:* when the Link API is down, redirects for
    existing codes continue to succeed.
- **Operability**
  - *Rollback:* when a bad release is detected, on-call can roll back a single
    service to the previous image in under 5 minutes.

## 11. Risks and Technical Debt

| Risk / debt | Impact | Mitigation |
| --- | --- | --- |
| Single Click Aggregator replica | Counter lag or loss if it crashes | Events persist in the queue; scale to 2 replicas before high-traffic campaigns. |
| Cache stampede on cold start | Latency spike after a deploy | Pre-warm the cache for the top 1% of codes on startup. |
| No code-reuse limit per owner | Possible namespace exhaustion abuse | Add per-owner rate limiting (tracked, not yet built). |

## 12. Glossary

| Term | Definition |
| --- | --- |
| Short code | The 7-character base62 identifier in a short link's path. |
| Redirect path | The read-only flow that resolves a code to a target URL. |
| Click event | An asynchronous message recording that a short link was followed. |
| Read-through cache | A cache that loads from the store on a miss and serves it thereafter. |

<!--
MIF Level 3 (full): this arc42 doc carries `ontology` (typed as an
`architecture-doc`), `temporal` validity (valid 2026-06-29 → 2027-06-29,
`ttl: P1Y`), W3C-PROV `provenance` (generated by the authoring activity,
attributed to the architecture team), an arc42.org `citation`, and typed
cross-genre `relationships[]`. With this metadata a machine consumer can, from
frontmatter alone and without parsing the prose: decide whether the document is
still inside its validity window (temporal), trace where it came from and who
stands behind it (provenance, trustLevel: verified), jump to the C4 model and the
PostgreSQL system-of-record ADR it relates to (relationships), and classify it
against the architecture-doc ontology. good-l1.md is the same system at the L1
floor — valid, but opaque to every one of those queries.
-->
