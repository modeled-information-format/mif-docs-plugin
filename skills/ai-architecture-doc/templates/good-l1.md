---
id: 38318b96-f10a-5a58-ab32-1001512ee8d7
type: semantic
created: 2026-06-29T10:00:00Z
---

# Architecture: Notification Service

## Context

The Notification Service delivers transactional messages (email, SMS, push) on
behalf of other internal services. Drivers: a single send API, per-channel
provider failover, and an auditable delivery record.

## Architecture

- **API Gateway** — authenticates callers, validates the send request.
- **Dispatcher** — selects a channel + provider, enforces rate limits, enqueues.
- **Channel Workers** — one pool per channel; call the provider, record status.
- **Delivery Store** — append-only record of every send attempt and outcome.

## Non-Functional Requirements

1. WHEN a send request is accepted, the service SHALL enqueue it within 200 ms
   (p95).
2. IF a provider returns a transient error, THEN the worker SHALL retry with
   exponential backoff up to 5 attempts before marking the send failed.
3. The service SHALL retain every delivery record for at least 1 year.

## Decision Log

- **AD-1: Queue-backed dispatch — Accepted.** Decouples acceptance from delivery
  so provider latency never blocks callers.
- **AD-2: Append-only Delivery Store — Accepted.** Preserves a full audit trail.

<!--
MIF Level 1 (floor): id, type, created + body. A machine consumer cannot tell
what kind of artifact this is, whether it is current, where it came from, or which
specs realize it. good.md climbs to L3 — adding an architecture-doc ontology type,
temporal validity, W3C-PROV provenance, a citation, and typed relationships — so
an agent can classify, trust, and navigate the architecture.
-->
