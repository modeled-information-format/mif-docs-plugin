// Regression for issue #186: validate-plugin never inspected commands/ or
// agents/, so a malformed command frontmatter (bad YAML, missing description,
// invalid allowed-tools) passed the gate silently. These tests hold the two
// new frontmatter schemas with negative cases, and run the gate script itself
// against fixture trees to prove the blindspot is closed end to end — the
// integration cases below exit 0 under the pre-#186 script and must exit
// non-zero now.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import Ajv from 'ajv';
import {
  COMMAND_FRONTMATTER_SCHEMA,
  AGENT_FRONTMATTER_SCHEMA,
} from '../scripts/lib/plugin-schemas.mjs';

const ajv = new Ajv({ allErrors: true, strict: false });
const validateCommand = ajv.compile(COMMAND_FRONTMATTER_SCHEMA);
const validateAgent = ajv.compile(AGENT_FRONTMATTER_SCHEMA);

// --- COMMAND_FRONTMATTER_SCHEMA unit cases ---

test('command: accepts the minimal documented shape', () => {
  assert.equal(validateCommand({ description: 'Audit MIF documents under a path' }), true);
});

test('command: accepts the full documented field set', () => {
  assert.equal(
    validateCommand({
      description: 'Audit MIF documents under a path',
      'argument-hint': '[path]',
      'allowed-tools': 'Read, Grep, Bash(npm run mif-validate:*)',
      model: 'sonnet',
      'disable-model-invocation': true,
    }),
    true,
  );
});

test('command: accepts allowed-tools as a YAML list of strings', () => {
  assert.equal(
    validateCommand({ description: 'A command', 'allowed-tools': ['Read', 'Grep'] }),
    true,
  );
});

// `argument-hint: [message]` — the documented bracket syntax for an optional
// argument — is a YAML flow sequence, so js-yaml hands the schema an array.
// A string-only constraint here would fail the gate on a valid command file.
test('command: accepts argument-hint as the YAML list the bracket syntax parses to', () => {
  assert.equal(
    validateCommand({ description: 'A command', 'argument-hint': ['message'] }),
    true,
  );
});

test('command: rejects an empty argument-hint list', () => {
  assert.equal(validateCommand({ description: 'A command', 'argument-hint': [] }), false);
});

test('command: rejects an argument-hint list holding an empty string', () => {
  assert.equal(validateCommand({ description: 'A command', 'argument-hint': [''] }), false);
});

test('command: rejects a missing description', () => {
  assert.equal(validateCommand({ 'argument-hint': '[path]' }), false);
});

test('command: rejects an empty description', () => {
  assert.equal(validateCommand({ description: '' }), false);
});

test('command: rejects a non-string allowed-tools scalar', () => {
  assert.equal(validateCommand({ description: 'A command', 'allowed-tools': 42 }), false);
});

test('command: rejects an allowed-tools list holding an empty string', () => {
  assert.equal(validateCommand({ description: 'A command', 'allowed-tools': ['Read', ''] }), false);
});

test('command: rejects a non-boolean disable-model-invocation', () => {
  assert.equal(
    validateCommand({ description: 'A command', 'disable-model-invocation': 'yes' }),
    false,
  );
});

// --- AGENT_FRONTMATTER_SCHEMA unit cases ---

test('agent: accepts a well-formed agent frontmatter', () => {
  assert.equal(
    validateAgent({
      name: 'doc-auditor',
      description: 'Audits MIF documents for frontmatter conformance and taxonomy alignment',
      tools: 'Read, Grep',
      model: 'sonnet',
      color: 'cyan',
    }),
    true,
  );
});

test('agent: rejects a missing name', () => {
  assert.equal(
    validateAgent({ description: 'Audits MIF documents for frontmatter conformance' }),
    false,
  );
});

test('agent: rejects an uppercase name', () => {
  assert.equal(
    validateAgent({
      name: 'DocAuditor',
      description: 'Audits MIF documents for frontmatter conformance',
    }),
    false,
  );
});

test('agent: rejects a description below the 20-character triggering floor', () => {
  assert.equal(validateAgent({ name: 'doc-auditor', description: 'too short' }), false);
});

