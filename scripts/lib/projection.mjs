// projection.mjs — the one MIF projection shared by mif-convert and mif-validate.
//
// "One artifact, two readers": a MIF doc exists in two interconvertible forms —
//   * markdown  (human-readable: YAML frontmatter + body)
//   * JSON-LD   (machine-readable: the schema-checked canonical object)
// The JSON-LD is the form the canonical JSON Schema checks; markdown is a
// projection of it. This module provides both directions plus a lossless
// round-trip oracle, so either form can be the authored input or the emitted
// output.
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { load as yamlLoad, dump as yamlDump } from "js-yaml";
import { MIF_IDENTITY_SIGNAL_KEYS } from "./mif-identity-signal-keys.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");

const CONTEXT_IRI = "https://mif-spec.dev/schema/context.jsonld";
// Frontmatter keys that the projection transforms (everything else passes
// through verbatim, in both directions).
const ID_PREFIX = "urn:mif:";
// The JSON-LD-native meta keys, stripped from both directions' passthrough
// object so neither leaks a stale/foreign value through the trailing spread.
const META_KEYS = ["@context", "@type", "@id", "conceptType"];
// Re-exported from mif-identity-signal-keys.mjs (not defined here) so that
// hooks/mif-guard.mjs can import the list without pulling in this module's
// heavier dependencies (ajv, ajv-formats, js-yaml) on every hook invocation
// (issue #50 review) -- this export preserves projection.mjs's own public API
// for any existing consumer that imports it from here.
export { MIF_IDENTITY_SIGNAL_KEYS };

function stripKeys(obj, keys) {
  for (const k of keys) delete obj[k];
}

function stripIdPrefix(value) {
  const s = String(value);
  return s.startsWith(ID_PREFIX) ? s.slice(ID_PREFIX.length) : s;
}

// ---------------------------------------------------------------------------
// markdown <-> {frontmatter, body}
// ---------------------------------------------------------------------------
export function parseMarkdown(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) throw new Error("no YAML frontmatter block (expected leading ---)");
  const frontmatter = yamlLoad(m[1]) || {};
  const body = normalizeBody(m[2]);
  return { frontmatter, body };
}

function normalizeBody(s) {
  return String(s).replace(/^\r?\n+/, "").replace(/\s+$/, "");
}

// The canonical YAML dump options. Exported so provenance stamping can
// splice subtrees that are byte-identical to what a full canonical
// serialization would produce — one definition, not a synced literal.
export const YAML_DUMP_OPTIONS = Object.freeze({ lineWidth: -1, noRefs: true, sortKeys: false });

export function serializeMarkdown(frontmatter, body) {
  const fm = yamlDump(frontmatter, YAML_DUMP_OPTIONS);
  return `---\n${fm}---\n\n${normalizeBody(body)}\n`;
}

// ---------------------------------------------------------------------------
// forward: markdown frontmatter+body -> JSON-LD canonical object
// ---------------------------------------------------------------------------
export function toJsonld({ frontmatter, body }) {
  const fm = { ...frontmatter };
  // Two equally-canonical authoring conventions: the plain `id`/`type` alias
  // pair, or the JSON-LD-native `@id`/`conceptType` keys used directly in
  // frontmatter. `@type` is never the source for `type`: it is always the
  // fixed literal "Concept", not the semantic subtype `conceptType` carries.
  // If a document somehow carries both forms, they must agree -- silently
  // preferring one over a conflicting other would lose data with no signal.
  // Compare both sides bare (prefix stripped either way present) -- `id`
  // authored already carrying `urn:mif:` must agree with an equally-prefixed
  // `@id`, not get flagged as a conflict just because both happen to carry
  // the same prefix explicitly.
  if (fm.id !== undefined && fm["@id"] !== undefined && stripIdPrefix(fm.id) !== stripIdPrefix(fm["@id"])) {
    throw new Error(`frontmatter has conflicting id ("${fm.id}") and @id ("${fm["@id"]}")`);
  }
  if (fm.type !== undefined && fm.conceptType !== undefined && fm.type !== fm.conceptType) {
    throw new Error(`frontmatter has conflicting type ("${fm.type}") and conceptType ("${fm.conceptType}")`);
  }
  const id = fm.id ?? fm["@id"];
  const type = fm.type ?? fm.conceptType;
  if (id === undefined) throw new Error("frontmatter missing required field: id");
  if (type === undefined) throw new Error("frontmatter missing required field: type");
  delete fm.id;
  delete fm.type;
  stripKeys(fm, META_KEYS);

  const out = {
    "@context": CONTEXT_IRI,
    "@type": "Concept",
    "@id": ID_PREFIX + stripIdPrefix(id),
    conceptType: type,
    ...fm, // created + every other frontmatter field, verbatim
    content: normalizeBody(body),
  };
  return out;
}

