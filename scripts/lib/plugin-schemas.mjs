// plugin-schemas.mjs -- the JSON Schemas scripts/validate-plugin.mjs enforces,
// extracted so they can be exercised directly by tests. The gate script itself
// only ever validates this repo's own manifests, which are all well-formed, so
// a constraint deleted from these schemas cannot fail CI on its own; the
// negative cases in tests/plugin-schemas.test.mjs are what actually hold them.

export const PLUGIN_SCHEMA = {
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

export const MARKETPLACE_SCHEMA = {
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
        // The inner `source` key is NOT a self-reference — it is the Claude Code
        // plugin-source TYPE DISCRIMINATOR, a string naming the fetch mechanism
        // ("github", "git", "git-subdir", …) alongside its mechanism-specific
        // fields: { source: "github", repo: "owner/name" },
        // { source: "git-subdir", url: "…", path: "…" }. Requiring it is
        // deliberate; dropping it would let a `source` object that never names
        // its fetch mechanism pass the gate. Do not "simplify" this away.
        properties: {
          source: {
            type: "object",
            required: ["source"],
            properties: { source: { type: "string", minLength: 1 } },
            additionalProperties: true,
          },
        },
        additionalProperties: true,
      },
    },
  },
  additionalProperties: true,
};

export const SKILL_FRONTMATTER_SCHEMA = {
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
export const MCP_SCHEMA = {
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
          env: { type: "object", additionalProperties: { type: "string" } },
        },
        additionalProperties: true,
      },
    },
  },
  additionalProperties: true,
};

// Every skill must ship evals/evals.json (3-12 cases, >=2 expectations each).
export const EVALS_SCHEMA = {
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
