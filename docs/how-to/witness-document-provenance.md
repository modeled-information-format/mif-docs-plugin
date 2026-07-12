---
id: how-to-witness-document-provenance
type: procedural
created: '2026-07-11T20:00:00Z'
modified: '2026-07-12T00:07:16.468Z'
namespace: how-to/provenance
title: How to Witness Your Documents' Provenance
tags:
  - how-to
  - mif-docs
  - provenance
temporal:
  '@type': TemporalMetadata
  validFrom: '2026-07-11T00:00:00Z'
  recordedAt: '2026-07-11T20:00:00Z'
  ttl: P1Y
relationships:
  - type: relates-to
    target: urn:mif:tutorial-getting-started
  - type: relates-to
    target: urn:mif:explanation-witnessed-provenance
  - type: relates-to
    target: urn:mif:reference-skill-mif-provenance
  - type: relates-to
    target: urn:mif:reference-provenance-ledger
ontology:
  '@type': OntologyReference
  id: mif-docs
  version: 1.0.0
  uri: https://mif-spec.dev/ontologies/mif-docs
provenance:
  '@type': Provenance
  sourceType: agent_inferred
  trustLevel: user_stated
  agent: claude-code/claude-sonnet-5
  wasAttributedTo:
    '@id': https://github.com/modeled-information-format
    '@type': prov:Agent
  wasGeneratedBy:
    '@id': urn:mif:activity:claude-code-session:8e92fcf2-b3f5-40c5-9171-89075e3b605c
    '@type': prov:Activity
  wasDerivedFrom:
    - '@id': https://github.com/modeled-information-format/mif-docs-plugin
      '@type': prov:Entity
    - '@id': https://diataxis.fr/how-to-guides/
      '@type': prov:Entity
  agentVersion: 2.1.207
citations:
  - '@type': Citation
    citationType: documentation
    citationRole: methodology
    title: 'Diátaxis — How-to Guides: the task-oriented quadrant this guide follows'
    url: https://diataxis.fr/how-to-guides/
    accessed: '2026-07-11'
entity:
  name: How to Witness Your Documents' Provenance
  entity_type: how-to-guide
extensions:
  x-diataxis-quadrant: how-to
---

# How to Witness Your Documents' Provenance

Turn on witnessed provenance, watch it appear in a document you write, and know
what to do when a document's provenance looks wrong. This guide walks the whole
journey in order — start to finish, the way you'll actually live it.

Turning this on means the plugin's own hooks quietly keep a private log of what
you actually did in each session; stamping copies facts from that log instead
of asking the model to describe itself. For the full reasoning behind why that
matters, see [Understanding witnessed
provenance](../../explanation/witnessed-provenance/) — this guide is the steps.

## Step 1 — Decide whether you want this on

Provenance capture is **off by default**, everywhere, for everyone. Nothing is
recorded about you until you explicitly turn it on, and once you turn it off —
from anywhere — that's final; no other setting can turn it back on behind your
back.

If you're ready, add this to a settings file:

```json
{
  "mifProvenance": {
    "capture": true,
    "stamp": "auto"
  }
}
```

