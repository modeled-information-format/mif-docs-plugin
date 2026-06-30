---
name: ears-acceptance-criteria
description: Turn a requirement, decision driver, or finding into an EARS-notation acceptance criterion that a human and an agent grade identically. Use when authoring acceptance criteria for a PRD, feature spec, architecture doc, ADR decision driver, or Kiro requirements document.
argument-hint: "<the requirement or driver to convert>"
---

# ears-acceptance-criteria

Shared helper (not a standalone document genre). It encodes requirements in
**EARS** (Easy Approach to Requirements Syntax) so acceptance criteria are
machine-readable and unambiguous. Invoked by `prd`, `feature-spec`,
`ai-architecture-doc`, `kiro-requirements`, and the `adr` decision drivers.

## The five EARS templates

| Pattern | Template | Use for |
| --- | --- | --- |
| **Ubiquitous** | The `<system>` shall `<response>`. | always-true invariants |
| **Event-driven** | When `<trigger>`, the `<system>` shall `<response>`. | a stimulus causes a response |
| **State-driven** | While `<state>`, the `<system>` shall `<response>`. | behavior during a state |
| **Unwanted** | If `<condition>`, then the `<system>` shall `<response>`. | error / edge handling |
| **Optional** | Where `<feature>`, the `<system>` shall `<response>`. | feature-conditional behavior |

## Rules

- One criterion = one testable sentence. No conjunctions hiding two requirements.
- `<system>` is a concrete named component, not "the app".
- `<response>` is observable and verifiable (a state change, an output, a code).
- Prefer the most specific template that fits; do not default everything to
  Ubiquitous.

## Example

> When a request exceeds 600 requests/minute per API key, the gateway shall
> reject it with HTTP 429 and a `Retry-After` header.

(Event-driven: trigger = rate exceeded; system = gateway; response = 429 + header.)
