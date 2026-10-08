---
id: 2dd4d215-16f9-590b-8625-ac814c0cae6b
type: episodic
created: 2026-06-30T09:00:00Z
---

# Payments Platform Migration — Weekly Briefing

Period covered: 2026-06-23 to 2026-06-30.

## Headline

Cutover to the new payments platform is still on track for July 14; one legacy
batch job remains the sole open blocker.

## What's New

- Staging passed a load test at 2x projected peak transaction volume with no
  dropped requests.
- The Stripe webhook migration is complete for all EU merchants; US merchants
  cut over next week.
- The legacy nightly reconciliation batch job is still failing intermittently
  in staging (roughly 1 run in 6).

## Why It Matters

- Confirms the new platform can absorb peak load without a capacity add before
  cutover.
- De-risks the highest-transaction-volume merchant segment ahead of the full
  cutover date.
- This is the only item that can still slip the July 14 date if it isn't
  resolved by next Thursday.

## What's Next / Asks

- Platform team to root-cause the reconciliation batch failure by Thursday
  2026-07-02.
- Need a go/no-go call from Finance on the July 14 cutover date by Friday
  2026-07-03, contingent on the batch job fix landing.
- US merchant webhook migration begins Monday 2026-07-06 once EU is confirmed
  stable for a full week.

<!--
MIF Level 1 (floor): id, type, created + body. A complete, valid briefing —
but opaque to a machine consumer. It cannot be queried for "is this still the
current period?" (no `temporal`), "where did this come from?" (no
`provenance`), or "what briefing does this follow on from?" (no
`relationships`). Compare templates/good.md (full L3: temporal validity,
W3C-PROV provenance, typed relationships).
Gate: mif-validate --level 1.
-->