// ---------------------------------------------------------------------------
// inverse: JSON-LD canonical object -> {frontmatter, body}
// ---------------------------------------------------------------------------
export function toMarkdown(jsonld) {
  const obj = { ...jsonld };
  const atId = obj["@id"];
  const conceptType = obj.conceptType;
  const content = obj.content ?? "";
  stripKeys(obj, META_KEYS);
  delete obj.content;

  const id = typeof atId === "string" && atId.startsWith(ID_PREFIX)
    ? atId.slice(ID_PREFIX.length)
    : atId;

  // Reconstruct frontmatter with the human-facing keys first, then passthrough.
  const frontmatter = { id, type: conceptType, ...obj };
  return { frontmatter, body: normalizeBody(content) };
}

// ---------------------------------------------------------------------------
// lossless round-trip oracle (compares at the canonical JSON-LD layer, which is
// insensitive to YAML key order / formatting noise)
// ---------------------------------------------------------------------------
export function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== typeof b || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (typeof a !== "object") return false;
  const ka = Object.keys(a), kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  return ka.every((k) => deepEqual(a[k], b[k]));
}

// markdown -> jsonld -> markdown -> jsonld ; lossless iff the two jsonld match.
export function roundTripFromMarkdown(text) {
  const jsonld1 = toJsonld(parseMarkdown(text));
  const md2 = serializeMarkdown(...Object.values(splitDoc(toMarkdown(jsonld1))));
  const jsonld2 = toJsonld(parseMarkdown(md2));
  return { lossless: deepEqual(jsonld1, jsonld2), jsonld1, jsonld2, md2 };
}

// jsonld -> markdown -> jsonld ; lossless iff equal to the original jsonld.
export function roundTripFromJsonld(jsonld1) {
  const { frontmatter, body } = toMarkdown(jsonld1);
  const md = serializeMarkdown(frontmatter, body);
  const jsonld2 = toJsonld(parseMarkdown(md));
  return { lossless: deepEqual(jsonld1, jsonld2), jsonld1, jsonld2, md };
}

function splitDoc(d) {
  return { frontmatter: d.frontmatter, body: d.body };
}

// ---------------------------------------------------------------------------
// schema loading (from the hydrated cache) + level overlays
// ---------------------------------------------------------------------------
function schemaNotHydrated(detail) {
  const err = new Error(`schema not hydrated — run \`npm run hydrate-schema\` first (${detail})`);
  err.code = "SCHEMA_NOT_HYDRATED";
  return err;
}

export function loadValidator() {
  const lockPath = join(ROOT, "schema", "VENDOR.lock");
  if (!existsSync(lockPath)) {
    throw schemaNotHydrated(`missing ${lockPath}`);
  }
  const lock = JSON.parse(readFileSync(lockPath, "utf8"));
  const dir = join(ROOT, "schema", ".cache", lock.resolvedVersion);
  if (!existsSync(dir)) {
    throw schemaNotHydrated(`missing ${dir}`);
  }
  const mif = JSON.parse(readFileSync(join(dir, "mif.schema.json"), "utf8"));

  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);
  // register the one external $ref (entity-reference) under its canonical $id
  const entRef = join(dir, "definitions", "entity-reference.schema.json");
  if (existsSync(entRef)) {
    ajv.addSchema(JSON.parse(readFileSync(entRef, "utf8")));
  }
  const validate = ajv.compile(mif);
  return { validate, resolvedVersion: lock.resolvedVersion, hydratedAt: lock.hydratedAt };
}

export function loadLevelProfile(level) {
  const p = join(ROOT, "schema", "profiles", `level-${level}.json`);
  if (!existsSync(p)) throw new Error(`unknown MIF level: ${level}`);
  return JSON.parse(readFileSync(p, "utf8"));
}

// Returns [] when the object meets the level floor, else a list of missing fields.
export function checkLevel(jsonld, level) {
  const profile = loadLevelProfile(level);
  const missing = [];
  for (const f of profile.required || []) {
    if (jsonld[f] === undefined || jsonld[f] === null) missing.push(f);
  }
  for (const tf of profile.temporalRequired || []) {
    if (!jsonld.temporal || jsonld.temporal[tf] === undefined) {
      missing.push(`temporal.${tf}`);
    }
  }
  return missing;
}

export { ROOT };
