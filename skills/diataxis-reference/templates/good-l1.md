---
id: reference-mifx-export
type: semantic
created: 2026-06-29T10:00:00Z
---

# mifx export

Serialise one or more MIF documents to a target format and write them to a
destination directory.

## Synopsis

```text
mifx export <path>... [--format <fmt>] [--out <dir>] [--level <n>]
                      [--manifest <file>] [--overwrite] [--quiet]
```

## Options

| Flag | Type | Default | Description |
| --- | --- | --- | --- |
| `--format` | enum `jsonld` \| `json` \| `yaml` | `jsonld` | Output serialisation. |
| `--out` | path | `./dist` | Destination directory. Created if absent. |
| `--level` | integer `1` \| `2` \| `3` | `1` | MIF level floor each document must meet. |
| `--overwrite` | boolean flag | `false` | Overwrite existing output files. |
| `--quiet` | boolean flag | `false` | Suppress the per-file progress line. |

## Exit codes

| Code | Meaning |
| --- | --- |
| `0` | All input documents exported successfully. |
| `1` | One or more documents failed validation or could not be written. |
| `2` | Usage error (no path given, unknown flag, invalid `--format`). |

<!--
MIF Level 1 (floor): id, type, created + body only. This is a complete, valid
reference a human can read — but to a machine consumer it is opaque prose. It
cannot be queried for "is this reference still current?" (no temporal/ttl),
"what does it document and can I trust it?" (no provenance), "what evidence
backs it?" (no citations), or "where do I go to understand WHY?" (no typed
relationships). good.md carries the same reference at MIF Level 3, where every
one of those questions is answered by reading frontmatter.
-->
