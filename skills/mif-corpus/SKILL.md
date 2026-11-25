---
name: mif-corpus
description: Semantically index and query a corpus of MIF documents — ingest docs into a local vector store, run free-text search, find similar documents for cross-linking, and report corpus statistics via the optional mif-rs tools (mif-mcp MCP server or mif-cli). Use when a request needs discovery over existing MIF docs ("which doc covers X?", "what should this link to?"). Anti-trigger; for proving conformance use mif-validate — similarity is a suggestion signal, never a gate.
argument-hint: "<ingest <path>|search <query>|find-similar <id>|corpus-stats> [--db-path <path>]"
---

# mif-corpus

Shared substrate for semantic discovery over MIF documents. Where
`mif-validate` proves what a document IS (deterministically), this skill finds
what a document is ABOUT — a local-embedding vector index queried by meaning,
not string match. It is backed entirely by the optional
[mif-rs](https://github.com/modeled-information-format/mif-rs) tools and is an
enhancement layer: nothing in this suite's conformance path depends on it.

## Tool resolution order (never fake results)

1. **MCP tools** — when an `mif-mcp` server is connected in the session, use
   its tools: `ingest_mif_document`, `search_documents`,
   `find_similar_documents`, `corpus_stats` (and `validate_mif_document`,
   `resolve_ontology_reference` for the non-corpus operations).
2. **CLI fallback** — when only the `mif-cli` binary is on `PATH`, use the
   matching subcommands: `ingest`, `search`, `find-similar`, `corpus-stats`.
3. **Neither available** — say so plainly, point at the install route
   (attested release binaries from `modeled-information-format/mif-rs`, or
   `cargo install mif-cli mif-mcp`), and stop. Do not simulate scores, invent
   matches, or substitute grep output labeled as semantic search.

## Store convention

- The vector store lives at **`.mif/vectors.db`**, created on first ingest.
  The tools' default is relative to the **working directory** — run them from
  the repo root so the store lands at `<repo>/.mif/vectors.db` (or pass
  `--db-path` / the `db_path` parameter to pin it explicitly; a run from a
  subdirectory otherwise creates a second store silently). It is
  **gitignored** — a derived local index, never committed, never an
  authority.
- Document ids are the MIF `@id` (`urn:mif:<id>` from the frontmatter `id`).
- Re-ingesting a changed document upserts its embedding; ingest is
  **fail-closed** — a document that fails schema validation or the lossless
  round-trip stores nothing.

## Operations

| Operation | MCP tool | CLI | Behavior |
| --- | --- | --- | --- |
| Ingest | `ingest_mif_document` | `mif-cli ingest <file>` | validate + prove round-trip + embed + store |
| Search | `search_documents` | `mif-cli search "<query>"` | rank stored docs against the query (see "Reading search scores") |
| Similar | `find_similar_documents` | `mif-cli find-similar <id>` | rank docs similar to an ingested one, anchor excluded |
| Stats | `corpus_stats` | `mif-cli corpus-stats` | count, embedding dimension, db path |

Search and similar results are `(score, id)` pairs, best first. Treat results
as **candidates for a human or a genre skill to act on** — never as a
validation verdict.

## Reading search scores

What `score` means depends on the mif-rs release and the search mode. Check
before comparing a score with a threshold.

- **`find-similar`, and `search` on mif-rs 0.12.0 and earlier**: `score` is
  cosine similarity. On this suite's own corpus, useful matches typically
  land in the ~0.55-0.78 range.
- **`search` on mif-rs 0.13.0 and later**: the default mode is `hybrid`, which
  also ranks by exact terms so an identifier is found by the text that holds
  it. `score` is then a rank-fusion value that never exceeds about 0.033. It
  orders the results and says nothing about how similar a match is.

To judge similarity on 0.13.0 and later:

- **MCP**: read the match's `cosine` field. When a match has no `cosine`
  field, the server predates hybrid search and `score` is the cosine.
- **CLI**: run `mif-cli --version`. On 0.13.0 or later pass `--mode semantic`,
  which prints cosine scores, or pass `--format json` and read `cosine`.

Never compare a hybrid `score` with the 0.55-0.78 range. A match on 0.13.0
and later also carries the passage that matched (`heading`, `text`, `span`);
`get_passage` / `mif-cli get-passage <id> --heading <heading>` returns that
section alone, so there is no need to read the whole document.

## Multi-root queries (spanning a shared central store)

`search`/`find-similar`/`corpus-stats` (CLI) and their MCP counterparts
`search_documents`/`find_similar_documents`/`corpus_stats` accept an
additional, repeatable root: `--extra-db-path <path>` on the CLI, an
`extra_db_paths` array parameter on the MCP tools. This lets a query span
the project-local `.mif/vectors.db` **and** any number of other vector
stores in one call — most commonly a shared, user-level central corpus that
multiple projects ingest into (e.g. the
[`claude-artifact-authoring`](https://github.com/modeled-information-format/claude-code-plugins/tree/main/plugins/claude-artifact-authoring)
plugin's `persist-artifact` skill best-effort-ingests graded artifacts into
one via `mif-corpus ingest`, at an XDG-conformant path —
`$HOME/.local/share/claude-artifact-authoring/corpus/vectors.db`, i.e.
`${XDG_DATA_HOME:-$HOME/.local/share}` with the default expanded).

- Results are **merged into one ranked list across every root** for
  `search`/`find-similar` — not grouped or root-ordered — with each match
  additionally tagged with the root it came from. `find-similar`, and
  `search` in semantic mode, merge by cosine similarity; hybrid `search`
  ranks cosine similarities together and keeps each document's exact-term
  rank from its own root. Single-root behavior (no
  `--extra-db-path`/`extra_db_paths` given) is unchanged.
- `corpus-stats`/`corpus_stats` is not a ranked search — with extra roots it
  returns the primary root's `count`/`dim` plus a `total_count` and a
  per-root breakdown (`extra_roots`); nothing is merge-ranked, since there is
  no query vector in a stats call.
- Fails **closed per root**: a root that cannot be opened or queried aborts
  the whole call rather than silently dropping it from the results. A root
  that has a valid parent directory but no database file yet (never
  ingested) is treated as empty, not an error.
- The same document id can legitimately exist in more than one root (e.g. a
  document ingested both locally and into the shared central store) — this
  is expected, not a collision to dedupe.

## Known exclusion: documents with a `description:` key (the ADRs)

Documents carrying a top-level `description:` frontmatter key currently fail
the Rust round-trip check inside ingest (the key is dropped by the canonical
re-serialization; tracked upstream and in this repo's engine-convergence
epic). In this suite's corpus those are exactly the ADR documents under
`docs/adr/`, which carry MIF `type: adr` (`conceptType: semantic`), so the
skip set is identifiable by the `description:` key, the `docs/adr/` path, or
the `type: adr` frontmatter value alike. Skip them in bulk ingests and say
that they were skipped and why. This sits alongside the suite's existing rule
that the adr *genre* is validated by the structured-madr Action, not
`mif-validate`.

## First-run cost

The first ingest or search downloads the sentence-embedding model into the
local hf-hub cache — it needs network access once and takes noticeably longer
than subsequent runs. Vectors are 384-dimensional. Warn about this before a
first bulk ingest; after the model is cached, runs are local and fast.

## Reading failures

Every failure renders as an RFC 9457 `application/problem+json` envelope with
`type`, `status`, `detail`, and often `suggested_fix` + `code_actions[]`.
Honor the applicability marker: apply a `machine_applicable` fix, surface a
`maybe_incorrect` one to the user instead of auto-applying. A 404
`document-not-found` from find-similar means the anchor was never ingested —
ingest it first.

## How the suite uses this

`doc-set-planner`'s corpus-aware Plan and Reconcile steps (shipped as their
own change, stacked on this skill) consume it in two places: at **Plan** time,
search the corpus for existing coverage of each proposed member (surface
strong hits as "extend instead of create?" decisions); at **Reconcile** time,
offer find-similar results as candidate `relationships[]` targets. In both
cases the recipe contract and the deterministic `planner-check` gate stay
authoritative.
