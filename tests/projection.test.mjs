// Unit tests for scripts/lib/projection.mjs's toJsonld(), focused on the two
// authoring conventions it recognizes (mif-docs-plugin#49) and the conflict
// guard added alongside that fix: a document must not silently prefer one
// convention over a disagreeing other.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toJsonld } from '../scripts/lib/projection.mjs';

function doc(frontmatter, body = '# x\n') {
  return { frontmatter, body };
}

test('accepts the plain id/type convention', () => {
  const out = toJsonld(doc({ id: 'my-doc', type: 'semantic', created: '2026-01-01T00:00:00Z' }));
  assert.equal(out['@id'], 'urn:mif:my-doc');
  assert.equal(out.conceptType, 'semantic');
});

test('accepts the canonical @id/conceptType convention', () => {
  const out = toJsonld(
    doc({ '@id': 'urn:mif:my-doc', conceptType: 'semantic', created: '2026-01-01T00:00:00Z' }),
  );
  assert.equal(out['@id'], 'urn:mif:my-doc');
  assert.equal(out.conceptType, 'semantic');
});

test('@type is never read as the source of conceptType', () => {
  const out = toJsonld(
    doc({ '@id': 'urn:mif:my-doc', '@type': 'Concept', conceptType: 'episodic', created: '2026-01-01T00:00:00Z' }),
  );
  assert.equal(out.conceptType, 'episodic', '@type ("Concept") must never leak into conceptType');
});

test('agreeing id and @id (with/without the urn:mif: prefix) is not a conflict', () => {
  const out = toJsonld(
    doc({ id: 'my-doc', '@id': 'urn:mif:my-doc', type: 'semantic', created: '2026-01-01T00:00:00Z' }),
  );
  assert.equal(out['@id'], 'urn:mif:my-doc');
});

test('agreeing id and @id (both already carrying the urn:mif: prefix) is not a conflict', () => {
  // Regression: comparing both sides bare, not just stripping @id, since
  // authoring `id` already prefixed and `@id` identically prefixed is
  // agreement, not a false-positive conflict.
  const out = toJsonld(
    doc({ id: 'urn:mif:my-doc', '@id': 'urn:mif:my-doc', type: 'semantic', created: '2026-01-01T00:00:00Z' }),
  );
  assert.equal(out['@id'], 'urn:mif:my-doc');
});

test('disagreeing id and @id is a fail-closed error, not a silent pick', () => {
  assert.throws(
    () => toJsonld(doc({ id: 'legacy-name', '@id': 'urn:mif:correct-name', type: 'semantic' })),
    /conflicting id/,
  );
});

test('disagreeing type and conceptType is a fail-closed error, not a silent pick', () => {
  assert.throws(
    () => toJsonld(doc({ id: 'my-doc', type: 'semantic', conceptType: 'episodic' })),
    /conflicting type/,
  );
});

test('no meta keys leak into the output through the passthrough spread', () => {
  const out = toJsonld(
    doc({
      '@id': 'urn:mif:my-doc',
      conceptType: 'semantic',
      '@context': 'https://not-the-canonical-context.example/ctx.jsonld',
      created: '2026-01-01T00:00:00Z',
    }),
  );
  assert.equal(out['@context'], 'https://mif-spec.dev/schema/context.jsonld', 'the canonical @context must win, not a stray frontmatter value');
});

test('a memoryType-only document projects (MIF 1.4.0) and round-trips without a synthesized type', async () => {
  const { toMarkdown } = await import('../scripts/lib/projection.mjs');
  const fm = { id: '7b3c1e90-5a2f-4c8d-9e10-2f6a4b8c1d3e', memoryType: 'semantic', created: '2026-01-01T00:00:00Z' };
  const out = toJsonld(doc({ ...fm }));
  assert.equal(out.memoryType, 'semantic');
  assert.equal('conceptType' in out, false);
  const back = toMarkdown(out);
  assert.equal('type' in back.frontmatter, false);
  assert.equal(back.frontmatter.memoryType, 'semantic');
});

test('a document with neither type nor memoryType is rejected', () => {
  assert.throws(() => toJsonld(doc({ id: 'x', created: '2026-01-01T00:00:00Z' })), /missing required field: type/);
});
