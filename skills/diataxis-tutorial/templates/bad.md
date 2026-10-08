---
id: a930f963-1688-578c-9262-b50d1cc4ebc5
type: procedural
created: 2026-06-29T10:00:00Z
namespace: tutorials/antipattern
title: "Antipattern: A Tutorial That Forgot It Was a Tutorial"
tags:
  - antipattern
  - diataxis
---

# Configuring the MIF Validator

<!-- ANTIPATTERN: titled as a how-to/reference, not a learning promise. -->

This tutorial explains everything about the validator and how to configure it for
all situations.

<!-- ANTIPATTERN: "explains everything" — that is explanation + reference mode,
     not a single hands-on learning path. -->

## Options

The validator accepts many flags. Depending on your needs you may want
`--level 1`, `--level 2`, or `--level 3`, and optionally `--no-roundtrip`. Any of
these works, so pick one.

<!-- ANTIPATTERN: branching "pick one that works for you" language — a tutorial
     has ONE happy path, no decision trees. This is how-to/reference content. -->

## Background on JSON Schema

JSON Schema draft 2020-12 works by... (three paragraphs of theory)

<!-- ANTIPATTERN: theory dump. The "why" belongs in a named explanation doc that
     the tutorial points to — not deleted with no pointer, and not inlined. -->

## Configure as needed

Set up the rest of your environment as appropriate for your project and run the
validator when ready.

<!-- ANTIPATTERN: "as needed" / "as appropriate" — vague, unrunnable. A tutorial
     must work verbatim with no gaps for the learner to fill. -->
