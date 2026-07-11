// provenance-ledger.mjs — shared access to the session ledger the capture
// hooks write and the mif-provenance verbs read. The ledger format is a
// documented contract (docs/reference/provenance-ledger.md): one JSON object
// per line, append-only, under the repository's own git directory so it is
// never committed and never leaves the machine.
//
// Kept dependency-light on purpose: the capture hooks import this module on
// every qualifying tool call, so it must not pull in ajv/js-yaml the way the
// projection module does (same discipline as hooks/mif-guard.mjs).

import {
  appendFileSync,
  closeSync,
  mkdirSync,
  openSync,
  readFileSync,
  readSync,
  realpathSync,
  statSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { hostname, release, userInfo } from "node:os";
import { basename, dirname, isAbsolute, join, resolve } from "node:path";

const LEDGER_VERSION = 1;
export const ACTIVITY_URN_PREFIX = "urn:mif:activity:claude-code-session:";

// The ONE environment variable name for the ambient session id — the same
// name on both sides of the ledger (capture hooks and CLI verbs), because
// two spellings of the same fact is how a documented fallback silently never
// fires (review finding on the first draft).
export const SESSION_ENV_VAR = "CLAUDE_CODE_SESSION_ID";

// Payload-field sanitizer shared by every ledger writer and the stamp
// derivation: a witnessed value is a non-empty string; everything else is
// null, never a guess.
export function strOrNull(v) {
  return typeof v === "string" && v !== "" ? v : null;
}

// Canonical form used everywhere a recorded path meets a queried path:
// resolve to absolute, then flatten symlink aliases when the file exists
// (macOS /tmp vs /private/tmp is the classic). A deleted file falls back to
// the resolved form — both sides degrade identically.
export function canonicalPath(p) {
  const abs = resolve(p);
  try {
    return realpathSync.native ? realpathSync.native(abs) : realpathSync(abs);
  } catch {
    return abs;
  }
}

// ---------------------------------------------------------------------------
// witnessed session facts beyond the payload
// ---------------------------------------------------------------------------

// The hook process's own environment is part of what the hook witnesses.
// Capture is STRUCTURAL, not a hand-picked list: every variable whose name
// signals the Claude Code / agent runtime is recorded, so a new CLI version's
// new variables are captured without a code change — minus anything whose
// name smells like a credential, which is never recorded no matter how it is
// prefixed. Values are truncated to keep ledger lines bounded.
const ENV_NAME_RE = /^(CLAUDE|ANTHROPIC|AI_AGENT|CLAUDECODE|TERM_SESSION_ID|ITERM_SESSION_ID)/;
const SECRET_NAME_RE = /KEY|TOKEN|SECRET|PASSWORD|CREDENTIAL|AUTH/i;
const ENV_VALUE_MAX = 512;

export function envFacts(env = process.env) {
  const out = {};
  for (const name of Object.keys(env).sort()) {
    if (!ENV_NAME_RE.test(name) || SECRET_NAME_RE.test(name)) continue;
    const value = env[name];
    if (typeof value !== "string" || value === "") continue;
    out[name] = value.length > ENV_VALUE_MAX ? value.slice(0, ENV_VALUE_MAX) : value;
  }
  return out;
}

// The CLI's version reaches hooks only through its environment: the basename
// of the versioned exec path (.../claude/versions/2.1.207), or embedded in
// AI_AGENT (claude-code_2-1-207_agent). No hook payload carries it.
export function toolVersionFrom(env = process.env) {
  const execPath = env.CLAUDE_CODE_EXECPATH;
  if (typeof execPath === "string" && /^\d+\.\d+\.\d+/.test(basename(execPath))) {
    return basename(execPath);
  }
  const m =
    typeof env.AI_AGENT === "string" ? env.AI_AGENT.match(/^claude-code_(\d+)-(\d+)-(\d+)_/) : null;
  return m ? `${m[1]}.${m[2]}.${m[3]}` : null;
}

// Host/runtime facts. The ledger never leaves the machine, so naming the
// machine and user is attribution signal (which checkout of a shared repo did
// the witnessing), not exfiltration.
export function sysFacts() {
  const out = {
    platform: process.platform,
    arch: process.arch,
    nodeVersion: process.version,
    osRelease: null,
    hostname: null,
    username: null,
  };
  try {
    out.osRelease = release();
    out.hostname = hostname();
    out.username = userInfo().username;
  } catch {
    // partial sys facts are fine; nothing is guessed
  }
  return out;
}

// Repository facts at event time, resolved from the git dir's own files — no
// git binary is spawned. Worktree-aware: a linked worktree's private git dir
// has its own HEAD, while shared refs live in the commondir.
export function gitFacts(gitDir) {
  const facts = { branch: null, headSha: null };
  try {
    const head = readFileSync(join(gitDir, "HEAD"), "utf8").trim();
    if (!head.startsWith("ref: ")) {
      facts.headSha = head || null; // detached HEAD
      return facts;
    }
    const ref = head.slice(5).trim();
    facts.branch = ref.replace(/^refs\/heads\//, "");
    let commonDir = gitDir;
    try {
      const c = readFileSync(join(gitDir, "commondir"), "utf8").trim();
      if (c) commonDir = isAbsolute(c) ? c : resolve(gitDir, c);
    } catch {
      // not a linked worktree
    }
    for (const dir of [gitDir, commonDir]) {
      try {
        facts.headSha = readFileSync(join(dir, ref), "utf8").trim();
        return facts;
      } catch {
        // fall through to packed-refs
      }
    }
    for (const dir of [gitDir, commonDir]) {
      try {
        const packed = readFileSync(join(dir, "packed-refs"), "utf8");
        const line = packed.split("\n").find((l) => l.endsWith(` ${ref}`));
        if (line) {
          facts.headSha = line.slice(0, line.indexOf(" "));
          return facts;
        }
      } catch {
        // no packed-refs here
      }
    }
  } catch {
    // no HEAD readable; report what we have
  }
  return facts;
}

// What the touched file actually contained at touch time. The hash (not the
// content — the ledger never stores document content) lets any later consumer
// prove whether today's bytes are still the bytes this session wrote.
export function fileFacts(filePath) {
  try {
    const buf = readFileSync(filePath);
    return {
      contentBytes: buf.length,
      contentHash: `sha256:${createHash("sha256").update(buf).digest("hex")}`,
    };
  } catch {
    return { contentBytes: null, contentHash: null };
  }
}

// The model id is authoritative in the vendor's own transcript (each
// assistant line carries message.model), and only optionally present in the
// SessionStart payload. This is a bounded TAIL-SCAN for that one field — the
// last window of the file, newest line wins — never a parse of conversation
// content. The hook path calls this on every captured write, so it scans a
// small window first (assistant lines land every turn, so the last few KB
// nearly always hit) and pays the larger window only on a miss. Fail-open
// null on any error.
const TRANSCRIPT_WINDOWS = [16 * 1024, 256 * 1024];

export function modelFromTranscript(transcriptPath, maxBytes) {
  if (typeof transcriptPath !== "string" || !transcriptPath) return null;
  const windows = maxBytes ? [maxBytes] : TRANSCRIPT_WINDOWS;
  let size;
  try {
    size = statSync(transcriptPath).size;
  } catch {
    return null;
  }
  let scanned = -1;
  for (const window of windows) {
    const start = Math.max(0, size - window);
    if (size - start === scanned) break; // whole file already scanned
    scanned = size - start;
    let text;
    try {
      const buf = Buffer.alloc(size - start);
      const fd = openSync(transcriptPath, "r");
      try {
        readSync(fd, buf, 0, buf.length, start);
      } finally {
        closeSync(fd);
      }
      text = buf.toString("utf8");
    } catch {
      return null;
    }
    const lines = text.split("\n");
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i];
      if (!line.includes('"model"')) continue;
      try {
        const model = JSON.parse(line)?.message?.model;
        // Skip synthetic placeholders (e.g. "<synthetic>" on error turns).
        if (typeof model === "string" && model && !model.startsWith("<")) return model;
      } catch {
        // torn first line of the window, or a foreign line — keep scanning
      }
    }
  }
  return null;
}

