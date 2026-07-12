---
id: explanation-witnessed-provenance
type: semantic
created: '2026-07-11T20:00:00Z'
namespace: explanation/design
title: Understanding Witnessed Provenance
tags:
  - explanation
  - mif-docs
  - provenance
  - design-rationale
modified: '2026-07-12T15:40:52.878Z'
temporal:
  '@type': TemporalMetadata
  validFrom: '2026-07-11T00:00:00Z'
  validUntil: '2027-07-11T00:00:00Z'
  recordedAt: '2026-07-11T20:00:00Z'
  ttl: P1Y
provenance:
  '@type': Provenance
  sourceType: agent_inferred
  trustLevel: user_stated
  agent: claude-code/claude-sonnet-5
  wasAttributedTo:
    '@id': https://github.com/modeled-information-format
    '@type': prov:Agent
  wasGeneratedBy:
    '@id': urn:mif:activity:claude-code-session:3eeb65b8-4027-4e9e-afbe-ccfe2ae33a26
    '@type': prov:Activity
  wasDerivedFrom:
    - '@id': https://github.com/modeled-information-format/mif-docs-plugin/issues/63
      '@type': prov:Entity
  agentVersion: 2.1.207
citations:
  - '@type': Citation
    citationType: specification
    citationRole: methodology
    title: Diátaxis — Explanation
    url: https://diataxis.fr/explanation/
    accessed: '2026-07-11'
  - '@type': Citation
    citationType: specification
    citationRole: background
    title: PROV-O — The PROV Ontology (W3C Recommendation)
    url: https://www.w3.org/TR/prov-o/
    accessed: '2026-07-11'
relationships:
  - type: relates-to
    target: urn:mif:how-to-witness-document-provenance
  - type: relates-to
    target: urn:mif:explanation-one-artifact-two-readers
  - type: relates-to
    target: urn:mif:reference-skill-mif-provenance
  - type: relates-to
    target: urn:mif:adr-0005-provenance-consent
ontology:
  '@type': OntologyReference
  id: mif-docs
  version: 1.0.0
  uri: https://mif-spec.dev/ontologies/mif-docs
entity:
  name: Understanding Witnessed Provenance
  entity_type: explanation
extensions:
  x-diataxis-quadrant: explanation
---

# Understanding Witnessed Provenance

## The problem this solves

Every MIF document carries a `provenance` block: who wrote it, and how sure you
should be about that. Ordinarily, that block is an account the model gives of
itself — it says "I wrote this," and nothing checks whether that's actually
true. There's no way to tell an honest account from a mistaken one, or a
mistaken one from a document someone edited by hand afterward and re-labeled.

Witnessed provenance closes that gap. Instead of asking the model to describe
itself, the plugin keeps its own private record of what actually happened —
which session touched which file, using which model — and a document's
provenance is built from *that* record, never from what the model claims. The
model being described is never the one describing it.

## Witnessed versus asserted: the difference that matters

Both kinds of provenance can look identical on the page. The difference is
where the facts came from:

- **Asserted** provenance (what you get by default, from `mif-frontmatter`) is
  the model's own account, written in the moment of drafting. It's usually
  right, and there's nothing wrong with it — but it's a claim, not a check.
- **Witnessed** provenance is built entirely from an independent log the
  plugin's hooks kept in the background — never from anything the model said
  about itself. If that log doesn't show a session touching the document, the
  tool **refuses** to stamp it, full stop. A block that names a session that
  never touched the file is exactly the failure this whole feature exists to
  prevent.

Use asserted provenance when you're moving fast and the stakes are low. Reach
for witnessed provenance when you need to actually stand behind who touched a
document — a compliance trail, a dispute about authorship, or simply wanting
receipts.

## Two moving parts: the hooks and the helper

"Witnessed provenance" is really two separate pieces working together, and
it helps to keep them apart:

- **The capture hooks** run silently in the background the whole time
  capture is on. You never invoke them — `SessionStart` opens a session
  line, every `Write`/`Edit`/`MultiEdit` appends a touch, `SessionEnd` closes
  it out. Their whole job is building the ledger; they never touch a
  document's frontmatter themselves.
