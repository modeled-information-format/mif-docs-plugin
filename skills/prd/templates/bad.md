---
id: cf083639-63cf-5e4c-b76a-ec87d6776148
type: semantic
created: 2026-06-29T10:00:00Z
namespace: prd/antipattern
title: "Antipattern: A Solution-First PRD"
tags:
  - antipattern
  - prd
---

# PRD: Build a Saved Carts Microservice

<!-- ANTIPATTERN: titled with the solution. A PRD opens with the PROBLEM, not a
     chosen implementation. -->

## Overview

We will build a new microservice in Go with a Redis cache to store carts.

<!-- ANTIPATTERN: leads with technology choices (the "how"), which belong in a
     design doc, not a PRD. -->

## Requirements

- It should be fast.
- It should be reliable.
- Users should like it.

<!-- ANTIPATTERN: requirements are vague and untestable. No EARS, no measurable
     threshold. "Fast" and "reliable" cannot be verified. -->

## Timeline

We'll ship it next quarter.

<!-- ANTIPATTERN: no problem statement, no success metrics, and no Non-Goals — so
     there is nothing to measure success against and no boundary on scope. -->
