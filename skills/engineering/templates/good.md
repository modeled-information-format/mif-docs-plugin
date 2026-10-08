---
id: dae48782-b4ce-5379-9abe-349e88672d38
type: semantic
created: '2026-06-30T10:00:00Z'
modified: '2026-06-30T10:00:00Z'
namespace: engineering/platform
title: 'Engineering Report: Message Queue for the Event Pipeline'
tags:
  - engineering-report
  - message-queue
  - platform
temporal:
  '@type': TemporalMetadata
  validFrom: '2026-06-30T00:00:00Z'
  recordedAt: '2026-06-30T10:00:00Z'
  ttl: P1Y
provenance:
  '@type': Provenance
  sourceType: user_explicit
  trustLevel: verified
  wasGeneratedBy:
    '@id': urn:mif:activity:mq-evaluation-2026-06-30
    '@type': prov:Activity
citations:
  - '@type': Citation
    citationType: documentation
    citationRole: methodology
    title: Apache Kafka Documentation
    url: https://kafka.apache.org/documentation/
    accessed: '2026-06-26'
  - '@type': Citation
    citationType: documentation
    citationRole: methodology
    title: 'AWS SQS Developer Guide — Quotas related to messages'
    url: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/quotas-messages.html
    accessed: '2026-06-26'
  - '@type': Citation
    citationType: documentation
    citationRole: background
    title: Redpanda Documentation
    url: https://docs.redpanda.com/
    accessed: '2026-06-26'
relationships:
  - type: relates-to
    target: /semantic/adr/adr-0012-event-pipeline-mq.md
ontology:
  '@type': OntologyReference
  id: mif-docs
  version: 1.0.0
  uri: https://mif-spec.dev/ontologies/mif-docs
entity:
  name: 'Engineering Report: Message Queue for the Event Pipeline'
  entity_type: engineering-report
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

1. Apache Kafka Documentation — <https://kafka.apache.org/documentation/>
2. AWS SQS Developer Guide — Quotas related to messages — <https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/quotas-messages.html>
3. Redpanda Documentation — <https://docs.redpanda.com/>
