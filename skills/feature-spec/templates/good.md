---
id: feature-contact-csv-export
type: semantic
created: 2026-06-29T10:00:00Z
modified: 2026-06-29T10:00:00Z
namespace: spec/feature/contacts
title: Contact CSV Export
tags:
  - feature-spec
  - contacts
  - export
temporal:
  "@type": TemporalMetadata
  validFrom: 2026-06-29T00:00:00Z
  ttl: P1Y
  recordedAt: 2026-06-29T10:00:00Z
provenance:
  "@type": Provenance
  sourceType: user_explicit
  trustLevel: high_confidence
relationships:
  - type: derived-from
    target: /semantic/prd/contacts-data-portability.md
  - type: depends-on
    target: /semantic/ai-architecture-doc/contacts-platform-architecture.md
---

# Contact CSV Export

## Overview

Account owners need to take their contact list out of the product — for backups,
spreadsheets, or migration. This feature adds a one-click export that streams the
authenticated account's contacts as a UTF-8 CSV file. Scope is a single account's
own contacts; cross-account export, scheduled exports, and other formats (XLSX,
JSON) are out of scope and tracked separately.

## Acceptance Criteria

1. When an authenticated owner requests `GET /api/contacts/export`, the
   ExportService shall respond `200` with `Content-Type: text/csv` and a
   `Content-Disposition: attachment; filename="contacts-<YYYY-MM-DD>.csv"` header.
2. The ExportService shall emit a header row `id,name,email,created_at` followed
   by one row per contact, ordered by `created_at` ascending.
3. When a field value contains a comma, double quote, or newline, the
   ExportService shall quote that field and escape embedded quotes by doubling
   them, per RFC 4180.
4. While an account has more than 10,000 contacts, the ExportService shall stream
   rows incrementally rather than buffering the full file in memory.
5. If the caller is unauthenticated, then the ExportService shall respond `401`
   and emit no contact data.
6. Where the `?fields=` query parameter names a subset of allowed columns, the
   ExportService shall restrict output to those columns in the given order.

## Design

- **Endpoint:** `GET /api/contacts/export` on the existing contacts router,
  guarded by the standard session-auth middleware.
- **ExportService:** accepts `(accountId, fields[])`, returns a readable byte
  stream. It pages the `contacts` table in batches of 500 by `created_at`,
  formats each row through a `csvRow(record, fields)` encoder, and pipes the
  stream to the HTTP response so memory stays flat regardless of contact count.
- **csvRow encoder:** pure function applying RFC 4180 quoting; unit-tested against
  the escaping criteria independently of the endpoint.
- **Interface:** `exportContacts(accountId: string, fields?: string[]): Readable`.
  Default `fields` is `["id","name","email","created_at"]`; unknown field names
  are rejected before streaming begins.

## Edge Cases

- **No contacts:** the account has zero contacts. Respond `200` with only the
  header row and a trailing newline (a valid empty CSV), not `404`.
- **Field with leading `=`/`+`/`-`/`@`:** prefix the value with a single quote to
  neutralize spreadsheet formula injection before CSV quoting.
- **Invalid `fields=` value:** a requested column is not in the allow-list.
  Respond `400` with `{ "error": "unknown field: <name>" }` and emit no rows.
- **Null name or email:** render the cell as an empty string, never the literal
  `null`.
- **Mid-stream database error:** after headers are already flushed, terminate the
  stream and log the failure; the client receives a truncated download and a
  `5xx` is recorded in metrics (status cannot be retroactively changed).

<!--
MIF Level 3: this spec carries `modified`, `temporal` validity (valid from
2026-06-29, `ttl: P1Y`), `provenance` (`user_explicit` / `high_confidence`), and
typed `relationships[]`. From frontmatter alone — no prose parsing — a machine
consumer can answer: "is this spec still in its validity window?" (`temporal`),
"where did it come from?" (`derived-from` the contacts data-portability PRD), and
"what does it depend on?" (`depends-on` the contacts platform AI-architecture
doc). The same document projects losslessly to JSON-LD and back. Compare
good-l1.md — the L1 floor, opaque to every one of those queries.
-->
