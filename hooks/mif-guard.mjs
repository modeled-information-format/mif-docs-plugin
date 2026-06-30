#!/usr/bin/env node
// MIF fail-closed guard (PostToolUse on Write|Edit|MultiEdit).
//
// The mif-docs plugin advertises MIF-conformant output. This hook enforces that
// promise: when a genre document is written, it is validated against the
// canonical schema with `mif-validate --level 1`. If it is not conformant the
// hook exits 2, which feeds the failure back to the model so it MUST fix the
// document before proceeding. There is no fail-open path: a genre doc that
// cannot be proven conformant is blocked.
//
// A file is GUARDED only when it is a markdown file whose frontmatter carries a
// document-genre signal (a MIF `type`/`ontology`/`entity_type` block, or the
// legacy `diataxis_type` marker). Plain markdown with no genre frontmatter
// (READMEs, notes) is left alone.

import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const pluginRoot = resolve(here, '..');
const validator = join(pluginRoot, 'scripts', 'mif-validate.mjs');

function allow() {
  process.exit(0);
}

function block(message) {
  // exit 2 => Claude Code feeds stderr back to the model as a blocking error.
  process.stderr.write(message + '\n');
  process.exit(2);
}

// 1. Read the PostToolUse payload. If we cannot, do not interfere.
let payload;
try {
  payload = JSON.parse(readFileSync(0, 'utf8'));
} catch {
  allow();
}

const file = payload?.tool_input?.file_path;
if (typeof file !== 'string' || !file.endsWith('.md')) allow();

// 2. Read the just-written file. If it is gone, nothing to validate.
let content;
try {
  content = readFileSync(file, 'utf8');
} catch {
  allow();
}

// 3. Guard only genre documents (those that should be MIF).
const fm = content.match(/^---\n([\s\S]*?)\n---/);
const front = fm ? fm[1] : '';

// The `adr` genre is intentionally structured-MADR (`type: adr`) and is
// validated by the structured-madr action, NOT by mif-validate (which keys on
// conceptType). Skip it here exactly as CI does, so the guard never false-blocks
// a conformant ADR.
if (/(^|\n)[ \t]*type[ \t]*:[ \t]*adr\b/.test(front)) allow();

const genreSignal =
  !!fm &&
  (/(^|\n)[ \t]*(diataxis_type|entity_type|x-ontology|conceptType|ontology)[ \t]*:/.test(front) ||
    /(^|\n)[ \t]*type[ \t]*:[ \t]*(semantic|episodic|procedural|tutorial|how-to|reference|explanation|runbook|playbook|changelog|decision-record)\b/.test(
      front,
    ));
if (!genreSignal) allow();

// 4. Validate, fail closed.
let res;
try {
  res = spawnSync('node', [validator, file, '--level', '1'], {
    cwd: pluginRoot,
    encoding: 'utf8',
    timeout: 55_000,
  });
} catch (err) {
  block(
    `MIF fail-closed guard could not run the validator for ${file}: ${err.message}\n` +
      `Cannot confirm MIF conformance, so the write is blocked. Run \`npm ci\` in the mif-docs plugin and retry.`,
  );
}

if (res.status === 0) allow();

const detail = (res.stderr || res.stdout || 'mif-validate reported a failure').trim();
block(
  `MIF fail-closed guard: ${file} is NOT MIF-conformant and was blocked.\n\n` +
    `${detail}\n\n` +
    `This document was produced by a mif-docs genre and must validate against the canonical ` +
    `schema. Fix its frontmatter to pass \`mif-validate --level 1\` (mirror the genre's ` +
    `templates/good.md: the L1 floor is id + type[semantic|episodic|procedural] + created). ` +
    `If the error is about missing tooling, run \`npm ci\` in the mif-docs plugin first.`,
);
