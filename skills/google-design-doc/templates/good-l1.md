---
id: design-webhook-delivery-service
type: semantic
created: 2026-06-29T10:00:00Z
---

# Design: Outbound Webhook Delivery Service

Author: Platform team. Status: in review. Reviewers: API, SRE, Security.

## Context and Scope

Every product service that must notify a customer integration POSTs the webhook
inline, inside the request handler that produced the event. A slow customer
endpoint holds an application thread, retries are ad-hoc, and we keep no record
of what we attempted — so "did you send event X?" is unanswerable. This doc
proposes one Outbound Webhook Delivery Service that owns durable, at-least-once
delivery for all producers. The content of any specific event is out of scope.

## Goals and Non-Goals

Goals:

- At-least-once delivery: an accepted event is retried until delivered or
  permanently failed, and its outcome is queryable.
- Decouple producing request from delivery: enqueue returns in under 10 ms at
  p99 and never blocks on the customer endpoint.
- Tamper-evident payloads: every delivery is signed.

Non-Goals:

- Exactly-once delivery — consumers dedupe on the event ID.
- Strict per-destination ordering — parallel workers may reorder retries.
- Inbound webhooks and a general-purpose message bus.

## The Design / Overview

A producer calls `Enqueue` with an event and a destination; the service writes
the attempt to one PostgreSQL table and returns immediately. Stateless workers
claim pending rows, POST the signed payload to the customer URL, and record the
outcome. Failures retry with exponential backoff up to a cap, after which the
delivery is marked `exhausted` and an alert fires. A read-only `GetDelivery`
returns state plus attempt history.

## Alternatives Considered

- Inline delivery from the producer (status quo) — rejected: a slow endpoint
  consumes a producer thread and there is no durable record or uniform retry.
- Kafka topic per destination — rejected: operating Kafka is disproportionate to
  ~50 req/s and over-delivers on the ordering we made a Non-Goal.
- Managed cloud queue with a DLQ — rejected: it does not remove the table we
  need for queryable attempt history, so it adds a system without removing one.

<!--
MIF Level 1 (floor): id, type, created + body only. This is a complete, valid
design doc — but to a machine consumer it is opaque prose. It cannot be queried
for "is this design still current?", "where did it come from / can I trust it?",
"what realizes it or relates to it?", or "what evidence backs the choices?".
Compare templates/good.md (full L3: temporal validity, W3C-PROV provenance,
citations, and typed relationships). Gate: mif-validate --level 1.
-->
