// Tests for the mif-provenance stamp/verify core (scripts/lib/provenance-stamp.mjs)
// and the CLI (scripts/mif-provenance.mjs).
//
// Pins the Story #66 requirements: witnessed-only stamping (no `confidence`,
// ever; unwitnessed owned fields omitted, never invented), decline on
// unwitnessed documents (the highest-severity defect class is provenance
// naming a session that did not touch the document), byte idempotency,
// surgical modification (only the provenance block and `modified` change),
// L2-validity preservation with lossless round-trip, and deterministic
// verify verdicts with no model in the path.

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  deriveExpected,
  highestSatisfiedLevel,
  stampFile,
  verifyFile,
  STAMP_TRUST_LEVEL,
} from "../scripts/lib/provenance-stamp.mjs";
import { readLedger } from "../scripts/lib/provenance-ledger.mjs";
import { loadValidator } from "../scripts/lib/projection.mjs";

const root = join(new URL("..", import.meta.url).pathname);
const CLI = join(root, "scripts", "mif-provenance.mjs");

// CLI spawns must not inherit this machine's ambient session id or config
// dir — fixtures control both.
function cliEnv(extra = {}) {
  const env = { ...process.env };
  delete env.CLAUDE_CODE_SESSION_ID;
  delete env.CLAUDE_CONFIG_DIR;
  return Object.assign(env, extra);
}

// An L2-conformant document (namespace + modified + temporal on top of the
// L1 floor) with no provenance block — the common pre-stamp state.
const L2_DOC = `---
id: 9c8b7a6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d
type: semantic
created: '2026-07-11T09:00:00Z'
modified: '2026-07-11T09:00:00Z'
namespace: _semantic/tests
title: Stamp Fixture
summary: Fixture document for stamp and verify tests.
tags:
  - fixture
temporal:
  '@type': TemporalMetadata
  validFrom: '2026-07-11T00:00:00Z'
  recordedAt: '2026-07-11T09:00:00Z'
---

# Stamp Fixture

Body content that must survive stamping byte-for-byte.
`;

const SESSION = "s-stamp-1";

function fixture({ doc = L2_DOC, ledgerEvents } = {}) {
  const base = mkdtempSync(join(tmpdir(), "prov-stamp-"));
  const file = join(base, "doc.md");
  writeFileSync(file, doc);
  const ledger = join(base, "session.jsonl");
  const events = ledgerEvents ?? [
    {
      v: 1,
      event: "session_start",
      sessionId: SESSION,
      ts: "2026-07-11T09:00:00.000Z",
      tool: "claude-code",
      model: "claude-test-1",
      toolVersion: null,
      source: "startup",
    },
    {
      v: 1,
      event: "file_touch",
      sessionId: SESSION,
      ts: "2026-07-11T09:05:00.000Z",
      tool: "claude-code",
      via: "Write",
      filePath: file,
    },
  ];
  writeFileSync(ledger, events.map((e) => JSON.stringify(e)).join("\n") + "\n");
  return { base, file, ledger };
}

