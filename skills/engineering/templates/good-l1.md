---
id: engineering-report-event-pipeline-mq
type: semantic
created: 2026-06-30T10:00:00Z
---

# Engineering Report: Message Queue for the Event Pipeline

Status: accepted. Decision drivers: throughput above 1M msg/s, at-least-once
delivery, operational simplicity, a cloud-managed option available.

## Problem / Context

The event pipeline currently publishes inline from each producing service, with
no durable queue between production and consumption. We need one message-queue
technology the whole pipeline standardizes on.

## Options Considered

- **Apache Kafka**, self-managed on our own cluster.
- **AWS SQS** (FIFO queues), fully managed by AWS.
- **Redpanda Cloud**, a managed Kafka-API-compatible service.

## Trade-offs

| Option | Throughput | At-least-once | Ops simplicity | Managed option |
| --- | --- | --- | --- | --- |
| Kafka (self-managed) | 2M msg/s sustained on 3 brokers [1] | Yes | Low — ~0.5 FTE/cluster | No |
| AWS SQS (FIFO) | Capped at 3,000 TPS/queue by default [2] | Yes | High | Yes |
| Redpanda Cloud | Kafka-compatible; no ZooKeeper dependency [3] | Yes | High | Yes |

## Decision

Adopt **Redpanda Cloud**. It is the only option that clears the throughput bar
implied by Kafka's benchmark while removing the operational burden that
self-managed Kafka carries — SQS's per-queue TPS cap disqualifies it outright.

## Implementation Notes

- Provision a Redpanda Cloud cluster sized for the current producer count.
- Point existing Kafka-protocol clients at the Redpanda endpoint; no client
  library change is required.
- Decommission the self-managed Kafka cluster once producers cut over.

## Consequences

Removing self-managed Kafka drops the 0.5 FTE/cluster operational load, at the
cost of a recurring managed-service bill and a new external dependency on
Redpanda Cloud's availability.

## References

1. Apache Kafka documentation — <https://kafka.apache.org/documentation/>
2. AWS SQS quotas — <https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/quotas-messages.html>
3. Redpanda documentation — <https://docs.redpanda.com/>

<!--
MIF Level 1 (floor): id, type, created + body. A complete, valid engineering
report — but opaque to a machine consumer. It cannot be queried for "is this
decision still current?", "where did the evidence come from?", or "what
formalizes or relates to it?". Compare templates/good.md (full L3: temporal
validity, W3C-PROV provenance, per-claim citations, typed relationships).
Gate: mif-validate --level 1.
-->
