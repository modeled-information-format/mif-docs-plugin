#!/usr/bin/env node
// validate-plugin.mjs — deterministic structural validation of the plugin.
//
// `claude plugin validate` does not exist in the Claude Code CLI (the plugin
// subcommands are init/details/list/enable/disable/install). This script is the
// honest, deterministic substitute the suite's acceptance check #1 names: it
// validates plugin.json, marketplace.json, .mcp.json (when present), and every
// skills/<name>/SKILL.md frontmatter against the documented Claude Code
// manifest shape with ajv, and exits non-zero on any violation.
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv from "ajv";
import { load as yamlLoad } from "js-yaml";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ajv = new Ajv({ allErrors: true, strict: false });

const PLUGIN_SCHEMA = {
  type: "object",
  required: ["name", "version", "description"],
  properties: {
    name: { type: "string", pattern: "^[a-z0-9][a-z0-9-]*$" },
    version: { type: "string", pattern: "^\\d+\\.\\d+\\.\\d+" },
    description: { type: "string", minLength: 1 },
    author: { type: "object" },
    homepage: { type: "string" },
    repository: { type: "string" },
    license: { type: "string" },
    keywords: { type: "array", items: { type: "string" } },
  },
  additionalProperties: true,
};

const MARKETPLACE_SCHEMA = {
  type: "object",
  required: ["name", "owner", "plugins"],
  properties: {
    name: { type: "string" },
    description: { type: "string" },
    owner: { type: "object", required: ["name"] },
    plugins: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        required: ["name", "source", "description"],
        properties: { source: { type: "object", required: ["source"] } },
        additionalProperties: true,
      },
    },
  },
  additionalProperties: true,
};

const SKILL_FRONTMATTER_SCHEMA = {
  type: "object",
  required: ["name", "description"],
  properties: {
    name: { type: "string", pattern: "^[a-z0-9][a-z0-9-]*$" },
    description: { type: "string", minLength: 20 },
  },
  additionalProperties: true,
};

// .mcp.json declares optional MCP servers (the mif-rs mif-mcp binary). The
// config's shape is validated; the binary's presence never is — the server is
// an optional enhancement and this check must stay deterministic on machines
// (and CI runners) that do not have it installed.
const MCP_SCHEMA = {
  type: "object",
  required: ["mcpServers"],
  properties: {
    mcpServers: {
      type: "object",
      minProperties: 1,
      additionalProperties: {
        type: "object",
        required: ["command"],
        properties: {
          command: { type: "string", minLength: 1 },
          args: { type: "array", items: { type: "string" } },
          env: { type: "object" },
        },
        additionalProperties: true,
      },
    },
  },
  additionalProperties: true,
};

// Every skill must ship evals/evals.json (3-12 cases, >=2 expectations each).
const EVALS_SCHEMA = {
  type: "object",
  required: ["skill_name", "evals"],
  properties: {
    skill_name: { type: "string" },
    evals: {
      type: "array",
      minItems: 3,
      maxItems: 12,
      items: {
        type: "object",
        required: ["id", "prompt", "expected_output", "expectations"],
        properties: {
          id: { type: "integer" },
          prompt: { type: "string", minLength: 1 },
          expected_output: { type: "string", minLength: 1 },
          files: { type: "array" },
          expectations: { type: "array", minItems: 2, items: { type: "string", minLength: 1 } },
        },
        additionalProperties: true,
      },
    },
  },
  additionalProperties: true,
};

const errors = [];
const ok = [];

function check(label, schema, data) {
  const validate = ajv.compile(schema);
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
  check(".claude-plugin/plugin.json", PLUGIN_SCHEMA, plugin);
}

// 2. marketplace.json (optional but validated when present)
const marketPath = join(ROOT, ".claude-plugin", "marketplace.json");
if (existsSync(marketPath)) {
  check(".claude-plugin/marketplace.json", MARKETPLACE_SCHEMA, readJson(marketPath));
}

// 3. .mcp.json (optional but validated when present)
const mcpPath = join(ROOT, ".mcp.json");
if (existsSync(mcpPath)) {
  check(".mcp.json", MCP_SCHEMA, readJson(mcpPath));
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
      check(label, SKILL_FRONTMATTER_SCHEMA, fm);
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
        check(evalsLabel, EVALS_SCHEMA, evalsDoc);
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
