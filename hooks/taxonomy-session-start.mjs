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
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const HOOK_DIR = dirname(fileURLToPath(import.meta.url));
const TAXONOMY_DOC_PATH = join(HOOK_DIR, "..", "docs", "explanation", "documentation-taxonomy.md");

try {
  const payload = JSON.parse(readFileSync(0, "utf8"));
  const cwd = typeof payload?.cwd === "string" && payload.cwd ? payload.cwd : process.cwd();
  const docRef = relative(cwd, TAXONOMY_DOC_PATH) || TAXONOMY_DOC_PATH;

  const additionalContext = [
    "mif-docs: every document declares one MIF conceptType before drafting —",
    "semantic (what is true), episodic (what happened), or procedural (what to do).",
    `Full voice/register/correction rules: ${docRef}`,
  ].join(" ");

  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "SessionStart",
        additionalContext,
      },
    }),
  );
} catch {
  // fail open — this hook must never block, delay, or alter the session
}
process.exit(0);
