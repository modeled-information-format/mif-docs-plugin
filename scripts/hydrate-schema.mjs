#!/usr/bin/env node
// hydrate-schema.mjs — refresh the canonical MIF schema cache from mif-spec.dev.
//
// The bundled schema is a refreshable CACHE, never the authority. This fetches
// the canonical catalog (mif.schema.json + the entity-reference definition +
// context) into schema/.cache/<version>/ and records the resolved version in
// schema/VENDOR.lock for reproducibility. Offline, mif-validate falls back to
// the last hydrated version and warns; this script surfaces the fetch failure.
//
// Idempotent: VENDOR.lock records the resolved schema IDENTITY — source,
// channel, resolvedVersion, and the file set. hydratedAt moves only when that
// identity changes, or when a file already in the cache comes back from
// upstream with different bytes. Repopulating the gitignored schema/.cache/
// is not itself a change, so a fresh clone can hydrate and stay clean, and a
// re-run against an unchanged schema writes nothing at all.
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseLock, shouldWriteLock } from "./lib/hydrate-schema-lib.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CACHE = join(ROOT, "schema", ".cache");
const LOCK = join(ROOT, "schema", "VENDOR.lock");

const BASE = "https://mif-spec.dev/schema";
// `latest` by default; override with `node hydrate-schema.mjs v1.0.0` or 1.0.0.
const arg = process.argv[2] || "latest";
const channel = arg.replace(/^v/, "");

const FILES = [
  "mif.schema.json",
  "citation.schema.json",
  "context.jsonld",
  "definitions/entity-reference.schema.json",
  "ontology/ontology.schema.json",
];

async function fetchText(url) {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return await res.text();
}

function readExisting(path) {
  return existsSync(path) ? readFileSync(path, "utf8") : null;
}

async function main() {
  // Resolve `latest` alias to a concrete version via the catalog index.
  let resolved = channel;
  try {
    const idx = JSON.parse(await fetchText(`${BASE}/index.json`));
    if (channel === "latest") {
      resolved = idx.latest || idx.versions?.at(-1) || "latest";
    }
  } catch {
    // index optional; fall back to the channel string in the path.
  }

  const versionSeg = channel === "latest" ? "latest" : channel;
  const outDir = join(CACHE, resolved);
  mkdirSync(join(outDir, "definitions"), { recursive: true });
  mkdirSync(join(outDir, "ontology"), { recursive: true });

  const fetched = [];
  const fileStates = [];
  for (const rel of FILES) {
    try {
      const text = await fetchText(`${BASE}/${versionSeg}/${rel}`);
      const dest = join(outDir, rel);
      const existing = readExisting(dest);
      if (existing !== text) writeFileSync(dest, text);
      fileStates.push({ existing, fetched: text });
      fetched.push(rel);
    } catch (e) {
      // citation/ontology are not load-bearing for core validation; warn only.
      if (rel === "mif.schema.json") throw e;
      console.warn(`  warn: skipped ${rel} (${e.message})`);
    }
  }

  const existingLock = parseLock(readExisting(LOCK));
  const meta = {
    source: BASE,
    channel,
    resolvedVersion: resolved,
    files: fetched,
  };

  if (!shouldWriteLock(fileStates, existingLock, meta)) {
    console.log(`up to date: MIF schema ${resolved} (channel: ${channel}) — no changes, nothing written`);
    return;
  }

  const lock = { ...meta, hydratedAt: new Date().toISOString() };
  writeFileSync(LOCK, JSON.stringify(lock, null, 2) + "\n");
  console.log(`hydrated MIF schema ${resolved} (channel: ${channel}) -> schema/.cache/${resolved}`);
  console.log(`  files: ${fetched.join(", ")}`);
  console.log(`  lock: schema/VENDOR.lock`);
}

main().catch((e) => {
  console.error(`hydrate-schema failed: ${e.message}`);
  // A missing or unreadable lock must not turn a clean failure message into a
  // second, unhandled throw — parseLock returns null rather than raising.
  const lock = parseLock(readExisting(LOCK));
  if (lock) {
    console.error(`  last hydrated: ${lock.resolvedVersion} at ${lock.hydratedAt} (mif-validate can fall back to it offline)`);
  }
  process.exit(1);
});
