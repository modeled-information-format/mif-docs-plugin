---
id: 70aed89d-1d93-592d-9dc1-1ee1d3e80d4e
type: semantic
created: 2026-06-29T10:00:00Z
---

# PRD: Saved Carts

## Problem Statement

30% of shoppers who add items abandon before checkout, and 40% of them never
return. The largest drop-off is shoppers who leave to compare prices and lose
their cart on return; we cannot preserve a cart across sessions for signed-in
users.

## Goals & Success Metrics

- Reduce cart abandonment for signed-in users from 30% to 22% within one quarter.
- 50% of returning signed-in users with a saved cart resume it.

## Users / Personas

- Comparison shopper (signed in) who leaves to compare and returns later.
- Mobile-to-desktop shopper who starts on one device and finishes on another.

## Requirements

1. WHEN a signed-in user adds an item, the system SHALL persist the cart to their
   account within 2 seconds.
2. WHEN a signed-in user signs in on any device, the system SHALL restore their
   most recent saved cart.
3. IF a saved item is out of stock at restore time, THEN the system SHALL flag it
   as unavailable and SHALL NOT block checkout of other items.

## Scope & Non-Goals

- In scope: signed-in cart persistence and cross-device restore.
- Non-goals: sharing carts between users; anonymous carts; price-drop alerts.

<!--
MIF Level 1 (floor): id, type, created + body. A machine consumer cannot tell
whether this PRD is still in its validity window, what evidence backs the
problem, or which feature spec realizes it. good.md climbs to L3 — adding
temporal validity, a citation to the funnel analytics, provenance, and a
realized-by relationship — so an agent can trace and trust the requirement set.
-->
