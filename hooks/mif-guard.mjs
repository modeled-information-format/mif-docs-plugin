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
// Deliberately imported from the tiny dependency-free genre-signal module,
// NOT from projection.mjs: this hook fires on EVERY Write/Edit tool call,
// even ones that early-exit, so it must not drag in projection.mjs's heavier
// transitive dependencies (ajv, ajv-formats, js-yaml) to answer a regex
// question (issue #50 review). The predicate itself is shared with the
// provenance capture hook so the two can never drift on what counts as a
// genre document.
import {
  hasGenreSignal,
  isAdrCarveout,
  splitFrontmatter,
} from '../scripts/lib/mif-genre-signal.mjs';
// spawnSync does not throw when the OS transiently fails to launch a child
// process (EAGAIN/ENOMEM/EMFILE/ENFILE under concurrent load — issue #146);
// it returns a result with `.error` set and `.status` null, which used to
// fall straight through to the generic "NOT MIF-conformant" block below,
// fail-closed BLOCKING a perfectly conformant document over a momentary
// resource hiccup rather than a real conformance problem. Retrying absorbs
// that without weakening the fail-closed guarantee: a real spawn failure
// (e.g. ENOENT) or an actual non-conformant verdict still blocks immediately.
import { spawnSyncWithRetry } from '../scripts/lib/retry-spawn.mjs';

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
//
// Detection lives in scripts/lib/mif-genre-signal.mjs, shared with the
// provenance capture hook: the genre signal must be a TOP-LEVEL frontmatter
// key (a nested `metadata:\n  type: reference` must not trigger — the
// auto-memory regression), and the structured-MADR `type: adr` genre is
// carved out exactly as CI does (validated by the structured-madr action,
// not mif-validate).
const split = splitFrontmatter(content);
const front = split ? split.fmText : '';

if (isAdrCarveout(front)) allow();
if (!split || !hasGenreSignal(front)) allow();

// 4. Validate, fail closed.
let res;
try {
  res = spawnSyncWithRetry(spawnSync, [
    'node',
    [validator, file, '--level', '1'],
    { cwd: pluginRoot, encoding: 'utf8', timeout: 55_000 },
  ]);
} catch (err) {
  block(
    `MIF fail-closed guard could not run the validator for ${file}: ${err.message}\n` +
      `Cannot confirm MIF conformance, so the write is blocked. Run \`npm ci\` in the mif-docs plugin and retry.`,
  );
}

// spawnSync itself doesn't throw for a failed launch (see the import
// comment above) — after retries are exhausted, a still-unlaunched
// validator is a real environment/tooling gap, not a conformance verdict,
// so it gets the same "could not run" message as the throw-based catch
// above rather than the generic non-conformance message below.
if (res.error) {
  block(
    `MIF fail-closed guard could not run the validator for ${file}: ${res.error.message}\n` +
      `Cannot confirm MIF conformance, so the write is blocked. Run \`npm ci\` in the mif-docs plugin and retry.`,
  );
}

if (res.status === 0) allow();

// mif-validate exits 3 specifically when the schema cache itself was never
// hydrated locally — an environment/tooling gap, not a document-conformance
// problem. Give the actual remedy instead of telling the model to fix
// frontmatter that may already be conformant.
if (res.status === 3) {
  block(
    `MIF fail-closed guard could not validate ${file}: the plugin's schema cache is not ` +
      `hydrated.\n\n${(res.stderr || res.stdout || '').trim()}\n\n` +
      `Run \`npm run hydrate-schema\` in the mif-docs plugin's install directory ` +
      `(${pluginRoot}), then retry the write.`,
  );
}

const detail = (res.stderr || res.stdout || 'mif-validate reported a failure').trim();
block(
  `MIF fail-closed guard: ${file} is NOT MIF-conformant and was blocked.\n\n` +
    `${detail}\n\n` +
    `This document was produced by a mif-docs genre and must validate against the canonical ` +
    `schema. Fix its frontmatter to pass \`mif-validate --level 1\` (mirror the genre's ` +
    `templates/good.md: the L1 floor is id + type[semantic|episodic|procedural] + created). ` +
    `If mif-validate itself failed to run rather than reporting a real conformance issue ` +
    `(e.g. a missing dependency), run \`npm ci\` in the mif-docs plugin and retry.`,
);
