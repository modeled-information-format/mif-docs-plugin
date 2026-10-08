---
id: fa29c163-2622-51f8-8ac9-7edb809395cc
type: semantic
created: 2026-06-30T10:00:00Z
namespace: computing-paper/antipattern
title: 'Antipattern: A Computing Paper With No Evaluation and No Citations'
tags:
  - antipattern
  - computing-paper
---

# A Faster Way to Serve Language Models

<!-- ANTIPATTERN: titled and formatted like a paper, but there are no CCS
     Concepts / keywords front matter, and the Abstract asserts results with
     no numbered citation anywhere in the document. -->

## Abstract

We built a new batching system for LLM inference that is much faster and more
efficient than what everyone else is doing. It cuts latency dramatically and
lets you serve more users on the same hardware.

## Introduction

Inference is expensive and slow. Other systems batch requests in a fixed way,
which is inefficient. Our system batches adaptively instead, which is
obviously better.

<!-- ANTIPATTERN: no Related Work section — prior systems are gestured at
     ("other systems", "what everyone else is doing") but never named,
     described neutrally, or cited. -->

## Approach

We schedule batches dynamically based on load. The system picks the best
batch size automatically and routes work to whichever GPU is free.

<!-- ANTIPATTERN: no Evaluation section anywhere in the paper — the genre's
     single most load-bearing required element. There is no experimental
     setup (no datasets, baselines, metrics, or environment) and no results
     table; "Results" below is a bare paragraph of unsupported percentages. -->

## Results

Our system is 40% faster and uses 25% less memory than the baseline. It
handles heterogeneous hardware better than prior approaches.

<!-- ANTIPATTERN: every claim in this paper is an orphan fact — "40% faster,"
     "25% less memory," and "handles heterogeneous hardware better" all cite
     nothing. No numbered [N] bracket citations appear anywhere in the text,
     and there is no References section to resolve them against even if
     there were. -->

## Conclusion

Our approach is clearly the best option for serving language models today.

<!-- ANTIPATTERN: no Discussion of limitations or threats to validity, no
     Future Work, and the Conclusion asserts a comparative claim ("clearly
     the best") that no Evaluation evidence in this document supports. -->
