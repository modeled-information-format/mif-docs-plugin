---
id: 10337e3c-1539-5e2e-8f9a-c16a86e95bfd
type: semantic
created: 2026-06-29T10:00:00Z
namespace: reference/antipattern
title: "Antipattern: A Reference That Forgot It Was a Reference"
tags:
  - antipattern
  - diataxis
---

# Getting Started with mifx export

<!-- ANTIPATTERN: titled as a tutorial ("Getting Started"), not a neutral subject
     line naming the one thing described. -->

So you want to export your documents? Great — let's walk through it together. By
the end you'll feel confident running your first export.

<!-- ANTIPATTERN: learning-oriented framing ("let's walk through it", "feel
     confident"). That is tutorial mode; reference is information-oriented and
     impersonal. -->

## Step 1: First, run the command

First, open your terminal. Then type the command and press enter. Next, check
that the files appeared.

<!-- ANTIPATTERN: numbered "First… Then… Next…" learning steps. A reference is
     consulted, not followed; it has no ordered procedure. -->

## Why we built it this way

We chose JSON-LD as the default because, honestly, it's the best practice for
linked data and we think you'll love how clean it is. We recommend always using
level 3.

<!-- ANTIPATTERN: rationale + opinion ("best practice", "we recommend", "you'll
     love"). The "why" belongs in an explanation doc; reference states facts
     only, with no judgement. -->

## Options

There are a bunch of useful flags. The most important one is probably `--format`,
which you'll usually want to leave alone. `--out` is also handy. There are some
others too.

<!-- ANTIPATTERN: vague, non-exhaustive, inconsistent ("a bunch", "probably",
     "some others too"). Reference must list every item uniformly with name,
     type, default, and constraints — never "and some others". -->
