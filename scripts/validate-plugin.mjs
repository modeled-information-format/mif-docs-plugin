#!/usr/bin/env node
// validate-plugin.mjs — deterministic structural validation of the plugin.
//
// `claude plugin validate` does not exist in the Claude Code CLI (the plugin
// subcommands are init/details/list/enable/disable/install). This script is the
// honest, deterministic substitute the suite's acceptance check #1 names: it
// validates plugin.json, marketplace.json and .mcp.json (both when present),
// and every skills/<name>/SKILL.md frontmatter plus its evals/evals.json
// against the documented Claude Code manifest shape with ajv, and exits
// non-zero on any violation.
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv from "ajv";
import { load as yamlLoad } from "js-yaml";
import {
  PLUGIN_SCHEMA,
  MARKETPLACE_SCHEMA,
  SKILL_FRONTMATTER_SCHEMA,
  MCP_SCHEMA,
  EVALS_SCHEMA,
} from "./lib/plugin-schemas.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ajv = new Ajv({ allErrors: true, strict: false });

const validatePluginSchema = ajv.compile(PLUGIN_SCHEMA);
const validateMarketplaceSchema = ajv.compile(MARKETPLACE_SCHEMA);
const validateSkillFrontmatterSchema = ajv.compile(SKILL_FRONTMATTER_SCHEMA);
const validateMcpSchema = ajv.compile(MCP_SCHEMA);
const validateEvalsSchema = ajv.compile(EVALS_SCHEMA);

const errors = [];
const ok = [];

function check(label, validate, data) {
  if (validate(data)) {
    ok.push(label);
  } else {
    for (const e of validate.errors) {
      errors.push(`${label}: ${e.instancePath || "(root)"} ${e.message}`);
    }
  }
}

function readJson(p) {
  return JSON.parse(readFileSync(p, "utf8"));
}

function parseFrontmatter(p) {
  const text = readFileSync(p, "utf8");
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  if (!m) throw new Error("missing YAML frontmatter");
  return yamlLoad(m[1]);
}

// 1. plugin.json
const pluginPath = join(ROOT, ".claude-plugin", "plugin.json");
let pluginName = null;
if (!existsSync(pluginPath)) {
  errors.push(".claude-plugin/plugin.json: missing");
} else {
  const plugin = readJson(pluginPath);
  pluginName = plugin.name;
  check(".claude-plugin/plugin.json", validatePluginSchema, plugin);
}

// 2. marketplace.json (optional but validated when present)
const marketPath = join(ROOT, ".claude-plugin", "marketplace.json");
if (existsSync(marketPath)) {
  check(".claude-plugin/marketplace.json", validateMarketplaceSchema, readJson(marketPath));
}

// 3. .mcp.json (optional but validated when present)
const mcpPath = join(ROOT, ".mcp.json");
if (existsSync(mcpPath)) {
  try {
    check(".mcp.json", validateMcpSchema, readJson(mcpPath));
  } catch (e) {
    errors.push(`.mcp.json: ${e.message}`);
  }
}

// 4. every skills/<name>/SKILL.md
const skillsDir = join(ROOT, "skills");
let skillCount = 0;
if (existsSync(skillsDir)) {
  for (const entry of readdirSync(skillsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const skillMd = join(skillsDir, entry.name, "SKILL.md");
    const label = `skills/${entry.name}/SKILL.md`;
    if (!existsSync(skillMd)) {
      errors.push(`${label}: missing`);
      continue;
    }
    skillCount++;
    try {
      const fm = parseFrontmatter(skillMd);
      check(label, validateSkillFrontmatterSchema, fm);
      if (fm.name && fm.name !== entry.name) {
        errors.push(`${label}: frontmatter name "${fm.name}" != dir "${entry.name}"`);
      }
    } catch (e) {
      errors.push(`${label}: ${e.message}`);
    }

    // every skill must ship evals/evals.json
    const evalsPath = join(skillsDir, entry.name, "evals", "evals.json");
    const evalsLabel = `skills/${entry.name}/evals/evals.json`;
    if (!existsSync(evalsPath)) {
      errors.push(`${evalsLabel}: missing (all skills must have evals)`);
    } else {
      try {
        const evalsDoc = readJson(evalsPath);
        check(evalsLabel, validateEvalsSchema, evalsDoc);
        if (evalsDoc.skill_name && evalsDoc.skill_name !== entry.name) {
          errors.push(`${evalsLabel}: skill_name "${evalsDoc.skill_name}" != dir "${entry.name}"`);
        }
      } catch (e) {
        errors.push(`${evalsLabel}: ${e.message}`);
      }
    }
  }
}

console.log(`plugin: ${pluginName ?? "(unknown)"}  skills validated: ${skillCount}  passed: ${ok.length}  errors: ${errors.length}`);
if (errors.length) {
  console.error("\nVALIDATION FAILED:");
  for (const e of errors) console.error("  - " + e);
  process.exit(1);
}
console.log("OK — plugin manifest, marketplace, and all SKILL.md frontmatter valid.");
