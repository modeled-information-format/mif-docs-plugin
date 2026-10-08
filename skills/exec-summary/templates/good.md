---
id: 633882c9-2ee6-5a71-ab13-5e7f88572d01
type: semantic
created: '2026-06-30T10:00:00Z'
modified: '2026-06-30T10:00:00Z'
namespace: exec-summary/platform
title: 'Executive Summary: Data Warehouse Consolidation'
tags:
  - exec-summary
  - finops
  - platform
temporal:
  '@type': TemporalMetadata
  validFrom: '2026-06-30T00:00:00Z'
  recordedAt: '2026-06-30T10:00:00Z'
  ttl: P90D
provenance:
  '@type': Provenance
  sourceType: user_explicit
  trustLevel: verified
  wasGeneratedBy:
    '@id': urn:mif:activity:warehouse-consolidation-review-2026-06-30
    '@type': prov:Activity
citations:
  - '@type': Citation
    citationType: other
    citationRole: source
    title: Q2 2026 FinOps Cost Review
    url: 'internal://finops/cost-review-2026-q2'
    accessed: '2026-06-30'
  - '@type': Citation
    citationType: other
    citationRole: source
    title: EU Region Warehouse Migration Retrospective
    url: 'internal://data-platform/eu-warehouse-migration-retro'
    accessed: '2026-06-30'
relationships:
  - type: relates-to
    target: /semantic/engineering/engineering-report-warehouse-consolidation.md
ontology:
  '@type': OntologyReference
  id: mif-docs
  version: 1.0.0
  uri: https://mif-spec.dev/ontologies/mif-docs
entity:
  name: 'Executive Summary: Data Warehouse Consolidation'
  entity_type: executive-summary
---

# Executive Summary: Data Warehouse Consolidation

**Date:** 2026-06-30. **Scope:** Cloud data-warehouse spend and platform
footprint across Engineering. **Decision supported:** whether to approve a
90-day consolidation of three regional data-warehouse platforms onto one
before Q4 budget lock.

## BLUF (Bottom Line Up Front)

Approve consolidating Snowflake, BigQuery, and Redshift onto a single
Snowflake instance within 90 days. Running three warehouse platforms in
parallel costs $2.4M/year against a consolidated cost of $600K/year on
Snowflake alone [1] — the migration pays for itself inside the first quarter
after cutover.

## Key Findings

- Three regional warehouses currently duplicate the same customer-analytics
  tables across Snowflake, BigQuery, and Redshift, adding $1.8M/year in
  redundant storage and compute with no corresponding capability gain [1].
- Query latency on the Snowflake instance already meets the p95 < 2s target
  the other two platforms miss under equivalent load [2].
- Migration engineering effort is estimated at 6 engineer-weeks, informed by
  a completed pilot migration of the EU region's warehouse last quarter [2].
- Two of the three platforms are on contracts that renew in 90 days, giving a
  narrow but sufficient window to consolidate before renewal locks in another
  year of duplicate spend [1].

## Recommendation

**Approve the 90-day Snowflake consolidation.** What: retire the BigQuery and
Redshift warehouses and route all regional analytics through the existing
Snowflake instance. Why: eliminates $1.8M/year in duplicate spend and removes
two platforms engineers must maintain in parallel. How: complete the
remaining two regional migrations using the same runbook validated in the
EU pilot, sequenced before the 90-day contract renewal window closes. Risk:
a missed renewal deadline forces one more year of triple-platform spend —
sequence the migration to close at least two weeks before renewal.

## Risks & Caveats

- The 6 engineer-week estimate is drawn from one completed pilot; a second or
  third region could surface migration issues the pilot did not encounter.
- If the 90-day window slips past the contract renewal date, the
  cost-avoidance case collapses for another full year.
- Query-latency parity assumes current load; a large load increase before
  cutover could require re-validating the p95 target on Snowflake alone.

## Footnotes

1. Q2 2026 FinOps Cost Review (internal, Engineering Finance).
2. EU Region Warehouse Migration Retrospective (internal, Data Platform team).
