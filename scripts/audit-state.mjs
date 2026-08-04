#!/usr/bin/env node
// audit-state.mjs — CLI over lib/audit-state.mjs for the audit-docs skill's
// incremental gating. Two subcommands:
//
//   status — partition the corpus into dirty (needs LLM judgment) and clean
//            (carry prior findings), printing JSON the skill reads before its
//            budget gate:
//     node scripts/audit-state.mjs status --state <state.json> \
//       --paths <file-or-dir>... [--skills-root <dir>] [--full]
//
//   commit — record this run's results back into the state file:
//     node scripts/audit-state.mjs commit --state <state.json> \
//       --paths <file-or-dir>... --results <results.json> [--plugin-version <v>]
//     (results.json: [{file, llm_verdict, finding_counts, findings_ref,
//      genre_skill_key, genre_skill_sha256}])
//
// checks_version is computed over the audit rule carriers (the skill file,
// the deterministic runner, and the finding schema) resolved relative to this
// script's own plugin root — when any of them changes, every prior verdict is
// stale and status marks the whole corpus dirty.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { loadState, partitionFiles, commitState, sha256OfFiles, discoverFiles } from "./lib/audit-state.mjs";

const PLUGIN_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

// The files whose content defines "the rules this audit ran under".
const CHECKS_VERSION_FILES = [
  join(PLUGIN_ROOT, "skills/audit-docs/SKILL.md"),
  join(PLUGIN_ROOT, "scripts/audit-deterministic.mjs"),
  join(PLUGIN_ROOT, "scripts/lib/audit-findings.mjs"),
];

function usage(msg) {
  if (msg) console.error(`audit-state: ${msg}`);
  console.error("usage: audit-state.mjs <status|commit> --state <file> --paths <p>... [options]");
  process.exit(2);
}

function parseArgs(argv) {
  const cmd = argv[0];
  if (cmd !== "status" && cmd !== "commit") usage(`unknown subcommand "${cmd ?? ""}"`);
  const flags = { cmd, paths: [] };
  for (let i = 1; i < argv.length; i++) {
    const a = argv[i];
    const val = () => {
      if (i + 1 >= argv.length) usage(`${a} requires a value`);
      return argv[++i];
    };
    if (a === "--state") flags.state = val();
    else if (a === "--paths") {
      while (i + 1 < argv.length && !argv[i + 1].startsWith("--")) flags.paths.push(argv[++i]);
    } else if (a === "--skills-root") flags.skillsRoot = val();
    else if (a === "--full") flags.full = true;
    else if (a === "--results") flags.results = val();
    else if (a === "--plugin-version") flags.pluginVersion = val();
    else usage(`unknown argument "${a}"`);
  }
  if (!flags.state) usage("--state is required");
  if (flags.paths.length === 0) usage("--paths is required");
  return flags;
}

const flags = parseArgs(process.argv.slice(2));
let files;
try {
  files = discoverFiles(flags.paths);
} catch (e) {
  console.error(`audit-state: ${e.message}`);
  process.exit(1);
}
const checksVersion = sha256OfFiles(CHECKS_VERSION_FILES);
const state = loadState(flags.state);

if (flags.cmd === "status") {
  const { dirty, clean, reasons } = partitionFiles({
    state,
    files,
    checksVersion,
    skillsRoot: flags.skillsRoot ?? join(PLUGIN_ROOT, "skills"),
    full: flags.full ?? false,
  });
  console.log(
    JSON.stringify(
      {
        schema: "mif-docs/audit-status@1",
        state_file: flags.state,
        checks_version: checksVersion,
        counts: { total: files.length, dirty: dirty.length, clean: clean.length },
        dirty,
        clean,
        reasons,
      },
      null,
      2,
    ),
  );
} else {
  if (!flags.results) usage("commit requires --results");
  const results = JSON.parse(readFileSync(flags.results, "utf8"));
  if (!Array.isArray(results)) usage("--results must be a JSON array");
  const next = commitState({
    statePath: flags.state,
    state,
    checksVersion,
    pluginVersion: flags.pluginVersion,
    files,
    results,
  });
  console.log(
    JSON.stringify(
      {
        schema: "mif-docs/audit-commit@1",
        state_file: flags.state,
        entries: Object.keys(next.entries).length,
        recorded: results.length,
      },
      null,
      2,
    ),
  );
}