**Restart your Claude Code session after adding this.** Hooks only take
effect reliably for sessions started after the setting exists — turning
capture on mid-session is not guaranteed to wire the capture hooks into an
already-running session's dispatch (tracked as
[issue #90](https://github.com/modeled-information-format/mif-docs-plugin/issues/90)),
and both the config resolver and the hooks themselves are deliberately silent
either way, so nothing in the session tells you it didn't take. The same
caveat applies after any `/plugin` update that changes this plugin's
`hooks/hooks.json`. If you want to check whether hooks are actually wired for
your current session without restarting first, run `node
scripts/mif-provenance.mjs status` — see [the mif-provenance
reference](../reference/skills/mif-provenance/) for what it reports.

**Where you put it decides who it affects:**

- `.claude/settings.json` in your project — everyone who works in this
  repository gets it, and it's meant to be committed and shared.
- `.claude/settings.local.json` in your project — just you, on this project,
  and it's meant to stay out of git.
- Your personal Claude Code settings (outside any project) — you, everywhere,
  on every project you touch.

You don't have to pick `stamp: "auto"` yet — the next step walks through what
each choice actually feels like.

## Step 2 — Pick how you want to be involved

`stamp` controls what happens the moment you finish writing a document. Think of
it as answering one question: **how much say do you want in the moment?**

- **`"auto"` — just do it.** The moment you save a document, if it's the kind of
  document this suite tracks, its provenance gets witnessed automatically. You
  won't be interrupted. This is the right choice once you trust the flow and
  don't want to think about it.
- **`"ask"` — ask me each time.** You'll see a message offering the exact
  command to run, and nothing is written until you run it yourself. This is the
  right choice while you're still getting a feel for what gets stamped and when.
  (One honest caveat: if you're running Claude Code unattended — a script, a CI
  job — there's no one to ask, so `"ask"` quietly behaves like `"off"` there.
  Nothing is silently auto-approved on your behalf.)
- **`"off"` — only when I say so.** Nothing is stamped automatically, ever.
  You decide document by document, by running the stamp command yourself when
  you want it.

Change your mind any time — edit the setting and it takes effect on your next
session.

## Step 3 — Author a document and watch what happens

Write a document the way you normally would — using any of the suite's genre
skills, or by hand. If provenance capture is on, the plugin has already been
quietly noting, in the background, which session touched which file. Nothing
about your writing experience changes.

Once the document is saved, here's what a witnessed `provenance` block looks
like — this is real output, not a template:

```yaml
provenance:
  '@type': Provenance
  agent: claude-code/claude-fable-5
  wasGeneratedBy:
    '@id': urn:mif:activity:claude-code-session:1a2b3c4d-...
    '@type': prov:Activity
  trustLevel: user_stated
```

Every one of those lines is something the plugin actually observed — which
model wrote it, which session it happened in — never something the model was
merely asked to say about itself.

If you chose `stamp: "auto"`, that block appeared on its own. If you chose
`"ask"`, keep reading.

## Step 4 — Approve a stamp when you're asked

With `stamp: "ask"`, after you save a qualifying document, you'll see a message
like:

> mif-provenance: stamp mode is "ask" and this session's ledger witnessed
> `notes.md`. To approve stamping witnessed provenance into it, run:
> `node .../scripts/mif-provenance.mjs stamp "notes.md" --session ...`

Nothing is written until *you* decide to run that command — not the model
deciding on your behalf. Say yes and it runs, or say no and the document stays
exactly as it was. There's no timer, no default; it waits for you.

## Step 5 — Check a document you don't fully trust

Later, you (or a teammate) might open a document and wonder: does this
provenance block actually reflect what happened, or did someone hand-edit it?
Ask the question directly:

```bash
node scripts/mif-provenance.mjs verify path/to/document.md
```

You'll get one of two answers, and each one tells you what to do next:

- **`MATCH`** — the provenance block is exactly what the session log says
  happened. Trust it.
- **`DRIFT`** — something doesn't line up (a field was hand-edited, or the
  session that's named never actually touched this file). The tool tells you
  exactly which field is wrong and what it expected instead. From here, you
  decide: re-stamp it if the mismatch was innocent (say, an old value that's
  since gone stale), or treat it as a real finding and go find out how it got
  that way. Either way, **`verify` never changes the file on its own** — it
  only tells you what it found.

If you want a bird's-eye view instead of checking one file at a time — how much
of a whole project is witnessed versus merely claimed — see [the coverage
report](../../reference/skills/mif-provenance/) in the reference docs.

## Step 6 — Turn it off, from anywhere

Change `capture` to `false` (or delete the setting) in any of the places you
could have set it, and that place's refusal wins — no matter what any other
setting says. A shared project setting that says "on" can never override your
own personal "off." This is deliberate: your no is always the final word.

## What's next

If you want the full reasoning behind why witnessed provenance works this way —
the trust ceiling, the privacy guarantees, and the situations this is actually
built for — read [Understanding witnessed provenance](../../explanation/witnessed-provenance/).
