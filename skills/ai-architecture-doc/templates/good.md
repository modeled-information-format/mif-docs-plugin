---
id: 38318b96-f10a-5a58-ab32-1001512ee8d7
type: semantic
created: '2026-06-29T10:00:00Z'
modified: '2026-06-29T10:00:00Z'
namespace: spec/architecture/notifications
title: 'Architecture: Notification Service'
tags:
  - architecture
  - spec
  - nfr
ontology:
  '@type': OntologyReference
  id: mif-docs
  version: 1.0.0
  uri: https://mif-spec.dev/ontologies/mif-docs
temporal:
  '@type': TemporalMetadata
  validFrom: '2026-06-29T00:00:00Z'
  ttl: P1Y
  recordedAt: '2026-06-29T10:00:00Z'
provenance:
  '@type': Provenance
  sourceType: user_explicit
  trustLevel: verified
  wasGeneratedBy:
    '@id': urn:mif:activity:architecture-review-2026-06-29
    '@type': prov:Activity
citations:
  - '@type': Citation
    citationType: documentation
    citationRole: methodology
    title: arc42 — Architecture Communication Canvas
    url: https://arc42.org/
    accessed: '2026-06-26'
relationships:
  - type: realized-by
    target: /spec/feature/notification-send-api.md
  - type: relates-to
    target: /architecture/c4/notification-service.md
entity:
  name: Notification Service
  entity_type: architecture-document
---

# Architecture: Notification Service

## Context

The Notification Service delivers transactional messages (email, SMS, push) on
behalf of other internal services. Drivers: a single send API, per-channel
provider failover, and an auditable delivery record. External dependencies: the
email provider, the SMS provider, and the push gateway.

## Architecture

### Building blocks

- **API Gateway** — authenticates callers, validates the send request.
- **Dispatcher** — selects a channel + provider, enforces rate limits, enqueues.
- **Channel Workers** — one pool per channel; call the provider, record status.
- **Delivery Store** — append-only record of every send attempt and outcome.

### Component view (C4 Level 3, Dispatcher)

```mermaid
flowchart LR
  API[API Gateway] --> D[Dispatcher]
  D --> Q[(Queue)]
  Q --> EW[Email Worker]
  Q --> SW[SMS Worker]
  Q --> PW[Push Worker]
  EW --> DS[(Delivery Store)]
  SW --> DS
  PW --> DS
```

## Non-Functional Requirements

1. WHEN a send request is accepted, the service SHALL enqueue it within 200 ms
   (p95).
2. IF a provider returns a transient error, THEN the worker SHALL retry with
   exponential backoff up to 5 attempts before marking the send failed.
3. The service SHALL retain every delivery record for at least 1 year (audit).
4. WHILE a provider is failing health checks, the dispatcher SHALL route that
   channel to its secondary provider.

## Decision Log

### AD-1: Queue-backed dispatch — Accepted

Decouples acceptance from delivery so provider latency never blocks callers.
Consequence: delivery is asynchronous; callers poll or subscribe for status.

### AD-2: Append-only Delivery Store — Accepted

Chosen over mutable status rows to preserve a full audit trail. Consequence:
status is derived from the latest event per send, not an in-place update.
