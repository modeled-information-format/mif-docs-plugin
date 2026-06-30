---
id: design-webhook-delivery-service
type: semantic
created: 2026-06-29T10:00:00Z
modified: 2026-06-29T10:00:00Z
namespace: design/platform
title: "Design: Outbound Webhook Delivery Service"
tags:
  - design-doc
  - webhooks
  - reliability
  - platform
temporal:
  "@type": TemporalMetadata
  validFrom: 2026-06-29T00:00:00Z
  recordedAt: 2026-06-29T10:00:00Z
  ttl: P1Y
provenance:
  "@type": Provenance
  sourceType: user_explicit
  trustLevel: verified
  wasGeneratedBy:
    "@id": "urn:mif:activity:webhook-design-review-2026-06-29"
    "@type": prov:Activity
citations:
  - "@type": Citation
    citationType: documentation
    citationRole: methodology
    title: "PostgreSQL 17 — SELECT: FOR UPDATE SKIP LOCKED"
    url: https://www.postgresql.org/docs/17/sql-select.html
    accessed: 2026-06-26
  - "@type": Citation
    citationType: specification
    citationRole: methodology
    title: "RFC 2104 — HMAC: Keyed-Hashing for Message Authentication"
    url: https://www.rfc-editor.org/rfc/rfc2104
    accessed: 2026-06-26
  - "@type": Citation
    citationType: specification
    citationRole: background
    title: "Standard Webhooks — signature and timestamp conventions"
    url: https://www.standardwebhooks.com/
    accessed: 2026-06-26
relationships:
  - type: realized-by
    target: /semantic/adr/adr-0011-webhook-delivery-datastore.md
  - type: relates-to
    target: /semantic/feature-specs/webhook-subscription-management.md
---

# Design: Outbound Webhook Delivery Service

Author: Platform team. Status: in review. Reviewers: API, SRE, Security.

## Context and Scope

Today every product service that needs to notify a customer integration POSTs
the webhook inline, inside the request handler that produced the event. This has
bitten us three times this quarter: a slow customer endpoint holds an
application thread, retries are ad-hoc (some services retry, some drop), and we
have no record of what we attempted to deliver. When a customer asks "did you
send event X?", we cannot answer.

This doc proposes a single **Outbound Webhook Delivery Service** that owns
durable, at-least-once delivery of webhooks on behalf of all product services.
In scope: the delivery guarantee, the enqueue API product services call, the
storage model, retry/backoff, and signing. Out of scope is the *content* of any
specific webhook event — producers still decide what to send.

## Goals and Non-Goals

Goals:

- At-least-once delivery: an accepted event is retried until it is delivered or
  permanently failed (exhausted retries), and its outcome is queryable.
- Decouple the producing request from delivery: enqueue must return in under
  10 ms at p99 and never block on the customer endpoint.
- Per-destination ordering is best-effort, not guaranteed — see Non-Goals.
- Tamper-evident payloads: every delivery is signed so customers can verify
  origin and integrity.

Non-Goals:

- **Exactly-once delivery.** We deliberately choose at-least-once; consumers must
  dedupe on the event ID. Exactly-once across an untrusted network is not worth
  its cost here.
- **Strict per-destination ordering.** Parallel workers may reorder retries. A
  customer needing order must sort by the event timestamp we include.
- **Inbound webhooks** (events *we* receive) — a separate concern, separate doc.
- **A general-purpose message bus.** This service does one thing: HTTP delivery to
  customer-registered URLs.

## The Design / Overview

A product service calls `Enqueue` with an event and a destination. The service
writes the attempt to durable storage and returns immediately. A pool of
stateless workers claims pending deliveries, POSTs them to the customer URL,
signs each request, and records the outcome. Failures are retried with
exponential backoff up to a cap, after which the delivery is marked
`exhausted` and an alert fires for the owning team.

### APIs

The producer-facing API is a single synchronous gRPC call:

```proto
rpc Enqueue(EnqueueRequest) returns (EnqueueResponse);

message EnqueueRequest {
  string destination_id = 1; // a pre-registered customer endpoint
  string event_id       = 2; // producer-supplied, used for dedupe
  string event_type     = 3; // e.g. "invoice.paid"
  bytes  payload        = 4; // opaque JSON body, <= 256 KiB
}

message EnqueueResponse {
  string delivery_id = 1; // our handle, for status queries
}
```

A read-only `GetDelivery(delivery_id)` returns the current state and the attempt
history, so support and producers can answer "did event X get delivered?".

### Data storage / schema

One PostgreSQL table is the source of truth; workers claim rows with
`SELECT ... FOR UPDATE SKIP LOCKED` so many workers drain it without contending.

