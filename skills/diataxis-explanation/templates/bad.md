---
id: 1f59543c-fd00-54b6-9135-46579d0c1e39
type: semantic
created: 2026-06-29T10:00:00Z
namespace: explanation/antipattern
title: "Antipattern: An Explanation That Forgot to Explain"
tags:
  - antipattern
  - diataxis
---

# How to Set Up the Two-View System

<!-- ANTIPATTERN: titled as a how-to ("How to Set Up…"), not as understanding.
     An explanation is topic-titled: "Why MIF Separates the Human and Machine
     Views" or "Understanding the Two-View Model". -->

This explains the two-view model. Follow these steps to use it.

<!-- ANTIPATTERN: an explanation should frame a question and discuss it, not
     announce a procedure to follow. The reader came to understand, not to do. -->

## Steps

1. Create a markdown file with frontmatter.
2. Run the converter to produce JSON-LD.
3. Validate the JSON-LD against the schema.
4. Run the round-trip check and fix any failures.

<!-- ANTIPATTERN: numbered imperative steps are a tutorial/how-to. An explanation
     never hands the reader a procedure. If you are writing "Step 1 — Run…",
     you are in the wrong Diataxis mode. -->

## Field Reference

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `id` | yes | string | The identifier |
| `type` | yes | enum | semantic, episodic, or procedural |
| `created` | yes | datetime | ISO-8601 timestamp |
| `namespace` | no | string | Topic namespace |

<!-- ANTIPATTERN: an exhaustive field-by-field table is reference content. An
     explanation mentions specifics only to make a point about *why*; it does not
     catalog every field and its column of attributes. -->

## Conclusion

That is everything about the two-view system. Now you know all the fields and the
exact commands to run.

<!-- ANTIPATTERN: never discusses why the separation exists, what alternatives
     were rejected, or what trade-offs it carries — the entire job of an
     explanation. It delivered a procedure plus a lookup table and called that
     understanding. -->
