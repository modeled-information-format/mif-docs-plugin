#!/usr/bin/env node
// audit-deterministic.mjs — the zero-LLM pass of the audit-docs skill: every
// check a script can decide, decided here, once, over the whole corpus. The
// skill's Agent calls are then scoped to judgment-only checks with these
// results explicitly excluded — an Agent must never be asked to re-decide
// anything this runner already settled (the 2026-07-30 gdlc audit paid opus
// tokens to re-narrate, per file, a 315-instance link defect class a script
// had already found; this runner is the structural fix).
//
//   node scripts/audit-deterministic.mjs --paths <file-or-dir>... --report-dir <dir>
//     [--mif-level 1|2|3]         target level for the advisory mif-level-gap check (default 3)
//     [--docs-root <dir>]         docs tree root for route-aware link checking
//                                 (default: the sole directory in --paths)
//     [--site-base <b>]           Starlight site base for link checking
//     [--astro-config <f>]        read the site base from this astro config
//     [--no-routes]               skip link-integrity entirely (recorded as skipped)
//     [--checks id,id,...]        run only these deterministic checks
//     [--ledger <f>]              provenance ledger for witnessed verification
//
// Emits into <report-dir>:
//   findings/deterministic.json  mif-docs/audit-findings@1 payload
//   classes.json                 defect classes (one root cause, many instances)
//   corpus-map.json              per-file map (genre, mutability, level, dates,
//                                headings, relationships) — the cross-document
//                                Agent calls' input, so they never depend on
//                                per-file Agent output to run
// plus a human summary on stdout. Exit 0 unless the runner itself failed —
// findings are data for the audit, not a gate verdict.
import { readFileSync, mkdirSync, writeFileSync, statSync } from "node:fs";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { load as yamlLoad } from "js-yaml";

import { splitFrontmatter, isAdrCarveout } from "./lib/mif-genre-signal.mjs";
import { parseMarkdown, toJsonld, roundTripFromMarkdown, loadValidator, checkLevel } from "./lib/projection.mjs";
import {
  checkAll as checkLinks,
  readSiteBaseFromAstroConfig,
  maskFencedBlocks,
  buildRouteSet,
  listDocFiles,
  suggestFixedTarget,
} from "./lib/doc-links.mjs";
import { classifyProvenance } from "./lib/provenance-classify.mjs";
import { gitDatesOf, declaredDatesOf, detectDateClustering, checkTemporal, isShallowRepo } from "./lib/temporal-git.mjs";
import { discoverFiles, sha256, genreOfText } from "./lib/audit-state.mjs";
import { SCHEMA_ID, CHECK_IDS_BY_TIER } from "./lib/audit-findings.mjs";

const PLUGIN_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
// relationship-graph is the registry's one split check: its structural half
// (dangling targets) runs here; its semantic half stays a cross-doc Agent
// call. Hence deterministic tier + relationship-graph.
const DETERMINISTIC_CHECKS = [...CHECK_IDS_BY_TIER.deterministic, "relationship-graph"];

// ---------- argument parsing ----------
function usage(msg) {
  if (msg) console.error(`audit-deterministic: ${msg}`);
  console.error("usage: audit-deterministic.mjs --paths <p>... --report-dir <dir> [options]");
  process.exit(2);
}

function parseArgs(argv) {
  const flags = { paths: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const val = () => {
      if (i + 1 >= argv.length) usage(`${a} requires a value`);
      return argv[++i];
    };
    if (a === "--paths") {
      while (i + 1 < argv.length && !argv[i + 1].startsWith("--")) flags.paths.push(argv[++i]);
    } else if (a === "--report-dir") flags.reportDir = val();
    else if (a === "--mif-level") flags.mifLevel = Number(val());
    else if (a === "--docs-root") flags.docsRoot = val();
    else if (a === "--site-base") flags.siteBase = val();
    else if (a === "--astro-config") flags.astroConfig = val();
    else if (a === "--no-routes") flags.noRoutes = true;
    else if (a === "--checks") flags.checks = val().split(",").map((s) => s.trim()).filter(Boolean);
    else if (a === "--ledger") flags.ledger = val();
    else usage(`unknown argument "${a}"`);
  }
  if (flags.paths.length === 0) usage("--paths is required");
  if (!flags.reportDir) usage("--report-dir is required");
  if (flags.mifLevel !== undefined && ![1, 2, 3].includes(flags.mifLevel)) usage("--mif-level must be 1, 2 or 3");
  if (flags.checks) {
    const unknown = flags.checks.filter((c) => !DETERMINISTIC_CHECKS.includes(c));
    if (unknown.length) usage(`--checks contains non-deterministic or unknown ids: ${unknown.join(", ")}`);
  }
  return flags;
}

