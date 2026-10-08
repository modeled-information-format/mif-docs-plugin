---
id: 3113f275-102a-5619-a5a2-7aac48668fd3
type: semantic
created: 2026-06-30T10:00:00Z
namespace: clinical-submission/antipattern
title: 'Antipattern: A Clinical Study Report That Collapses Efficacy and Safety'
tags:
  - antipattern
  - clinical-study-report
---

# Clinical Study Report: Fictional Antihypertensive Trial

<!-- ANTIPATTERN: no scope caveat and no CTD/Module 5 framing anywhere in this
     document — the report never situates itself in the CTD five-module frame
     or disclaims clinical validity / regulatory acceptance. -->

## Synopsis

We ran a big trial and the drug worked great, lowering blood pressure a lot
with almost no side effects.

<!-- ANTIPATTERN: the Synopsis already blends the efficacy claim ("lowering
     blood pressure a lot") and the safety claim ("almost no side effects")
     into one undifferentiated sentence — the first sign of the genre's single
     most load-bearing defect below. -->

## Ethics

Ethics review happened as normal.

<!-- ANTIPATTERN: "as normal" is not traceable to an IRB/ethics-committee
     approval record or a consent process — it asserts conduct without
     evidence. -->

## Objectives

Show the drug lowers blood pressure.

## Investigational Plan

Randomized trial, several hundred people, drug vs. placebo.

## Methods

We measured blood pressure and adverse events and looked at how the drug did
overall.

<!-- ANTIPATTERN: this is the genre's single most load-bearing defect —
     Methods never separates efficacy methodology (endpoint, analysis
     population, statistical method) from safety methodology (AE/SAE
     ascertainment, safety population). The rules require efficacy and safety
     kept distinct in Methods, Results, and the Discussion's benefit-risk
     weighing; here they are merged into one "how did the drug do overall"
     narrative, so nothing downstream can be untangled into a separate
     efficacy result and safety result. -->

## Results

The drug reduced blood pressure by about 10 mmHg more than placebo, and
patients tolerated it well with barely any adverse events, all told a strong
result overall.

<!-- ANTIPATTERN: Results repeats the same efficacy/safety merge as Methods —
     one sentence, no analysis-population split, no separate efficacy and
     safety subsections. It is also uncited ("about 10 mmHg", "barely any
     adverse events" resolve to no source, no CI, no rate), but the
     efficacy/safety collapse is the structural defect that makes even a
     citation fix insufficient — the genre requires the two kept apart, not
     just individually sourced. -->

## Discussion & Conclusions

The drug is safe and effective and should move forward.

<!-- ANTIPATTERN: no limitations, no benefit-risk discussion, and the
     conclusion is asserted as a regulatory determination rather than the
     genre's required "structure, not regulatory acceptance" framing. There is
     also no Investigators & Study Structure section and no Tables, Figures &
     Appendices section — two of the nine required ICH E3 sections are simply
     missing. -->
