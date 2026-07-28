#!/usr/bin/env node
// mif-docs taxonomy pointer hook — SessionStart.
//
// Injects a short additionalContext pointer naming the three MIF
// conceptType buckets (semantic / episodic / procedural) and the path to
// the full explanation, so drafting starts with the right register instead
// of discovering the taxonomy only when mif-frontmatter's L1 floor comes up.
// Deliberately terse: the full voice/tense/mood/update-trigger guidance,
// grounded in this plugin's real genre catalog, lives only in
// docs/explanation/documentation-taxonomy.md — read on demand, not
// injected in full on every session.
//
// FAIL-OPEN on every error: like provenance-session-start.mjs, this hook
// may never block, delay, or alter a session. Any failure exits 0 with no
// output rather than surface a broken hook to the user.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// This file's own directory always sits under the plugin root — resolved from
// import.meta.url rather than $CLAUDE_PLUGIN_ROOT so it works identically
// whether invoked as a registered hook or run by hand, the same way
// provenance-session-start.mjs resolves hooks.json.
const HOOK_DIR = dirname(fileURLToPath(import.meta.url));
// Emitted verbatim, and deliberately absolute. The pointer is read later, from
// whatever directory the agent happens to be in — not necessarily the cwd this
// hook saw at session start — and Read takes an absolute path. Relativizing it
// against the session's cwd would bake in a reference that stops resolving the
// moment the agent moves, and reads as nonsense in the normal case where the
// plugin is installed outside the consuming project's tree entirely.
const TAXONOMY_DOC_PATH = join(HOOK_DIR, "..", "docs", "explanation", "documentation-taxonomy.md");

try {
  // Parsed only to hold the fail-open contract: a malformed or empty payload
  // throws here and the hook exits silently rather than emit into a session
  // whose stdin it could not read.
  JSON.parse(readFileSync(0, "utf8"));

  const additionalContext = [
    "mif-docs: every document declares one MIF conceptType before drafting —",
    "semantic (what is true), episodic (what happened), or procedural (what to do).",
    `Full voice/register/correction rules: ${TAXONOMY_DOC_PATH}`,
  ].join(" ");

  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "SessionStart",
        additionalContext,
      },
    }) + "\n",
  );
} catch {
  // fail open — this hook must never block, delay, or alter the session
}
process.exit(0);
