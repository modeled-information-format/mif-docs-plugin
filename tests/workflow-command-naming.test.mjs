// Regression test for mif-docs-plugin#191: Claude Code auto-registers a plugin's
// workflows/*.js files as slash commands/skills under /<plugin>:<meta.name>. A workflow
// sharing its meta.name with a hand-authored commands/*.md file of the same base name gets
// silently shadowed by the auto-registered workflow — the command's --help, argument-hint,
// and any other body logic become unreachable dead code, exactly what happened to
// commands/audit-docs.md against workflows/audit-docs.js (renamed to audit-docs-engine.js
// in the fix for #191). This test fails if that collision is ever reintroduced, for
// audit-docs or any future command/workflow pair in this plugin.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const repoRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

function commandBasenames() {
  const dir = path.join(repoRoot, 'commands');
  return readdirSync(dir)
    .filter(f => f.endsWith('.md'))
    .map(f => f.slice(0, -'.md'.length));
}

// workflows/*.js are dynamic Workflow-tool scripts, not importable ES modules (see the
// comment at the top of audit-docs-workflow.test.mjs) — extract meta.name by text scan
// instead of import.
function workflowMetaNames() {
  const dir = path.join(repoRoot, 'workflows');
  return readdirSync(dir)
    .filter(f => f.endsWith('.js'))
    .map(f => {
      const source = readFileSync(path.join(dir, f), 'utf8');
      const metaStart = source.indexOf('export const meta');
      assert.notEqual(metaStart, -1, `${f} has no 'export const meta' — every workflow script must declare one`);
      const metaChunk = source.slice(metaStart, metaStart + 500);
      const match = metaChunk.match(/name:\s*['"]([^'"]+)['"]/);
      assert.ok(match, `${f}'s meta object has no name: '...'/"..." within the first 500 chars after 'export const meta'`);
      return { file: f, name: match[1] };
    });
}

test('no workflow meta.name collides with a command basename in the same plugin', () => {
  const commands = new Set(commandBasenames());
  const workflows = workflowMetaNames();
  const collisions = workflows.filter(w => commands.has(w.name));
  assert.deepEqual(
    collisions,
    [],
    'Claude Code auto-registers plugin workflows as /<plugin>:<meta.name>, which silently ' +
    'shadows a commands/<name>.md file of the same base name (mif-docs-plugin#191) — rename ' +
    'the colliding workflow (both its filename and meta.name) to something distinct from ' +
    'every command name in this plugin.'
  );
});
