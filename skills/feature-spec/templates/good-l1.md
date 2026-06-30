---
id: feature-contact-csv-export
type: semantic
created: 2026-06-29T10:00:00Z
---

# Contact CSV Export

## Overview

Account owners need to take their contact list out of the product — for backups,
spreadsheets, or migration. This feature adds a one-click export that streams the
authenticated account's contacts as a UTF-8 CSV file. Scope is a single account's
own contacts; cross-account export, scheduled exports, and other formats are out
of scope.

## Acceptance Criteria

1. When an authenticated owner requests `GET /api/contacts/export`, the
   ExportService shall respond `200` with `Content-Type: text/csv` and a
   `Content-Disposition: attachment; filename="contacts-<YYYY-MM-DD>.csv"` header.
2. The ExportService shall emit a header row `id,name,email,created_at` followed
   by one row per contact, ordered by `created_at` ascending.
3. When a field value contains a comma, double quote, or newline, the
   ExportService shall quote that field and escape embedded quotes per RFC 4180.
4. If the caller is unauthenticated, then the ExportService shall respond `401`
   and emit no contact data.

## Design

`GET /api/contacts/export` on the existing contacts router, guarded by the
standard session-auth middleware. The ExportService pages the `contacts` table in
batches of 500 by `created_at`, encodes each row through a pure RFC 4180
`csvRow(record, fields)` function, and pipes the byte stream to the HTTP response
so memory stays flat regardless of contact count.

## Edge Cases

- **No contacts:** respond `200` with only the header row and a trailing newline,
  not `404`.
- **Formula injection:** prefix any value starting with `=`/`+`/`-`/`@` with a
  single quote before CSV quoting.
- **Mid-stream database error:** after headers are flushed, terminate the stream
  and log the failure; the client receives a truncated download and a `5xx` is
  recorded in metrics.

<!--
MIF Level 1 (floor): id, type, created + body only. This is a complete, valid
feature spec — but to a machine consumer it is opaque prose. It cannot be queried
for "is this spec still valid?" (no `temporal`), "where did it come from?" (no
`provenance`), or "what does it derive from / depend on?" (no `relationships`).
Those answers require the Level 3 frontmatter in good.md.
-->
