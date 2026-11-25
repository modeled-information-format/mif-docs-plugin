#!/usr/bin/env node
// hydrate-schema.mjs — refresh the canonical MIF schema cache from mif-spec.dev.
//
// The bundled schema is a refreshable CACHE, never the authority. This fetches
// the canonical catalog (mif.schema.json + the entity-reference definition +
// context) into schema/.cache/<version>/ and records the resolved version in
// schema/VENDOR.lock for reproducibility. Offline, mif-validate falls back to
// the last hydrated version and warns; this script surfaces the fetch failure.
//
// VENDOR.lock also pins each file's sha256. mif-validate runs this script by
// itself the first time it finds the cache empty, so a download for the pinned
// version is checked against those digests before anything is written: bytes
// that do not match are refused, never cached.
//
// Idempotent: VENDOR.lock records the resolved schema IDENTITY — source,
// channel, resolvedVersion, the file set, and the digests. hydratedAt moves only when that
// identity changes, or when a file already in the cache comes back from
// upstream with different bytes. Repopulating the gitignored schema/.cache/
// is not itself a change, so a fresh clone can hydrate and stay clean, and a
// re-run against an unchanged schema writes nothing at all.
import { mkdirSync, writeFileSync, readFileSync, existsSync, renameSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseLock, shouldWriteLock, integrityViolations } from "./lib/hydrate-schema-lib.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CACHE = join(ROOT, "schema", ".cache");
const LOCK = join(ROOT, "schema", "VENDOR.lock");

const BASE = "https://mif-spec.dev/schema";
// The MIF release this plugin targets, fetched from its immutable
// /schema/<version>/ mirror. Releases are coordinated across the MIF tools, so
// the schema is pinned, never the floating `latest`: a new MIF release cannot
// change what CI validates against until this pin moves.
const MIF_SPEC_VERSION = "1.4.2";
// Pinned by default; override with `node hydrate-schema.mjs latest` or 1.3.0.
const arg = process.argv[2] || MIF_SPEC_VERSION;
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

// Any read failure — missing file, permission error, or a race where the
// file disappears between existsSync and readFileSync — is treated as
// "nothing there," never thrown. Both the idempotency check and the
// error-path lock lookup below depend on this never throwing.
// Write through a sibling temp file and rename, so a validator running at the
// same moment never reads a half-written schema.
function writeAtomic(path, text) {
  const tmp = `${path}.${process.pid}.tmp`;
  writeFileSync(tmp, text);
  renameSync(tmp, path);
}

function readExisting(path) {
  try {
    return existsSync(path) ? readFileSync(path, "utf8") : null;
  } catch {
    return null;
  }
}

async function main() {
  // Resolve `latest` alias to a concrete version via the catalog index.
  let resolved = channel;
  if (channel === "latest") {
    try {
      const idx = JSON.parse(await fetchText(`${BASE}/index.json`));
      resolved = idx.aliases?.latest || idx.versions?.at(-1) || "latest";
    } catch {
      // index optional; fall back to the channel string in the path.
    }
  }

  const versionSeg = channel === "latest" ? "latest" : channel;
  const outDir = join(CACHE, resolved);
  mkdirSync(join(outDir, "definitions"), { recursive: true });
  mkdirSync(join(outDir, "ontology"), { recursive: true });

  // Fetch everything first and write nothing: the digests are checked
  // against the lock before any byte reaches the cache.
  const downloads = [];
  for (const rel of FILES) {
    try {
      downloads.push({ rel, text: await fetchText(`${BASE}/${versionSeg}/${rel}`) });
    } catch (e) {
      // citation/ontology are not load-bearing for core validation; warn only.
      if (rel === "mif.schema.json") throw e;
      console.warn(`  warn: skipped ${rel} (${e.message})`);
    }
  }

  const existingLock = parseLock(readExisting(LOCK));
  const sha256 = {};
  for (const { rel, text } of downloads) {
    sha256[rel] = createHash("sha256").update(text).digest("hex");
  }
  const violations = integrityViolations(existingLock, resolved, sha256);
  if (violations.length) {
    throw new Error(
      `integrity check failed for ${violations.join(", ")}: the bytes served for MIF schema ` +
        `${resolved} do not match the sha256 pinned in schema/VENDOR.lock. Nothing was cached.`,
    );
  }

  const fetched = [];
  const fileStates = [];
  for (const { rel, text } of downloads) {
    const dest = join(outDir, rel);
    const existing = readExisting(dest);
    if (existing !== text) writeAtomic(dest, text);
    fileStates.push({ existing, fetched: text });
    fetched.push(rel);
  }

  const meta = {
    source: BASE,
    channel,
    resolvedVersion: resolved,
    files: fetched,
    sha256,
  };

  if (!shouldWriteLock(fileStates, existingLock, meta)) {
    console.log(`up to date: MIF schema ${resolved} (channel: ${channel}) — VENDOR.lock unchanged`);
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
