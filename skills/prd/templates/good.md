---
id: 70aed89d-1d93-592d-9dc1-1ee1d3e80d4e
type: semantic
created: '2026-06-29T10:00:00Z'
modified: '2026-06-29T10:00:00Z'
namespace: prd/checkout
title: 'PRD: Saved Carts'
tags:
  - prd
  - checkout
  - retention
temporal:
  '@type': TemporalMetadata
  validFrom: '2026-06-29T00:00:00Z'
  validUntil: '2026-12-31T00:00:00Z'
  ttl: P3M
  recordedAt: '2026-06-29T10:00:00Z'
provenance:
  '@type': Provenance
  sourceType: user_explicit
  trustLevel: high_confidence
  wasDerivedFrom:
    '@id': urn:mif:dataset:checkout-funnel-analytics-2026-q2
    '@type': prov:Entity
citations:
  - '@type': Citation
    citationType: dataset
    citationRole: supports
    title: Checkout Funnel Analytics — Q2 2026
    url: https://example.internal/analytics/checkout-funnel-2026-q2
    date: '2026-06-15'
relationships:
  - type: realized-by
    target: /spec/feature/saved-carts.md
ontology:
  '@type': OntologyReference
  id: mif-docs
  version: 1.0.0
  uri: https://mif-spec.dev/ontologies/mif-docs
entity:
  name: Saved Carts
  entity_type: product-requirements
---

# PRD: Saved Carts

## Problem Statement

30% of shoppers who add items abandon before checkout, and 40% of them never
return. Session analytics show the largest drop-off is shoppers who leave to
compare prices and lose their cart on return. We have no way to preserve a
cart across sessions for signed-in users.

## Goals & Success Metrics

- Reduce cart abandonment for signed-in users from 30% to 22% within one quarter.
- 50% of returning signed-in users with a saved cart resume it.
- No regression in checkout completion latency (p95).

## Users / Personas

- **Comparison shopper** (signed in): adds items, leaves to compare, returns
  hours or days later.
- **Mobile-to-desktop shopper**: starts on mobile, completes on desktop.

## Requirements

1. WHEN a signed-in user adds an item to the cart, the system SHALL persist the
   cart to their account within 2 seconds.
2. WHEN a signed-in user signs in on any device, the system SHALL restore their
   most recent saved cart.
3. IF a saved item is out of stock at restore time, THEN the system SHALL keep it
   in the cart flagged as unavailable and SHALL NOT block checkout of other items.
4. WHILE a user is signed out, the system SHALL keep the cart in local session
   storage only.

## Scope & Non-Goals

- **In scope:** signed-in cart persistence and cross-device restore.
- **Non-goals:** sharing carts between users; saving carts for anonymous users;
  price-drop notifications on saved items.

## Milestones

- M1: persistence + single-device restore.
- M2: cross-device restore + out-of-stock handling.

## Open Questions

- How long is a saved cart retained before expiry?
- Do promotional prices re-evaluate at restore time or persist as captured?