- **The `mif-provenance` skill — the helper** — is the thing you (or your
  assistant) actually invoke: `stamp` to write a witnessed block into one
  document, `verify` to check one against the ledger, `status` to ask
  whether capture is even active right now. The helper never watches
  anything itself; it only reads what the hooks already recorded.

Put plainly: the hooks are the always-on witness, and the helper is how you
put that witness's testimony to use. Neither works without the other — a
helper with no ledger has nothing to stamp from, and a ledger nobody reads
never becomes a provenance block.

## How honest the "trust" really is

It would be easy to oversell this. The witnessing log lives only on your own
machine, in plain files, and it isn't cryptographically signed — anyone with
access to your machine could, in principle, edit it. So every witnessed
document's `trustLevel` is deliberately capped at **`user_stated`** — one step
above an unverified claim, and never the higher `verified` tier MIF reserves
for something an outside party has cryptographically attested. That's not a
current limitation waiting on a future fix; it's an honest description of what
a local, unsigned witness can and can't prove. You're trading "the model says
so" for "my own machine watched it happen and wrote it down" — a real
improvement, but not a notarized one.

One consequence of that honesty: the tool will **never** write a `confidence`
number into a provenance block. A witness can tell you something was present —
it can't tell you how sure to be about it, and inventing a number would claim
more precision than the evidence supports.

## Your consent is the whole design

Nothing is recorded about you unless you explicitly turn it on, in a setting
you write yourself, in a place you choose. Two rules govern everything else:

1. **Your "no" always wins.** If you turn capture off in your own personal
   settings, no project — no matter how it's configured — can turn it back on
   for you. Refusal beats every other setting, from every direction, always.
2. **A broken setting can only make things safer, never less safe.** If a
   settings file is malformed, unreadable, or shaped wrong, the plugin treats
   that exactly like an explicit "no." A configuration mistake can never
   accidentally turn observation on.

## What's actually recorded about you — and what never is

Turning capture on means the plugin's hooks note things like: which files you
touched and when, which AI model and tool version you were using, some
non-secret details about your environment, and which branch and commit you
were on. All of it stays in one private, unsigned log file inside your own
project's `.git` directory — **it is never committed, and it never leaves your
machine.**

Just as important is what's built in to **never** be recorded, no matter how
you configure anything:

- **The content of what you write.** The log records a fingerprint (a hash) of
  a file's bytes so you can later prove whether it changed — never the words
  themselves.
- **Credentials of any kind.** Anything that looks like a key, token, secret,
  or password is filtered out before it's ever written down, regardless of
  what it's called or where it came from.

## When this is actually worth turning on

- **"Who really wrote this?"** — settle a question about authorship with an
  independent record instead of someone's memory.
- **Catching a document that was quietly altered.** Run `verify` and find out
  immediately if a provenance block no longer matches what the log says
  happened — a strong signal something was hand-edited after the fact.
- **Auditing how much of a project is AI-authored, honestly.** The coverage
  report tells you what fraction of your documents carry *witnessed* — not
  merely claimed — provenance, broken down by model, so "how much of this did
  AI actually write" has a real answer instead of a guess.
- **Attribution across a team.** When several people (and their assistants)
  work in the same repository, witnessed provenance gives each document an
  independently-recorded author, not just a name someone typed in.

## Limitations, today

Capture is built entirely on Claude Code's own plugin hook events —
`SessionStart`, `PostToolUse`, `SessionEnd`. That means witnessed provenance
only works inside a Claude Code session, right now. If you (or a teammate)
write MIF documents from a different coding agent or tool, nothing observes
those sessions, and any document they touch stays unwitnessed no matter how
you configure `mifProvenance`.

That's a limit of what's been built so far, not a limit of the idea. Nothing
about the session ledger's own format assumes Claude Code specifically — it
is a plain, append-only log of "this session touched this file." Extending
capture to other tools would mean teaching each one to append to that same
kind of ledger, which is a real but unstarted piece of work, not something
the design rules out.

## Where to go next

Ready to try it? The [how-to guide](../../how-to/witness-document-provenance/)
walks the whole journey — turning it on, watching it work, and what to do when
something looks wrong.
