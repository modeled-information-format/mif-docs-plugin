// Regression: MARKETPLACE_SCHEMA accepts a plugin entry's `source` in both
// Claude Code marketplace forms — a bare non-empty string (local-path
// shorthand) or an object carrying a nested `source` string — the Claude Code
// plugin-source TYPE DISCRIMINATOR naming the fetch mechanism ("github",
// "git", "git-subdir", …) that sits alongside that mechanism's own fields. It
// reads like a self-reference and has already been mistaken for a copy-paste
// bug once and "simplified" to `additionalProperties: true` (the JSON Schema
// default), which left the subschema enforcing nothing beyond
// `type: "object"`.
//
// That regression could not fail CI on its own: validate-plugin.mjs only ever
// validates this repo's own .claude-plugin/marketplace.json, which does carry
// the discriminator, so the gate stayed green while the constraint it exists to
// enforce was gone. These negative cases are what actually hold the constraint.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import Ajv from 'ajv';
import { MARKETPLACE_SCHEMA } from '../scripts/lib/plugin-schemas.mjs';

const validate = new Ajv({ allErrors: true, strict: false }).compile(MARKETPLACE_SCHEMA);

const marketplace = (source) => ({
  name: 'mif-docs',
  owner: { name: 'modeled-information-format' },
  plugins: [{ name: 'mif-docs', description: 'a plugin', source }],
});

test('accepts the github source form this repo actually ships', () => {
  assert.equal(
    validate(marketplace({ source: 'github', repo: 'modeled-information-format/mif-docs-plugin' })),
    true,
  );
});

test('accepts the git-subdir source form the org marketplaces ship', () => {
  assert.equal(
    validate(
      marketplace({
        source: 'git-subdir',
        url: 'https://github.com/modeled-information-format/gdlc.git',
        path: 'plugins/github-sdlc-planning',
      }),
    ),
    true,
  );
});

test('accepts the string-shorthand local-path source form', () => {
  assert.equal(validate(marketplace('./packs/channels/book')), true);
});

test('rejects an empty-string shorthand source', () => {
  assert.equal(validate(marketplace('')), false);
});

test('rejects a non-string non-object source', () => {
  assert.equal(validate(marketplace(42)), false);
});

test('rejects a source object that never names its fetch mechanism', () => {
  assert.equal(validate(marketplace({ repo: 'modeled-information-format/mif-docs-plugin' })), false);
});

test('rejects an empty source object', () => {
  assert.equal(validate(marketplace({})), false);
});

test('rejects a non-string discriminator', () => {
  assert.equal(validate(marketplace({ source: 42, repo: 'a/b' })), false);
});

test('rejects an empty-string discriminator', () => {
  assert.equal(validate(marketplace({ source: '', repo: 'a/b' })), false);
});
