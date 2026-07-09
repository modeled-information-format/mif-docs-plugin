#!/usr/bin/env node
// doctor.mjs -- advisory check for the optional mif-rs tools (mif-cli, mif-mcp).
//
// Both binaries are an OPTIONAL enhancement (ADR-0004 keeps the Node engine
// authoritative); this script never fails the build or gate sequence, it
// only reports what it finds. Surfaced by mif-docs-plugin#39: the mif-mcp
// MCP connector failed with "Executable not found in $PATH" with no earlier
// signal that the binary had never actually been installed, even though the
// .mcp.json registration and install docs were already in place.
//
//   npm run doctor
import { execFileSync } from "node:child_process";
import { findOnPath, compareVersions } from "./lib/doctor.mjs";

// mif-mcp is a stdio MCP server with no CLI surface at all: any invocation,
// --version included, just starts the MCP handshake loop, which fails fast
// on closed stdin (confirmed empirically, does not hang) rather than
// printing a version. That is expected, not a problem -- unlike mif-cli,
// which normally prints a version, so a --version failure there is a real
// signal worth flagging differently (corrupted binary, incompatible build).
const BINARIES = [
  { name: "mif-cli", hasVersionFlag: true },
  { name: "mif-mcp", hasVersionFlag: false },
];
const REPO = "modeled-information-format/mif-rs";
const INSTALL_HOWTO = "docs/how-to/install-the-optional-mif-mcp-server.md";

function localVersion(path) {
  try {
    // stdio is fully piped so a subprocess's own stderr (mif-mcp always
    // prints one) never leaks into this script's output; timeout is a
    // defensive backstop in case a future build waits instead of failing fast.
    return execFileSync(path, ["--version"], {
      encoding: "utf8",
      timeout: 5000,
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch {
    return null;
  }
}

function latestReleaseTag() {
  try {
    return execFileSync(
      "gh",
      ["release", "view", "--repo", REPO, "--json", "tagName", "-q", ".tagName"],
      { encoding: "utf8", timeout: 5000, stdio: ["ignore", "pipe", "pipe"] },
    ).trim();
  } catch {
    return null; // gh missing, unauthenticated, or offline -- advisory only, skip staleness
  }
}

console.log("mif-docs doctor -- optional mif-rs tooling (advisory only, never fails a gate)\n");

const latest = latestReleaseTag();
let anyMissing = false;

for (const { name: bin, hasVersionFlag } of BINARIES) {
  const path = findOnPath(bin);
  if (!path) {
    anyMissing = true;
    console.log(`  ${bin}: NOT FOUND on PATH`);
    continue;
  }
  const version = localVersion(path);
  let line;
  if (version) {
    line = `  ${bin}: ${path} -- ${version}`;
  } else if (hasVersionFlag) {
    line = `  ${bin}: ${path} -- VERSION CHECK FAILED (binary found but --version errored; may be corrupted or incompatible)`;
  } else {
    line = `  ${bin}: ${path} -- no version info (this binary has no --version output by design)`;
  }
  const cmp = compareVersions(version, latest);
  if (cmp?.stale) line += `  (STALE: latest release is ${latest})`;
  else if (cmp?.relation === "ahead") line += `  (ahead of latest release ${latest}, e.g. a local dev build)`;
  console.log(line);
}

if (latest === null) {
  console.log(`\n  (could not resolve the latest ${REPO} release -- gh missing, unauthenticated, or offline; skipping staleness check)`);
}

if (anyMissing) {
  console.log(`\nInstall the missing binaries: see ${INSTALL_HOWTO}`);
}

console.log("\nBoth tools are optional; this check is advisory and always exits 0.");
process.exit(0);