test("stamp writes only witnessed fields, never confidence", () => {
  const { base, file, ledger } = fixture();
  try {
    const res = stampFile({ filePath: file, ledgerFile: ledger, sessionId: SESSION });
    assert.equal(res.stamped, true);
    assert.equal(res.changed, true);
    const text = readFileSync(file, "utf8");
    assert.match(text, /agent: claude-code\/claude-test-1/);
    assert.match(text, /'@id': urn:mif:activity:claude-code-session:s-stamp-1/);
    assert.match(text, /trustLevel: user_stated/);
    assert.equal(res.fields.trustLevel, STAMP_TRUST_LEVEL);
    assert.doesNotMatch(text, /confidence/, "confidence is never written under any configuration");
    assert.doesNotMatch(
      text,
      /agentVersion/,
      "an unwitnessed agentVersion is omitted, never invented",
    );
    assert.match(text, /modified: '2026-07-11T09:05:00\.000Z'/, "modified = latest witnessed touch");
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test("stamp declines when the ledger records no touch by the session", () => {
  const { base, file, ledger } = fixture();
  try {
    const before = readFileSync(file, "utf8");
    const res = stampFile({ filePath: file, ledgerFile: ledger, sessionId: "s-other" });
    assert.equal(res.stamped, false);
    assert.equal(res.reason, "unwitnessed");
    assert.equal(readFileSync(file, "utf8"), before, "a declined stamp changes nothing");
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test("stamp is idempotent: identical facts produce identical bytes", () => {
  const { base, file, ledger } = fixture();
  try {
    const first = stampFile({ filePath: file, ledgerFile: ledger, sessionId: SESSION });
    assert.equal(first.stamped, true);
    const afterFirst = readFileSync(file, "utf8");
    const second = stampFile({ filePath: file, ledgerFile: ledger, sessionId: SESSION });
    assert.equal(second.stamped, true);
    assert.equal(second.changed, false, "a re-stamp over identical facts writes nothing");
    assert.equal(readFileSync(file, "utf8"), afterFirst);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test("stamp modifies only the provenance block and the modified line", () => {
  const { base, file, ledger } = fixture();
  try {
    const before = readFileSync(file, "utf8");
    stampFile({ filePath: file, ledgerFile: ledger, sessionId: SESSION });
    const after = readFileSync(file, "utf8");
    // Strip the provenance block and the modified line from both texts; the
    // remainder must be byte-identical.
    const strip = (t) =>
      t
        .replace(/^provenance:\n(?:[ \t].*\n)*/m, "")
        .replace(/^modified: .*\n/m, "");
    assert.equal(strip(after), strip(before));
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test("a stamped L2 document remains L2-valid with a lossless round-trip", () => {
  const { base, file, ledger } = fixture();
  try {
    const { validate } = loadValidator();
    assert.equal(highestSatisfiedLevel(readFileSync(file, "utf8"), validate), 2);
    stampFile({ filePath: file, ledgerFile: ledger, sessionId: SESSION });
    const after = readFileSync(file, "utf8");
    assert.ok(
      highestSatisfiedLevel(after, validate) >= 2,
      "stamping preserved the L2 floor (round-trip losslessness is part of the level check)",
    );
    // And the repo's real gate agrees:
    const r = spawnSync("node", [join(root, "scripts", "mif-validate.mjs"), file, "--level", "2"], {
      encoding: "utf8",
      cwd: root,
    });
    assert.equal(r.status, 0, r.stdout + r.stderr);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test("stamp preserves unowned fields of an existing provenance block", () => {
  const doc = L2_DOC.replace(
    "temporal:",
    `provenance:
  '@type': Provenance
  sourceType: agent_inferred
  trustLevel: high_confidence
  agent: someone-else
  wasAttributedTo:
    '@id': https://github.com/modeled-information-format
    '@type': prov:Agent
temporal:`,
  );
  const { base, file, ledger } = fixture({ doc });
  try {
    stampFile({ filePath: file, ledgerFile: ledger, sessionId: SESSION });
    const text = readFileSync(file, "utf8");
    assert.match(text, /sourceType: agent_inferred/, "unowned fields survive");
    assert.match(text, /wasAttributedTo:/, "unowned prov nodes survive");
    assert.match(text, /agent: claude-code\/claude-test-1/, "owned fields are overwritten");
    assert.match(text, /trustLevel: user_stated/, "trustLevel is policy, not carried over");
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test("stamp declines a non-conformant document rather than stamping garbage", () => {
  const { base, file, ledger } = fixture({ doc: "---\ntype: semantic\n---\n\nNo id, no created.\n" });
  try {
    const res = stampFile({ filePath: file, ledgerFile: ledger, sessionId: SESSION });
    assert.equal(res.stamped, false);
    assert.equal(res.reason, "not-conformant");
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test("verify: match after stamp, deterministic across repeated runs", () => {
  const { base, file, ledger } = fixture();
  try {
    stampFile({ filePath: file, ledgerFile: ledger, sessionId: SESSION });
    const a = verifyFile({ filePath: file, ledgerFile: ledger, sessionId: SESSION });
    const b = verifyFile({ filePath: file, ledgerFile: ledger, sessionId: SESSION });
    assert.equal(a.verdict, "match");
    assert.deepEqual(a, b, "identical document+ledger+config yield an identical verdict");
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test("verify: a hand-altered agent is reported as drift, never restamped", () => {
  const { base, file, ledger } = fixture();
  try {
    stampFile({ filePath: file, ledgerFile: ledger, sessionId: SESSION });
    const tampered = readFileSync(file, "utf8").replace(
      "agent: claude-code/claude-test-1",
      "agent: somebody-plausible",
    );
    writeFileSync(file, tampered);
    const res = verifyFile({ filePath: file, ledgerFile: ledger, sessionId: SESSION });
    assert.equal(res.verdict, "drift");
    assert.deepEqual(
      res.diffs.map((d) => d.field),
      ["agent"],
    );
    assert.equal(readFileSync(file, "utf8"), tampered, "verify never writes");
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test("verify: an unwitnessed document is reported as such", () => {
  const { base, file, ledger } = fixture();
  try {
    const res = verifyFile({ filePath: file, ledgerFile: ledger, sessionId: "s-other" });
    assert.equal(res.verdict, "unwitnessed");
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test("CLI: exit codes 0 (stamp/match), 1 (drift), 3 (declined); unambiguous session inferred", () => {
  const { base, file, ledger } = fixture();
  try {
    // Only one session ever touched the file, so --session may be omitted.
    const stamp = spawnSync("node", [CLI, "stamp", file, "--ledger", ledger], { encoding: "utf8", env: cliEnv() });
    assert.equal(stamp.status, 0, stamp.stderr);
    assert.match(stamp.stdout, /STAMPED/);

    const match = spawnSync("node", [CLI, "verify", file, "--ledger", ledger], { encoding: "utf8", env: cliEnv() });
    assert.equal(match.status, 0, match.stderr);
    assert.match(match.stdout, /deterministic verdict/);

    writeFileSync(file, readFileSync(file, "utf8").replace("user_stated", "verified"));
    const drift = spawnSync("node", [CLI, "verify", file, "--ledger", ledger], { encoding: "utf8", env: cliEnv() });
    assert.equal(drift.status, 1);
    assert.match(drift.stderr, /trustLevel/);

    const declined = spawnSync(
      "node",
      [CLI, "stamp", file, "--ledger", ledger, "--session", "s-nobody"],
      { encoding: "utf8", env: cliEnv() },
    );
    assert.equal(declined.status, 3);
    assert.match(declined.stderr, /DECLINED \(unwitnessed\)/);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test("the latest touch's witnessed model outranks the session line's (mid-session /model switch)", () => {
  const { base, file, ledger } = fixture();
  try {
    const later = {
      v: 1,
      event: "file_touch",
      sessionId: SESSION,
      ts: "2026-07-11T10:00:00.000Z",
      tool: "claude-code",
      via: "Edit",
      filePath: file,
      model: "claude-test-2",
    };
    writeFileSync(ledger, readFileSync(ledger, "utf8") + JSON.stringify(later) + "\n");
    const expected = deriveExpected({
      lines: readLedger(ledger),
      sessionId: SESSION,
      filePath: file,
    });
    assert.equal(expected.fields.agent, "claude-code/claude-test-2");
    assert.equal(expected.modified, "2026-07-11T10:00:00.000Z");
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test("deriveExpected ignores torn ledger lines and foreign sessions", () => {
  const { base, file, ledger } = fixture();
  try {
    // Append a torn line and a foreign session's touch; neither may leak in.
    const extra =
      '{"v":1,"event":"file_touch","sessionId":"s-foreign","ts":"2026-07-11T23:00:00.000Z","filePath":"' +
      file +
      '"}\n{"torn json\n';
    writeFileSync(ledger, readFileSync(ledger, "utf8") + extra);
    const lines = readLedger(ledger);
    const expected = deriveExpected({ lines, sessionId: SESSION, filePath: file });
    assert.equal(expected.witnessed, true);
    assert.equal(
      expected.modified,
      "2026-07-11T09:05:00.000Z",
      "a foreign session's later touch must not move this session's modified",
    );
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test("CLI honors $CLAUDE_CODE_SESSION_ID — the same variable the hooks record from", () => {
  // Regression: the first draft read $CLAUDE_SESSION_ID here while the hooks
  // recorded from $CLAUDE_CODE_SESSION_ID, so the ambient fallback never fired.
  const { base, file, ledger } = fixture();
  try {
    const r = spawnSync("node", [CLI, "stamp", file, "--ledger", ledger], {
      encoding: "utf8",
      env: cliEnv({ CLAUDE_CODE_SESSION_ID: SESSION }),
    });
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /session:\s+s-stamp-1/);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test("a CRLF document is stampable (frontmatter split is shared with the projection layer)", () => {
  // Regression: the first draft's LF-only regex declared CRLF documents
  // conformant (via parseMarkdown) yet unstampable in the same call.
  const { base, file, ledger } = fixture({ doc: L2_DOC.replaceAll("\n", "\r\n") });
  try {
    const res = stampFile({ filePath: file, ledgerFile: ledger, sessionId: SESSION });
    assert.equal(res.stamped, true, JSON.stringify(res));
    assert.match(readFileSync(file, "utf8"), /trustLevel: user_stated/);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test("verify compares structurally: wasGeneratedBy key order is formatting, not drift", () => {
  const { base, file, ledger } = fixture();
  try {
    stampFile({ filePath: file, ledgerFile: ledger, sessionId: SESSION });
    const reordered = readFileSync(file, "utf8").replace(
      /  wasGeneratedBy:\n    '@id': (.*)\n    '@type': (.*)\n/,
      "  wasGeneratedBy:\n    '@type': $2\n    '@id': $1\n",
    );
    assert.notEqual(reordered, readFileSync(file, "utf8"), "the fixture reorder must apply");
    writeFileSync(file, reordered);
    const res = verifyFile({ filePath: file, ledgerFile: ledger, sessionId: SESSION });
    assert.equal(res.verdict, "match", JSON.stringify(res.diffs));
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test("stamp witnesses its own rewrite: the ledger's newest hash matches the stamped bytes", () => {
  const { base, file, ledger } = fixture();
  try {
    stampFile({ filePath: file, ledgerFile: ledger, sessionId: SESSION });
    const lines = readLedger(ledger);
    const last = lines.at(-1);
    assert.equal(last.via, "stamp");
    assert.equal(last.ts, "2026-07-11T09:05:00.000Z", "reuses the witnessed touch time (idempotency)");
    const diskHash = "sha256:" + createHash("sha256").update(readFileSync(file)).digest("hex");
    assert.equal(last.contentHash, diskHash);
    // and a second stamp appends nothing further
    stampFile({ filePath: file, ledgerFile: ledger, sessionId: SESSION });
    assert.equal(readLedger(ledger).length, lines.length);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});