// --- gate-script integration cases (the actual #186 blindspot) ---

const SCRIPT = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'scripts',
  'validate-plugin.mjs',
);

function runGate(root) {
  try {
    execFileSync(process.execPath, [SCRIPT, root], { encoding: 'utf8' });
    return { code: 0 };
  } catch (e) {
    return { code: e.status, output: `${e.stdout ?? ''}${e.stderr ?? ''}` };
  }
}

function fixture(files) {
  const root = mkdtempSync(join(tmpdir(), 'validate-plugin-186-'));
  mkdirSync(join(root, '.claude-plugin'), { recursive: true });
  writeFileSync(
    join(root, '.claude-plugin', 'plugin.json'),
    JSON.stringify({ name: 'fixture', version: '0.0.1', description: 'fixture plugin' }),
  );
  for (const [rel, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, rel)), { recursive: true });
    writeFileSync(join(root, rel), content);
  }
  return root;
}

test('gate: a well-formed command passes', () => {
  const root = fixture({
    'commands/audit.md': '---\ndescription: Audit MIF documents\nargument-hint: "[path]"\n---\n\nDo the audit.\n',
  });
  try {
    assert.equal(runGate(root).code, 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// End-to-end guard for the same bracket-syntax trap: this fixture is the
// frontmatter block from Claude Code's own documented slash-command example,
// verbatim and unquoted. It must pass the gate.
test('gate: the documented command frontmatter, with an unquoted bracket argument-hint, passes', () => {
  const root = fixture({
    'commands/commit.md':
      '---\nallowed-tools: Bash(git add:*), Bash(git status:*)\nargument-hint: [message]\ndescription: Create a git commit\n---\n\nCommit it.\n',
  });
  try {
    const r = runGate(root);
    assert.equal(r.code, 0, r.output);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('gate: malformed command YAML frontmatter fails (the #186 repro)', () => {
  const root = fixture({
    'commands/broken.md': '---\ndescription: [unclosed\n---\n\nBody.\n',
  });
  try {
    const r = runGate(root);
    assert.equal(r.code, 1);
    assert.match(r.output, /commands\/broken\.md/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('gate: a command missing description fails, including in a namespaced subdir', () => {
  const root = fixture({
    'commands/ns/nodesc.md': '---\nargument-hint: "[path]"\n---\n\nBody.\n',
  });
  try {
    const r = runGate(root);
    assert.equal(r.code, 1);
    assert.match(r.output, /commands\/ns\/nodesc\.md/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('gate: a command with no frontmatter at all fails', () => {
  const root = fixture({ 'commands/bare.md': 'Just a prompt body.\n' });
  try {
    const r = runGate(root);
    assert.equal(r.code, 1);
    assert.match(r.output, /commands\/bare\.md: missing YAML frontmatter/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// The name comparison is against the FILE BASENAME, never a path-prefixed
// string: a nested agent whose name matches its own filename must pass. The
// gate reports POSIX-style labels on every platform, which is what the
// `assert.match` path patterns throughout this file pin. (The Windows
// separator case that motivated both is not reproducible on a POSIX runner.)
test('gate: an agent in a subdirectory is matched on its basename, not its path', () => {
  const root = fixture({
    'agents/nested/auditor.md':
      '---\nname: auditor\ndescription: Audits documents for conformance and quality\n---\n\nYou are an auditor.\n',
  });
  try {
    const r = runGate(root);
    assert.equal(r.code, 0, r.output);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('gate: an agent whose frontmatter name mismatches its filename fails', () => {
  const root = fixture({
    'agents/reviewer.md':
      '---\nname: auditor\ndescription: Reviews documents for conformance and quality\n---\n\nYou are a reviewer.\n',
  });
  try {
    const r = runGate(root);
    assert.equal(r.code, 1);
    assert.match(r.output, /agents\/reviewer\.md: frontmatter name "auditor" != file "reviewer"/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('gate: a well-formed agent passes', () => {
  const root = fixture({
    'agents/auditor.md':
      '---\nname: auditor\ndescription: Audits documents for conformance and quality\n---\n\nYou are an auditor.\n',
  });
  try {
    assert.equal(runGate(root).code, 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
