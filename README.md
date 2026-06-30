<p align="center">
  <img src=".github/social-preview.png" width="860"
       alt="mif-docs Documentation Suite, built on MIF: one skill per document genre, every
            doc read by both a person and a parser. The chevron-M mark and wordmark on a dark
            field; three pillars (nineteen document genres; one artifact, two readers; proven
            conformant) beside a Diataxis quadrant of four genre cards — tutorial, how-to,
            reference, explanation — each a machine-cyan typed structure carrying a human-amber
            meaning dot, all resting on a single machine-cyan MIF L1-to-L3 floor.">
</p>

# mif-docs

A **standalone Claude Code plugin** that ships **one skill per concrete document
genre**, each adopting the primary industry pattern for its genre over a **MIF
(Modeled Information Format) Level-1 floor that climbs to L2/L3 when the drafting
context supplies the detail**.

Every document the suite produces is *both* a human-readable artifact in its
native genre *and* a MIF-conformant unit: structured frontmatter that projects to
the canonical JSON-LD and validates fail-closed against
`https://mif-spec.dev/schema/`.

## Install

From the `modeled-information-format` plugin marketplace:

```bash
claude plugin marketplace add modeled-information-format/claude-code-plugins
claude plugin install mif-docs@modeled-information-format
```

The release is attested with SLSA build provenance — verify the artifact before
trusting it:

```bash
gh attestation verify mif-docs-plugin-v0.1.0.tar.gz \
  --repo modeled-information-format/mif-docs-plugin \
  --signer-workflow modeled-information-format/mif-docs-plugin/.github/workflows/release.yml
```

## What's inside

| Layer | Skills |
| --- | --- |
| **Genre skills** | `diataxis-tutorial`, `diataxis-how-to`, `diataxis-reference`, `diataxis-explanation`, `arc42-arch-doc`, `c4-model-diagram`, `google-design-doc`, `adr`, `rust-rfc`, `python-pep`, `changelog`, `sre-runbook`, `playbook`, `prd`, `feature-spec`, `ai-architecture-doc`, `kiro-requirements`, `kiro-design`, `kiro-tasks` |
| **Shared substrate** | `mif-frontmatter` (L1–L3 authoring), `ears-acceptance-criteria`, `mif-validate` (deterministic canonical-schema gate) |
| **Orchestration** | `doc-set-planner` (engine) + the `diataxis` / `ai-spec` / `kiro` / `architecture` recipes |

## Documentation

The plugin documents itself with its own genre skills — every doc below is a
MIF-conformant artifact validated by `mif-validate` (ADRs by the structured-madr
Action), organized in the Diataxis quadrants:

- **Tutorial** — [Getting started](docs/tutorials/getting-started.md)
- **How-to** — [Validate and author a document](docs/how-to/validate-and-author-a-document.md)
- **Reference** — [Genre & CLI catalog](docs/reference/genre-and-cli-catalog.md)
- **Explanation** — [One artifact, two readers](docs/explanation/one-artifact-two-readers.md)
- **Architecture** — [arc42](docs/architecture/arc42.md) · [C4 model](docs/architecture/c4.md)
- **Decisions** — [Architecture Decision Records](docs/adr/)
- **Runbooks** — [Cut an attested release](docs/runbooks/cut-an-attested-release.md) ·
  [Hydrate schema & ontology](docs/runbooks/hydrate-schema-and-ontology.md)
- **[Changelog](CHANGELOG.md)**

## MIF conformance

`mif-validate` is deterministic: it parses a document's YAML frontmatter, projects
it to the MIF JSON-LD object, and validates with `ajv` (+ `ajv-formats`) against
the **canonical** schema at `mif-spec.dev` — no LLM judgment in the conformance
path. Level floors (`--level 1|2|3`) layer an original required-field overlay over
the canonical core. Identical input + identical resolved schema → identical
verdict.

The bundled schema is a refreshable **cache**, never the authority: it
auto-hydrates from `mif-spec.dev/schema` and records the resolved version in
`schema/VENDOR.lock`. Offline, it falls back to the last hydrated copy and warns.

### Fail-closed guard (the conformance is enforced, not trusted)

The plugin promises MIF output, so it enforces it. `hooks/hooks.json` registers a
`PostToolUse` hook (`hooks/mif-guard.mjs`) on `Write`, `Edit`, and `MultiEdit`.
When a genre document is written, the guard runs `mif-validate --level 1` on it
and, if it is not conformant, **exits 2 to block** and feeds the failure back so
the document must be fixed before work continues. There is no fail-open path: a
genre doc that cannot be proven conformant is blocked.

A file is guarded only when it is markdown whose frontmatter carries a
document-genre signal (a MIF `type`/`ontology`/`entity_type` block, or the legacy
`diataxis_type` marker). Plain markdown with no genre frontmatter is left alone,
and `type: adr` documents are skipped here because the `adr` genre is
structured-MADR and validated by the structured-madr action, not `mif-validate`.
The guard's behaviour is proven both ways (passes a conformant doc, blocks a
non-MIF one) by `npm run test:hook`, which CI runs on every push.

## Quickstart

```bash
npm ci
npm run hydrate-schema          # fetch canonical MIF schema -> schema/.cache
npm run mif-validate -- path/to/doc.md --level 1
npm run validate-plugin         # structural check of plugin.json + every SKILL.md
npm run lint:md                 # markdownlint-cli2
```

## License

MIT.
