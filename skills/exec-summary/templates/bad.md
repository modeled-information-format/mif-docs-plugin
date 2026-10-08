---
id: e0814000-2ba7-53b4-99a9-5ddadfbd2987
type: semantic
created: 2026-06-30T10:00:00Z
namespace: exec-summary/antipattern
title: 'Antipattern: An Executive Summary That Buries the Recommendation'
tags:
  - antipattern
  - exec-summary
---

# Executive Summary: Data Warehouse Consolidation

<!-- ANTIPATTERN: no BLUF section, and no heading anywhere contains the
     literal string "BLUF" — the section this genre exists to require is
     simply missing. The document opens with background and method instead. -->

## Background

Over the past two quarters, the platform team has been reviewing our data
warehouse footprint. We looked at how each region uses Snowflake, BigQuery,
and Redshift, and interviewed several engineers about their experience with
each platform.

## Methodology

We gathered cost data from three billing cycles, interviewed six engineers
across two regions, and benchmarked query latency under synthetic load. This
section walks through how each data point was collected and cross-checked.

<!-- ANTIPATTERN: this is a methodology narration, which this genre expressly
     forbids — an exec summary states conclusions and their business
     consequence, it does not narrate method. -->

## Findings

Warehouse costs vary across platforms, and query performance also varies.
Some engineers prefer Snowflake, others are used to BigQuery. Migration would
take some engineering time.

<!-- ANTIPATTERN: no quantified finding, no citation, and no "so what" for a
     decision-maker. Vague hedging without a range or number. -->

## Next Steps

We should probably keep evaluating options and revisit this in a future
planning cycle.

<!-- ANTIPATTERN: the recommendation is buried at the very end, under a
     "Next Steps" heading instead of a Recommendation section, and it is not
     a specific, actionable directive — "keep evaluating" is a non-answer, not
     a decision. There is also no Risks & Caveats section and no footnote
     list, so the document is not standalone: a reader who reads only this
     cannot act. -->