```sql
CREATE TABLE delivery (
  delivery_id   UUID PRIMARY KEY,
  destination_id TEXT        NOT NULL,
  event_id      TEXT         NOT NULL,
  event_type    TEXT         NOT NULL,
  payload       BYTEA        NOT NULL,
  state         TEXT         NOT NULL,   -- pending|delivering|delivered|exhausted
  attempts      INT          NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  UNIQUE (destination_id, event_id)      -- idempotent enqueue
);
CREATE INDEX delivery_claim ON delivery (next_attempt_at) WHERE state = 'pending';
```

The `UNIQUE (destination_id, event_id)` makes `Enqueue` idempotent: a producer
retrying its own call cannot create a duplicate delivery. Delivered rows are
retained 30 days for the status query, then archived.

### Key flows

Happy path: `Enqueue` inserts a `pending` row and commits (one write, returns in
single-digit ms). A worker claims the row, flips it to `delivering`, POSTs the
signed payload, gets `2xx`, and flips it to `delivered`.

Failure path: the POST times out or returns `5xx`. The worker increments
`attempts`, sets `next_attempt_at = now() + backoff(attempts)`, and returns the
row to `pending`. After the attempt cap (8 tries, ~12 h of backoff) the row is
set to `exhausted` and an alert is emitted. A `4xx` other than `429` is treated
as permanent and exhausts immediately — the customer's endpoint rejected us.

## Alternatives Considered

### Inline delivery from the producer (the status quo)

- Pro: zero new infrastructure; the event and its delivery share a transaction.
- Pro: trivially "ordered" because it is synchronous.
- Con: a slow customer endpoint consumes a producer thread — the outage class we
  are trying to kill.
- Con: no durable record, no uniform retry. **Why rejected:** fails the decouple
  goal (enqueue p99 < 10 ms) and the at-least-once + queryable-outcome goal.

### Kafka topic per destination, consumers do delivery

- Pro: high throughput; natural log of events; strong per-partition ordering.
- Pro: replay is easy.
- Con: operating Kafka (and a topic-per-destination explosion, or partition-key
  hot spots) is a large standing cost for our volume (~50 req/s peak).
- Con: per-delivery state (attempt count, next-attempt time, exhausted) maps
  poorly onto a log; we would bolt a state store on the side anyway. **Why
  rejected:** the operational cost is disproportionate to the at-least-once goal
  a single Postgres table already meets, and it over-delivers on the ordering we
  explicitly made a Non-Goal.

### Managed cloud queue (SQS-style) with a dead-letter queue

- Pro: fully managed; visibility-timeout retries and a DLQ are built in.
- Pro: no queue infrastructure to run ourselves.
- Con: the status query ("show every attempt for delivery X") is not a first-class
  queue operation — we would still need our own table for history.
- Con: a second system to reason about for ordering, idempotency, and signing.
  **Why rejected:** it does not remove the database we need for the queryable
  history, so it adds a moving part without removing one; the
  `SELECT ... SKIP LOCKED` table covers our throughput and keeps one source of
  truth.

## Cross-cutting Concerns

### Security

Each delivery is signed: we send an `X-Signature` header containing an HMAC-SHA256
of the body keyed by a per-destination secret the customer holds, plus a
timestamp to bound replay. Customers reject requests whose signature does not
verify or whose timestamp is stale. Payloads are capped at 256 KiB to bound the
blast radius of a malicious or buggy producer. Worker-to-Postgres traffic is
mTLS within the VPC.

### Privacy

Payloads may contain customer PII, so the `payload` column is encrypted at rest
(database-level TLS + disk encryption) and is **never** written to logs — logs
carry `delivery_id`, `destination_id`, `event_type`, and outcome only. The 30-day
retention bounds how long PII lives in the delivery table before archival to a
restricted-access store.

### Observability

We emit, per delivery: a `webhook_delivery_attempts_total{result}` counter, a
`webhook_delivery_latency_seconds` histogram (enqueue-to-delivered), and the
current depth of the `pending` backlog as a gauge. An alert fires when any
destination's `exhausted` rate crosses 1% over 5 minutes (a customer endpoint is
down) and when backlog depth exceeds the level workers can drain within the SLA.
Each attempt carries the producer's trace ID so a delivery is followable end to
end.

<!--
MIF Level 3 (full): this design doc carries temporal validity (validFrom + ttl
P1Y + recordedAt), W3C-PROV provenance (sourceType user_explicit, trustLevel
verified, generated by the design-review activity), citations[] (the Postgres
SKIP LOCKED, HMAC RFC 2104, and Standard Webhooks sources the design actually
leans on), and typed relationships[] (realized-by the datastore ADR, relates-to
the subscription-management feature spec). A machine consumer can now answer —
without parsing prose — "is this design still current?" (temporal.ttl), "where
did it come from and can I trust it?" (provenance), "what realizes it and what
does it relate to?" (relationships[]), and "what evidence backs the signing and
queue-claim choices?" (citations[]). The same file still reads as a human design
doc and projects losslessly to JSON-LD and back. Compare templates/good-l1.md,
the L1 floor (id, type, created only) — valid, but opaque to a machine consumer.
Gate: mif-validate --level 3.
-->
