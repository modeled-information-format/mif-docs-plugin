---
id: 182a9fb4-1476-5263-bedc-0c76cdffe526
type: semantic
created: 2026-06-29T10:00:00Z
namespace: architecture/antipattern
title: "Antipattern: arc42 in Name Only"
tags:
  - antipattern
  - arc42
---

# Payments Service Architecture

<!-- ANTIPATTERN: claims to be arc42 but omits most of the 12 sections. -->

## 1. Introduction and Goals

We are building a payments service. It should be good.

<!-- ANTIPATTERN: goals are vague ("be good") with no quality goals or
     stakeholder table. -->

## 5. Building Block View

There is a service and a database.

<!-- ANTIPATTERN: jumps from section 1 to 5, skipping Constraints (2), Context
     & Scope (3), and Solution Strategy (4). No context diagram exists. -->

## Decisions

We picked Postgres because we like it.

<!-- ANTIPATTERN: section 9 should record decisions with context and
     consequences, not one-line preferences. -->

## Notes

The rest is still unwritten.

<!-- ANTIPATTERN: sections 6 Runtime View, 7 Deployment View, 8 Crosscutting
     Concepts, 10 Quality Requirements, 11 Risks & Technical Debt, and 12
     Glossary are entirely missing. An arc42 doc that drops the quality and
     risk sections hides exactly the information the template exists to surface. -->
