---
id: 4a650759-5263-506b-b9c3-d47e8210aaa9
type: semantic
created: 2026-06-29T10:00:00Z
namespace: pep/antipattern
title: "Antipattern: A PEP Missing Its Required Sections"
tags:
  - antipattern
  - pep
---

# Make Python Faster

<!-- ANTIPATTERN: title states a wish, not a specific, reviewable change.
     A PEP title names one concrete proposal (e.g. "Add math.clamp()"). -->

```text
PEP: TBD
Title: Make Python Faster
Author: someone
Status: probably good
Type: feature
Python-Version: latest
```

<!-- ANTIPATTERN: malformed header preamble.
     - PEP number is "TBD" (must be assigned before circulation).
     - Status "probably good" is not a lifecycle state
       (Draft/Accepted/Final/Rejected/Withdrawn/Deferred/Superseded).
     - Type "feature" is not one of Standards Track / Informational / Process.
     - "Created:" is missing entirely.
     - "Python-Version: latest" is not a real version. -->

## Abstract

This PEP will make Python faster in a bunch of ways that we will figure out.

<!-- ANTIPATTERN: the Abstract describes no actual change. A PEP proposes one
     specific thing; "a bunch of ways we'll figure out" is not specifiable. -->

## Motivation

Everyone agrees Python should be faster, so this is obviously a good idea.

<!-- ANTIPATTERN: appeal to consensus instead of a stated problem. Motivation
     must describe the concrete gap the proposal closes. -->

## Specification

We change the interpreter to be faster. The details are left to whoever
implements it.

<!-- ANTIPATTERN: the Specification is not implementable. Two engineers could
     not produce the same behavior from this. Normative detail is mandatory. -->

## Security Implications

Probably fine.

<!-- ANTIPATTERN: hand-waved. Even "none" must be justified by what the change
     does and does not touch. -->

<!-- ANTIPATTERN: there is NO "Backwards Compatibility" section. An interpreter
     change has compatibility consequences; reviewers reject PEPs that omit it.
     "None" would be acceptable, but silence is not. -->

<!-- ANTIPATTERN: there is NO "Rejected Ideas" section. A reviewable PEP shows
     the alternatives it considered and why it dropped them; without it the
     design looks unexamined. -->
