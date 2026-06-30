#!/usr/bin/env node
// hydrate-ontology.mjs — pull the mif-docs ontology into a refreshable cache.
//
// The ontology DEFINITION is not vendored in this repo: its source of truth is the
// `modeled-information-format/ontologies` repo, and the release build pulls it into
// the artifact. This mirrors how the MIF schema is hydrated (schema/.cache). Order:
//   1. the published canonical URI (mif-spec.dev/ontologies/mif-docs)
//   2. dev fallback: the sibling ../ontologies checkout in this workspace
// The result lands in ontologies/.cache/ (gitignored) and a lock records the source.
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CACHE = join(ROOT, "ontologies", ".cache");
const OUT = join(CACHE, "mif-docs.ontology.yaml");
const LOCK = join(CACHE, "VENDOR.lock");
// Resolution order: published canonical URI -> the ontologies repo on GitHub
// (works in CI once that repo is pushed) -> the local sibling checkout (dev).
const SOURCES = [
  "https://mif-spec.dev/ontologies/mif-docs/mif-docs.ontology.yaml",
  "https://raw.githubusercontent.com/modeled-information-format/ontologies/main/ontologies/mif-docs/mif-docs.ontology.yaml",
];
const SIBLING = join(ROOT, "..", "ontologies", "ontologies", "mif-docs", "mif-docs.ontology.yaml");

async function fromUri(uri) {
  const res = await fetch(uri, { redirect: "follow" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return { text: await res.text(), source: uri };
}
function fromSibling() {
  if (!existsSync(SIBLING)) throw new Error(`sibling ontologies repo not found at ${SIBLING}`);
  return { text: readFileSync(SIBLING, "utf8"), source: SIBLING };
}

async function main() {
  let got;
  for (const uri of SOURCES) {
    try { got = await fromUri(uri); break; }
    catch (e) { console.warn(`  ${uri} unavailable (${e.message})`); }
  }
  if (!got) {
    console.warn("  remote ontology unavailable; using sibling ../ontologies (dev)");
    got = fromSibling();
  }
  mkdirSync(CACHE, { recursive: true });
  writeFileSync(OUT, got.text);
  writeFileSync(LOCK, JSON.stringify({ source: got.source, hydratedAt: new Date().toISOString() }, null, 2) + "\n");
  console.log(`hydrated mif-docs ontology from ${got.source.startsWith("http") ? "published URI" : "sibling repo (dev)"} -> ontologies/.cache/`);
}

main().catch((e) => { console.error(`hydrate-ontology failed: ${e.message}`); process.exit(1); });
