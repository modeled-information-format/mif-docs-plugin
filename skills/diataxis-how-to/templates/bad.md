---
id: c6408ea5-1a86-523e-b670-67b51d0ac3b3
type: procedural
created: 2026-06-29T10:00:00Z
namespace: how-to/antipattern
title: "Antipattern: A How-To That Forgot It Was a How-To"
tags:
  - antipattern
  - diataxis
---

# Learn All About API Keys and How They Work

<!-- ANTIPATTERN: titled as a learning lesson, not a goal. A how-to title states
     the task: "How to rotate an API key without downtime". -->

Welcome! Don't worry if you've never rotated a key before — we'll learn together
and you'll feel confident by the end.

<!-- ANTIPATTERN: reassuring, learning-oriented framing aimed at a beginner. That
     is a tutorial. A how-to assumes a competent reader who already has the goal. -->

## What is an API key, anyway?

An API key is a shared secret. Authentication works by the server comparing the
presented key against its store; cryptographically this is just... (four
paragraphs on HMAC, entropy, and the history of bearer tokens).

<!-- ANTIPATTERN: theory dump. The "why it works" belongs in an explanation doc,
     linked, not inlined into a task recipe. -->

## Every flag the keys command supports

`provider keys create` accepts `--name`, `--scopes`, `--expires`, `--ip-allow`,
`--description`, `--rate-limit`, and twelve more, each documented below in full.

<!-- ANTIPATTERN: exhaustive option catalog. That is reference material. A how-to
     picks only the path that accomplishes the one goal. -->

## Rotate the key when you feel ready

Once you've absorbed all of the above, go ahead and set things up however suits
your environment, then revoke the old key whenever it makes sense for you.

<!-- ANTIPATTERN: vague, unrunnable "however suits you" / "whenever it makes
     sense" — no real commands, and no defined completion. A how-to gives ordered
     real commands and ends at a confirmed goal. -->
