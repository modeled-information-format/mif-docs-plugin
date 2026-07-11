// Tests for the mifProvenance config resolver (scripts/lib/provenance-config.mjs).
//
// The resolver is the consent surface for the whole mif-provenance helper
// (ADR-0005), so these tests pin the contract's load-bearing properties:
// both directions of the refusal-wins carve-out, the fail-closed posture on
// malformed input, the all-defaults case, and determinism.

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { resolveProvenanceConfig, PROVENANCE_DEFAULTS } from "../scripts/lib/provenance-config.mjs";

// Build an isolated { home, cwd } pair; `files` maps scope name -> settings
// object (or a raw string, written verbatim, for malformed-JSON cases).
function fixture(files = {}) {
  const root = mkdtempSync(join(tmpdir(), "prov-config-"));
  const home = join(root, "home");
  const cwd = join(root, "project");
  mkdirSync(join(home, ".claude"), { recursive: true });
  mkdirSync(join(cwd, ".claude"), { recursive: true });
  const paths = {
    user: join(home, ".claude", "settings.local.json"),
    project: join(cwd, ".claude", "settings.json"),
    projectLocal: join(cwd, ".claude", "settings.local.json"),
  };
  for (const [scope, content] of Object.entries(files)) {
    writeFileSync(paths[scope], typeof content === "string" ? content : JSON.stringify(content));
  }
  return { root, home, cwd };
}

function resolveWith(files) {
  const { root, home, cwd } = fixture(files);
  try {
    return resolveProvenanceConfig({ cwd, home });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("no settings anywhere resolves to the built-in off/off defaults", () => {
  assert.deepEqual(resolveWith({}), { capture: false, stamp: "off" });
  assert.deepEqual(PROVENANCE_DEFAULTS, { capture: false, stamp: "off" });
});

test("project-shared enable + personal disable resolves disabled (refusal wins)", () => {
  const cfg = resolveWith({
    project: { mifProvenance: { capture: true, stamp: "auto" } },
    user: { mifProvenance: { capture: false, stamp: "off" } },
  });
  assert.deepEqual(cfg, { capture: false, stamp: "off" });
});

test("personal disable + project-local enable resolves disabled (carve-out is direction-symmetric)", () => {
  const cfg = resolveWith({
    user: { mifProvenance: { capture: false } },
    projectLocal: { mifProvenance: { capture: true, stamp: "ask" } },
  });
  assert.equal(cfg.capture, false, "a refusal is absolute regardless of scope precedence");
  assert.equal(cfg.stamp, "ask", "the stamp key was never refused, so its enable stands");
});

test("explicit stamp off at one scope defeats auto at every other scope", () => {
  const cfg = resolveWith({
    user: { mifProvenance: { stamp: "off" } },
    projectLocal: { mifProvenance: { capture: true, stamp: "auto" } },
  });
  assert.deepEqual(cfg, { capture: true, stamp: "off" });
});

test("malformed JSON at any scope contributes refusal, never enablement", () => {
  const cfg = resolveWith({
    project: { mifProvenance: { capture: true, stamp: "auto" } },
    projectLocal: "{ this is not json",
  });
  assert.deepEqual(
    cfg,
    { capture: false, stamp: "off" },
    "an unreadable consent surface fails closed for the whole config",
  );
});

test("a wrong-shaped mifProvenance value fails closed to refusal", () => {
  assert.deepEqual(
    resolveWith({
      project: { mifProvenance: { capture: true } },
      user: { mifProvenance: "yes please" },
    }),
    { capture: false, stamp: "off" },
  );
  assert.deepEqual(
    resolveWith({ project: { mifProvenance: { capture: "true", stamp: "auto" } } }),
    { capture: false, stamp: "auto" },
    "a wrong-typed capture value refuses that key without inventing an enable",
  );
  assert.deepEqual(
    resolveWith({ project: { mifProvenance: { capture: true, stamp: "always" } } }),
    { capture: true, stamp: "off" },
    "an unknown stamp mode refuses that key",
  );
});

test("non-refusal stamp values follow scope precedence (project-local > project > user)", () => {
  const cfg = resolveWith({
    user: { mifProvenance: { capture: true, stamp: "ask" } },
    projectLocal: { mifProvenance: { stamp: "auto" } },
  });
  assert.deepEqual(cfg, { capture: true, stamp: "auto" });
});

test("a settings file without the mifProvenance key contributes nothing", () => {
  const cfg = resolveWith({
    user: { theme: "dark" },
    project: { mifProvenance: { capture: true } },
  });
  assert.deepEqual(cfg, { capture: true, stamp: "off" });
});

test("resolution is deterministic over identical file contents", () => {
  const files = {
    user: { mifProvenance: { stamp: "ask" } },
    project: { mifProvenance: { capture: true } },
  };
  const a = resolveWith(files);
  const b = resolveWith(files);
  assert.deepEqual(a, b);
});
