---
name: mif-validate
description: Deterministically prove a document is MIF-conformant — schema-check its JSON-LD against the canonical mif-spec.dev schema, enforce the L1/L2/L3 floor, and verify the markdown<->JSON-LD round-trip is lossless. Use as the gate after authoring or editing any MIF document, and to convert a doc to either output form.
argument-hint: "<path to the document> [--level 1|2|3]"
---

# mif-validate

The deterministic conformance gate for the suite. **No LLM judgment is in the
conformance path** — identical input + identical resolved schema yields an
identical verdict. Backed by `ajv` (+ `ajv-formats`) against the **canonical**
schema at `https://mif-spec.dev/schema/`.

## What it proves

1. **Schema-conformant** — the doc's JSON-LD projection validates against the
   canonical `mif.schema.json`.
2. **Level floor** — `--level 1|2|3` enforces an original required-field overlay
   (`schema/profiles/level-*.json`) layered over the canonical core.
3. **Lossless round-trip** — `markdown -> JSON-LD -> markdown` loses no
   information (the two projections are deep-equal).

Fail-closed: any failure exits non-zero.

## The schema is a refreshable cache, never the authority

The bundled schema auto-hydrates from `mif-spec.dev` into `schema/.cache/<ver>/`
and the resolved version is pinned in `schema/VENDOR.lock`. Offline, validation
falls back to the last hydrated version and warns. Determinism holds *within* a
resolved version.

## Commands

```bash
npm run hydrate-schema                      # refresh canonical schema cache
node scripts/mif-validate.mjs DOC.md --level 1     # gate (md or .json/.jsonld input)
node scripts/mif-convert.mjs emit-jsonld DOC.md    # markdown -> JSON-LD (either output)
node scripts/mif-convert.mjs emit-markdown DOC.json # JSON-LD -> markdown (schema-checked first)
node scripts/mif-convert.mjs roundtrip DOC.md      # lossless oracle
```

Every genre skill's `templates/good.md` MUST pass `mif-validate --level 1`. CI
runs this gate on every shipped `good.md`.