// Walk up from startDir looking for `.git`. A directory is the git dir
// itself; a file (linked worktree) names the real git dir on its
// `gitdir:` line — the ledger then lives in the worktree's private git dir,
// so two worktrees of one repo never interleave sessions. No `git` binary is
// spawned: hooks must stay fast and must not depend on PATH contents.
export function findGitDir(startDir) {
  let dir = resolve(startDir);
  for (;;) {
    const candidate = join(dir, ".git");
    let st;
    try {
      st = statSync(candidate);
    } catch {
      st = null;
    }
    if (st?.isDirectory()) return candidate;
    if (st?.isFile()) {
      try {
        const m = readFileSync(candidate, "utf8").match(/^gitdir:\s*(.+)\s*$/m);
        if (m) {
          const target = m[1].trim();
          return isAbsolute(target) ? target : resolve(dir, target);
        }
      } catch {
        // Unreadable .git file: treat as no repository.
      }
      return null;
    }
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

export function ledgerPath(gitDir) {
  return join(gitDir, "ai-provenance", "session.jsonl");
}

// Append one event line. Throws on failure — callers on the hook path catch
// and fail open; the skill verbs surface the error.
export function appendToLedgerFile(file, event) {
  mkdirSync(dirname(file), { recursive: true });
  appendFileSync(file, JSON.stringify({ v: LEDGER_VERSION, ...event }) + "\n");
}

export function appendLedgerLine(gitDir, event) {
  appendToLedgerFile(ledgerPath(gitDir), event);
}

// Read every parseable line. Unparseable lines (a torn concurrent append, a
// hand-edit) are skipped rather than fatal: the ledger is evidence, and
// losing one line must not invalidate the rest.
export function readLedger(file) {
  let text;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    return [];
  }
  const out = [];
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    try {
      const obj = JSON.parse(line);
      if (obj && typeof obj === "object") out.push(obj);
    } catch {
      // skip torn/foreign line
    }
  }
  return out;
}

export function activityUrn(sessionId) {
  return ACTIVITY_URN_PREFIX + String(sessionId);
}

// All file_touch events for one document, optionally scoped to one session.
// Both sides of the comparison go through canonicalPath so a recorded alias
// (relative form, /tmp symlink) still matches the queried path.
export function touchesOf(lines, filePath, sessionId) {
  const target = canonicalPath(filePath);
  return lines.filter(
    (l) =>
      l.event === "file_touch" &&
      typeof l.filePath === "string" &&
      canonicalPath(l.filePath) === target &&
      (sessionId === undefined || l.sessionId === sessionId),
  );
}

// The distinct sessions the ledger records as having touched a document.
export function sessionsTouching(lines, filePath) {
  const ids = new Set();
  for (const t of touchesOf(lines, filePath)) {
    if (typeof t.sessionId === "string" && t.sessionId) ids.add(t.sessionId);
  }
  return [...ids].sort();
}

export function sessionStartOf(lines, sessionId) {
  let found = null;
  for (const l of lines) {
    if (l.event === "session_start" && l.sessionId === sessionId) found = l;
  }
  return found;
}