const flags = parseArgs(process.argv.slice(2));
const targetLevel = flags.mifLevel ?? 3;
const enabled = new Set(flags.checks ?? DETERMINISTIC_CHECKS);
const findings = [];
const skipped = []; // {check_id, reason} — a check that couldn't run is reported, never silent

let files;
try {
  files = discoverFiles(flags.paths);
} catch (e) {
  console.error(`audit-deterministic: ${e.message}`);
  process.exit(1);
}
if (files.length === 0) {
  console.error("audit-deterministic: no MIF documents found under the given paths");
  process.exit(1);
}

function addFinding(f) {
  findings.push({ confidence: "high", fixable: false, advisory: false, ...f });
}

// ---------- per-file parse + corpus map ----------
const IMMUTABLE_ADR_STATUSES = new Set(["accepted", "superseded", "rejected", "deprecated"]);
const EPISODIC_GENRES = new Set(["episodic", "changelog", "briefing"]);

function headingsOf(body) {
  const out = [];
  for (const [i, line] of maskFencedBlocks(body).split("\n").entries()) {
    const m = line.match(/^(#{1,6})\s+(.*)$/);
    if (m) out.push({ level: m[1].length, text: m[2].trim(), line: i + 1 });
  }
  return out;
}

const corpus = [];
for (const file of files) {
  const text = readFileSync(file, "utf8");
  const split = splitFrontmatter(text);
  const isAdr = split ? isAdrCarveout(split.fmText) : false;
  let fm = null;
  try {
    fm = split ? yamlLoad(split.fmText) : null;
  } catch {
    /* unparseable frontmatter surfaces via frontmatter-schema below */
  }
  if (fm === null || typeof fm !== "object" || Array.isArray(fm)) fm = {};
  const body = split ? split.rest : text;
  const genre = genreOfText(text);
  const status = typeof fm.status === "string" ? fm.status.toLowerCase() : null;
  let mutability = "mutable";
  if (isAdr && status && IMMUTABLE_ADR_STATUSES.has(status)) mutability = "immutable";
  else if (EPISODIC_GENRES.has(genre) || fm.conceptType === "episodic") mutability = "episodic";
  corpus.push({
    file,
    sha256: sha256(text),
    genre,
    mutability,
    adr: isAdr,
    oracle: isAdr ? "structured-madr" : "mif-validate",
    status,
    title: typeof fm.title === "string" ? fm.title : (headingsOf(body)[0]?.text ?? null),
    headings: headingsOf(body),
    relationships: Array.isArray(fm.relationships) ? fm.relationships : [],
    declared_dates: declaredDatesOf(fm),
    fm,
    body,
    text,
  });
}

// ---------- frontmatter-schema + mif-level-gap ----------
// ADR carve-out (this repo's ADR-0001, and the gdlc audit's confirmed false
// positive): `type: adr` docs are owned by the structured-madr validator, and
// this suite's mif-validate keys on conceptType — running it against an ADR
// reports a conflict that is EXPECTED, not a defect. ADRs are therefore
// routed to `oracle: structured-madr` here, never schema-checked by this
// runner, never reported as schema findings.
if (enabled.has("frontmatter-schema") || enabled.has("mif-level-gap")) {
  let validator = null;
  try {
    validator = loadValidator();
  } catch (e) {
    const reason =
      e.code === "SCHEMA_NOT_HYDRATED"
        ? "schema not hydrated — run `npm run hydrate-schema` in the mif-docs plugin"
        : `validator failed to load: ${e.message}`;
    if (enabled.has("frontmatter-schema")) skipped.push({ check_id: "frontmatter-schema", reason });
    if (enabled.has("mif-level-gap")) skipped.push({ check_id: "mif-level-gap", reason });
  }
  if (validator) {
    for (const doc of corpus) {
      if (doc.adr) {
        doc.mif_level = null; // level owned by the structured-madr projection, not this runner
        continue;
      }
      let jsonld = null;
      try {
        jsonld = toJsonld(parseMarkdown(doc.text));
      } catch (e) {
        if (enabled.has("frontmatter-schema")) {
          addFinding({
            check_id: "frontmatter-schema",
            files: [doc.file],
            severity: "high",
            summary: `cannot project to JSON-LD: ${e.message}`,
            recommendation: "Fix the frontmatter so the document parses and projects; run mif-validate for detail.",
          });
        }
        doc.mif_level = 0;
        continue;
      }
      if (enabled.has("frontmatter-schema")) {
        if (!validator.validate(jsonld)) {
          for (const err of validator.validate.errors ?? []) {
            addFinding({
              check_id: "frontmatter-schema",
              files: [doc.file],
              severity: "high",
              summary: `schema: ${err.instancePath || "(root)"} ${err.message}`,
              recommendation: "Bring the frontmatter into conformance with the canonical MIF schema (mif-validate names the field).",
            });
          }
        }
        try {
          const rt = roundTripFromMarkdown(doc.text);
          if (!rt.lossless) {
            addFinding({
              check_id: "frontmatter-schema",
              files: [doc.file],
              severity: "high",
              summary: "markdown<->JSON-LD round-trip is NOT lossless",
              recommendation: "Run mif-validate on this file and fix the fields it reports as lost in projection.",
            });
          }
        } catch (e) {
          addFinding({
            check_id: "frontmatter-schema",
            files: [doc.file],
            severity: "high",
            summary: `round-trip failed: ${e.message}`,
            recommendation: "Run mif-validate on this file for detail.",
          });
        }
      }
      // Achieved level: highest floor the doc passes (0 = fails even L1).
      let achieved = 0;
      for (const lvl of [1, 2, 3]) {
        try {
          if (checkLevel(jsonld, lvl).length === 0) achieved = lvl;
          else break;
        } catch {
          break;
        }
      }
      doc.mif_level = achieved;
      if (enabled.has("mif-level-gap") && achieved < targetLevel) {
        const missing = (() => {
          try {
            return checkLevel(jsonld, targetLevel);
          } catch {
            return [];
          }
        })();
        addFinding({
          check_id: "mif-level-gap",
          files: [doc.file],
          severity: "low",
          advisory: true, // ALWAYS advisory — an upgrade recommendation, never a failure
          summary: `at MIF L${achieved}, target L${targetLevel}${missing.length ? ` (missing: ${missing.join(", ")})` : ""}`,
          recommendation: `Add the missing L${targetLevel} fields (see mif-frontmatter skill) when the document next gets substantive attention.`,
        });
      }
    }
  }
} else {
  for (const doc of corpus) doc.mif_level = doc.adr ? null : undefined;
}

// ---------- provenance-drift ----------
// Corpus-level metadata, not per-file defects: absence of provenance at L1 is
// normal. Recorded per file in the corpus map; a ledger (when supplied)
// downgrades drifted witnessed blocks to asserted via the shared classifier.
if (enabled.has("provenance-drift")) {
  let verify = null;
  if (!flags.ledger) {
    // Marker-only classification still runs (recorded in the corpus map),
    // but DRIFT detection needs the ledger witness -- without it, "0
    // findings" must never read as "ran and clean" (review finding).
    skipped.push({
      check_id: "provenance-drift",
      reason: "no --ledger supplied: marker-only coverage recorded in corpus-map, drift detection not performed",
    });
  }
  if (flags.ledger) {
    const { verifyFile } = await import("./lib/provenance-stamp.mjs");
    const { readLedger } = await import("./lib/provenance-ledger.mjs");
    verify = { verifyFile, ledgerFile: flags.ledger, lines: readLedger(flags.ledger) };
  }
  for (const doc of corpus) {
    const c = classifyProvenance(doc.file, verify);
    doc.provenance_status = c.status;
    doc.provenance_agent = c.agent;
    if (verify && c.status === "asserted" && doc.fm?.provenance?.wasGeneratedBy) {
      addFinding({
        check_id: "provenance-drift",
        files: [doc.file],
        severity: "medium",
        summary: "provenance block carries a session stamp marker but does not verify against the ledger (drifted)",
        recommendation: "Re-stamp via mif-provenance, or correct the block to asserted provenance.",
      });
    }
  }
}

// ---------- link-integrity ----------
if (enabled.has("link-integrity")) {
  if (flags.noRoutes) {
    skipped.push({ check_id: "link-integrity", reason: "--no-routes requested" });
  } else {
    const dirPaths = flags.paths.filter((p) => {
      try {
        return statSync(p).isDirectory();
      } catch {
        return false;
      }
    });
    const docsRoot = flags.docsRoot ?? (dirPaths.length === 1 ? dirPaths[0].replace(/\/+$/, "") : null);
    let siteBase = flags.siteBase;
    if (siteBase === undefined && flags.astroConfig) siteBase = readSiteBaseFromAstroConfig(flags.astroConfig);
    if (!docsRoot) {
      skipped.push({
        check_id: "link-integrity",
        reason: "no single docs root (pass --docs-root when auditing multiple paths or single files)",
      });
    } else if (siteBase === undefined) {
      skipped.push({
        check_id: "link-integrity",
        reason: "no site base known (pass --site-base or --astro-config); route-aware checking needs the real base",
      });
    } else {
      const opts = { docsRoot, siteBase, allowNonKebab: true };
      const inScope = new Set(files);
      // Check every md/mdx under the docs root (a non-MIF page's links still
      // 404), but attribute findings only; route set covers the whole tree.
      const treeFiles = listDocFiles(opts);
      const routeSet = buildRouteSet(treeFiles, opts);
      const linkFindings = checkLinks(treeFiles, undefined, opts);
      for (const lf of linkFindings) {
        const mdSuffix = lf.target !== null && /\.mdx?([?#]|$)/.test(lf.target);
        // fixable means "one deterministic corrective action exists" -- i.e.
        // check-doc-links --write would actually repair THIS link. A
        // not-found link with no resolvable rewrite (renamed target, wrong
        // depth with no matching file) is real but manual, never fixable
        // (PR #201 review follow-up: blanket-true misled --fix into
        // spending calls on fixes that do not exist).
        const mechanicalFix =
          lf.target !== null && suggestFixedTarget(lf.file, lf.target, treeFiles, routeSet, opts) !== null;
        addFinding({
          check_id: "link-integrity",
          files: [lf.file],
          anchor: { line: lf.line, excerpt: lf.target ?? lf.detail },
          severity: lf.status === "not-found" ? "medium" : "low",
          summary:
            lf.status === "non-kebab-path"
              ? `${lf.detail} — route computed as-is (${lf.resolvedPath}); confirm this URL is deliberate`
              : `"${lf.target}" resolves to ${lf.resolvedPath} (${lf.status}) under base ${siteBase}`,
          recommendation:
            lf.status === "non-kebab-path"
              ? "Rename to lowercase-kebab-case (or index.md) if this page is meant to be routable, or stop linking to it from rendered pages."
              : mdSuffix
                ? "Rewrite to the extensionless trailing-slash route form (check-doc-links --write repairs this class mechanically)."
                : "Point the link at a real route (check the relative depth against the trailing-slash route model).",
          fixable: mechanicalFix,
          advisory: !inScope.has(lf.file), // links in non-MIF pages: report, don't count against MIF docs
        });
      }
      flags._linkOpts = { docsRoot, siteBase };
    }
  }
}

// ---------- ontology-reference ----------
if (enabled.has("ontology-reference")) {
  const ontoPath = join(PLUGIN_ROOT, "ontologies", ".cache", "mif-docs.ontology.yaml");
  let onto = null;
  try {
    onto = yamlLoad(readFileSync(ontoPath, "utf8"));
  } catch {
    skipped.push({
      check_id: "ontology-reference",
      reason: "ontology not hydrated — run `npm run hydrate-ontology` in the mif-docs plugin",
    });
  }
  if (onto) {
    const entityTypes = new Set((onto.entity_types || []).map((t) => t.name));
    const relTypes = new Set(Object.keys(onto.relationships || {}));
    const ontologyId = onto.ontology?.id;
    for (const doc of corpus) {
      const ref = doc.fm.ontology || doc.fm["x-ontology"];
      if (!ref || typeof ref !== "object") continue; // no ontology binding is not a defect
      if (ref.id && ref.id !== ontologyId) {
        addFinding({
          check_id: "ontology-reference",
          files: [doc.file],
          severity: "medium",
          summary: `ontology id "${ref.id}" does not match the resolvable ontology "${ontologyId}"`,
          recommendation: "Point the binding at a real, published ontology id.",
        });
      }
      const entityType = doc.fm.entity?.entity_type || doc.fm["x-ontology"]?.entity_type;
      if (entityType && !entityTypes.has(entityType)) {
        addFinding({
          check_id: "ontology-reference",
          files: [doc.file],
          severity: "medium",
          summary: `entity_type "${entityType}" is not defined in the ${ontologyId} ontology`,
          recommendation: `Use one of the ontology's defined entity types (${[...entityTypes].join(", ")}).`,
        });
      }
      for (const r of doc.relationships) {
        if (r?.type && !relTypes.has(r.type)) {
          addFinding({
            check_id: "ontology-reference",
            files: [doc.file],
            severity: "medium",
            summary: `relationship type "${r.type}" is not declared in the ${ontologyId} ontology`,
            recommendation: `Use a declared relationship type (${[...relTypes].join(", ")}).`,
          });
        }
      }
    }
  }
}

// ---------- temporal-metadata ----------
if (enabled.has("temporal-metadata")) {
  // A shallow clone reports the truncated tip date as every file's whole
  // history -- fabricated dates, not an oracle. Detect once and fall back
  // to declared-date-only checks, saying so (review finding, verified
  // under fetch-depth: 1).
  const firstDir = dirname(resolve(corpus[0].file));
  const shallow = isShallowRepo(firstDir);
  for (const doc of corpus) {
    const abs = resolve(doc.file);
    doc.git_dates = shallow ? null : gitDatesOf(abs, { cwd: dirname(abs) });
  }
  const withGit = corpus.filter((d) => d.git_dates).length;
  if (shallow) {
    skipped.push({
      check_id: "temporal-metadata",
      reason: "shallow git clone: git dates would be fabricated; only declared-date contradictions checked",
    });
  } else if (withGit === 0) {
    skipped.push({
      check_id: "temporal-metadata",
      reason: "no git history available for any file: only declared-date contradictions checked",
    });
  }
  const clustered = detectDateClustering(corpus.map((d) => d.git_dates?.last).filter(Boolean));
  for (const doc of corpus) {
    // Immutable-doc policy: git-drift findings are suppressed on immutable
    // records (an accepted ADR's body is not going to be edited to chase its
    // metadata); only the internal modified-before-created contradiction —
    // a defect of the record itself, fixable in frontmatter alone — is kept.
    const git = doc.mutability === "immutable" ? null : doc.git_dates;
    for (const frag of checkTemporal({ declared: doc.declared_dates, git, clustered })) {
      addFinding({ ...frag, files: [doc.file] });
    }
  }
  flags._datesClustered = clustered;
}

// ---------- structural-formatting ----------
// Deliberately NOT markdownlint over the audited tree: an unconfigured lint
// ruleset against a foreign corpus is a deterministic noise generator (the
// exact failure mode this runner exists to end), and this plugin's own docs
// already have the repo's lint:md gate. Only structural defects that broke
// real rendering/anchoring in the gdlc audit are checked: heading-level
// skips, duplicate same-file headings (anchor collisions), unclosed fences.
if (enabled.has("structural-formatting")) {
  for (const doc of corpus) {
    if (doc.mutability === "immutable") continue; // format nits on immutable docs are never actionable
    let prev = null;
    const seen = new Map();
    for (const h of doc.headings) {
      if (prev !== null && h.level > prev + 1) {
        addFinding({
          check_id: "structural-formatting",
          files: [doc.file],
          anchor: { line: h.line, excerpt: `${"#".repeat(h.level)} ${h.text}` },
          severity: "low",
          summary: `heading level skips from h${prev} to h${h.level}`,
          recommendation: "Use consecutive heading levels so the document outline nests correctly.",
          fixable: true,
        });
      }
      prev = h.level;
      const key = h.text.toLowerCase();
      if (seen.has(key)) {
        addFinding({
          check_id: "structural-formatting",
          files: [doc.file],
          anchor: { line: h.line, excerpt: h.text },
          severity: "low",
          summary: `duplicate heading "${h.text}" (first at line ${seen.get(key)}) — colliding anchors on the rendered page`,
          recommendation: "Disambiguate the headings so each anchor is unique.",
          fixable: true,
        });
      } else {
        seen.set(key, h.line);
      }
    }
    // Stateful fence scan, CommonMark-aware: a backtick fence opener's info
    // string cannot contain further backticks, so an inline 4-backtick code
    // span at line start (a real pattern in this repo's own docs) is not an
    // opener. A naive marker-parity count flagged exactly that as a false
    // positive during this runner's own development.
    let inFence = false;
    let fenceChar = null;
    let fenceLen = 0;
    let openLine = 0;
    for (const [i, line] of doc.body.split("\n").entries()) {
      const trimmed = line.trimStart();
      if (!inFence) {
        const m = trimmed.match(/^(`{3,}|~{3,})(.*)$/);
        if (m && !(m[1][0] === "`" && m[2].includes("`"))) {
          inFence = true;
          fenceChar = m[1][0];
          fenceLen = m[1].length;
          openLine = i + 1;
        }
      } else if (new RegExp(`^\\${fenceChar}{${fenceLen},}[ \\t]*$`).test(trimmed)) {
        inFence = false;
      }
    }
    if (inFence) {
      addFinding({
        check_id: "structural-formatting",
        files: [doc.file],
        anchor: { line: openLine, excerpt: `${fenceChar.repeat(fenceLen)} (unclosed)` },
        severity: "medium",
        summary: `code fence opened at body line ${openLine} is never closed and swallows the rest of the page`,
        recommendation: "Close the open code fence.",
        fixable: true,
      });
    }
  }
}

// ---------- relationship-graph (structural half) ----------
// Dangling relationship targets are decidable here; contradictory/missing
// edges (the semantic half) stay a cross-document Agent call, fed by the
// corpus map this runner emits.
if (enabled.has("relationship-graph")) {
  const fileSet = new Set(files);
  for (const doc of corpus) {
    for (const r of doc.relationships) {
      const target = r?.target ?? r?.["@id"];
      if (typeof target !== "string" || !/\.mdx?$/.test(target) || /^[a-z][a-z0-9+.-]*:/i.test(target)) continue;
      const resolved = join(dirname(doc.file), target);
      if (!fileSet.has(resolved)) {
        addFinding({
          check_id: "relationship-graph",
          files: [doc.file],
          severity: "medium",
          summary: `relationships[] target "${target}" does not resolve to a document in the audited set`,
          recommendation: "Fix the path, or remove the dangling relationship edge.",
        });
      }
    }
  }
}

// ---------- defect classes ----------
// One root cause asserted many times is ONE class with an instance list —
// never N findings re-narrated per file in any report a human reads.
function classKeyOf(f) {
  if (f.check_id === "link-integrity") {
    if (f.anchor?.excerpt && /\.mdx?([?#]|$)/.test(f.anchor.excerpt)) return "md-suffix-links";
    if (f.summary.includes("non-kebab")) return null; // singular route anomalies, not a class
    return "broken-links-other";
  }
  if (f.check_id === "mif-level-gap") return `below-target-level`;
  if (f.check_id === "structural-formatting" && f.summary.startsWith("duplicate heading")) return "duplicate-headings";
  return null;
}

const classBuckets = new Map();
for (const f of findings) {
  const key = classKeyOf(f);
  if (!key) continue;
  const id = `${f.check_id}:${key}`;
  if (!classBuckets.has(id)) classBuckets.set(id, { class_id: key, check_id: f.check_id, instances: [] });
  classBuckets.get(id).instances.push({
    file: f.files[0],
    line: f.anchor?.line ?? null,
    detail: f.anchor?.excerpt ?? f.summary,
  });
}
const classes = [];
for (const bucket of classBuckets.values()) {
  const filesInClass = new Set(bucket.instances.map((i) => i.file));
  if (bucket.instances.length >= 5 && filesInClass.size >= 3) {
    let description;
    let fix_command = null;
    if (bucket.class_id === "md-suffix-links") {
      description =
        "Internal links written GitHub-style with a .md/.mdx suffix do not resolve under the site's trailing-slash Starlight routes.";
      if (flags._linkOpts) {
        // Absolute paths on both sides: the audited tree is usually NOT this
        // plugin's repo, and a --write against a relative --docs-root
        // resolved from the wrong cwd would mutate the wrong tree.
        fix_command = `node ${join(PLUGIN_ROOT, "scripts/check-doc-links.mjs")} --docs-root ${resolve(flags._linkOpts.docsRoot)} --base ${flags._linkOpts.siteBase} --allow-non-kebab --write`;
      }
    } else if (bucket.class_id === "broken-links-other") {
      description = "Internal links that resolve to no real route (wrong relative depth or renamed targets).";
    } else if (bucket.class_id === "below-target-level") {
      description = `Documents below the target MIF level L${targetLevel} (advisory upgrade recommendation, corpus-wide).`;
    } else if (bucket.class_id === "duplicate-headings") {
      description = "Files with duplicate same-file headings producing colliding anchors on the rendered page.";
    }
    classes.push({
      class_id: bucket.class_id,
      check_id: bucket.check_id,
      description,
      instance_count: bucket.instances.length,
      file_count: filesInClass.size,
      fix_command,
      instances: bucket.instances,
    });
  }
}
classes.sort((a, b) => b.instance_count - a.instance_count);
const classedIds = new Set(classes.map((c) => `${c.check_id}:${c.class_id}`));

// ---------- outputs ----------
const reportDir = flags.reportDir;
mkdirSync(join(reportDir, "findings"), { recursive: true });

const filesWithFindings = new Set(findings.flatMap((f) => f.files));
const payload = {
  schema: SCHEMA_ID,
  batch_id: "deterministic",
  files_audited: files,
  files_clean: files.filter((f) => !filesWithFindings.has(f)),
  findings,
  skipped_checks: skipped,
};
writeFileSync(join(reportDir, "findings", "deterministic.json"), `${JSON.stringify(payload, null, 2)}\n`);
writeFileSync(join(reportDir, "classes.json"), `${JSON.stringify({ classes }, null, 2)}\n`);

const corpusMap = corpus.map((d) => ({
  file: d.file,
  sha256: d.sha256,
  genre: d.genre,
  mutability: d.mutability,
  oracle: d.oracle,
  status: d.status,
  mif_level: d.mif_level ?? null,
  title: d.title,
  headings: d.headings.map((h) => ({ level: h.level, text: h.text })),
  relationships: d.relationships,
  declared_dates: d.declared_dates,
  git_dates: d.git_dates ?? null,
  provenance: d.provenance_status ?? null,
}));
writeFileSync(
  join(reportDir, "corpus-map.json"),
  `${JSON.stringify({ schema: "mif-docs/corpus-map@1", dates_clustered: flags._datesClustered ?? null, files: corpusMap }, null, 2)}\n`,
);

// ---------- human summary ----------
const bySeverity = { high: 0, medium: 0, low: 0 };
let advisory = 0;
for (const f of findings) {
  bySeverity[f.severity]++;
  if (f.advisory) advisory++;
}
const classedInstanceCount = classes.reduce((n, c) => n + c.instance_count, 0);
console.log(`audit-deterministic: ${files.length} MIF document(s)`);
console.log(
  `  findings: ${findings.length} (high ${bySeverity.high}, medium ${bySeverity.medium}, low ${bySeverity.low}; advisory ${advisory})`,
);
console.log(
  `  defect classes: ${classes.length} covering ${classedInstanceCount} finding(s)` +
    (classes.length ? ` — ${classes.map((c) => `${c.class_id}(${c.instance_count})`).join(", ")}` : ""),
);
for (const s of skipped) console.log(`  SKIPPED ${s.check_id}: ${s.reason}`);
console.log(`  wrote: ${join(reportDir, "findings/deterministic.json")}, classes.json, corpus-map.json`);
if (classedIds.size > 0) {
  console.log("  (defect-class instances stay in deterministic.json for machines; report them once per class, never per file)");
}
