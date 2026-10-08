---
id: 2e302277-b696-5c22-8f78-735d4f380378
type: semantic
created: '2026-07-01T00:00:00Z'
modified: '2026-07-01T00:00:00Z'
namespace: reference/skills
title: 'Skill reference: legal-memo'
tags:
  - reference
  - mif-docs
  - skill
  - legal-memo
  - irac
temporal:
  '@type': TemporalMetadata
  validFrom: '2026-07-01T00:00:00Z'
  recordedAt: '2026-07-01T00:00:00Z'
  ttl: P1Y
provenance:
  '@type': Provenance
  sourceType: agent_inferred
  trustLevel: high_confidence
  agent: anthropic/claude-code
  wasAttributedTo:
    '@id': https://github.com/modeled-information-format
    '@type': prov:Agent
  wasGeneratedBy:
    '@id': urn:mif:activity:mif-docs-self-documentation
    '@type': prov:Activity
  wasDerivedFrom:
    - '@id': https://github.com/modeled-information-format/mif-docs-plugin
      '@type': prov:Entity
    - '@id': urn:mif:skill:legal-memo
      '@type': prov:Entity
citations:
  - '@type': Citation
    citationType: tool
    citationRole: methodology
    title: 'The Bluebook — A Uniform System of Citation (21st ed.)'
    url: https://www.legalbluebook.com/
    accessed: '2026-07-01'
  - '@type': Citation
    citationType: tool
    citationRole: source
    title: 'mif-docs — legal-memo skill (SKILL.md)'
    url: https://github.com/modeled-information-format/mif-docs-plugin/tree/main/skills/legal-memo
relationships:
  - type: relates-to
    target: urn:mif:d8972202-0b4d-52ea-89d7-90abe228e820
  - type: relates-to
    target: urn:mif:9308c842-4ad0-522d-b247-ba65030c9eb4
ontology:
  '@type': OntologyReference
  id: mif-docs
  version: 1.0.0
  uri: https://mif-spec.dev/ontologies/mif-docs
entity:
  name: 'Skill reference: legal-memo'
  entity_type: reference-document
extensions:
  x-skill: legal-memo
  x-genre-conceptType: semantic
  x-target-level: 3
  x-purpose-group: regulated-and-compliance-reports
---

# Skill reference: `legal-memo`

The `legal-memo` skill authors one document genre: a **predictive legal
memorandum** — an internal analysis that predicts how a question of law
resolves on a given set of facts, and shows its reasoning issue by issue so a
supervising attorney or decision-maker can scrutinize the chain from facts to
rule to application before relying on it. This reference describes what that
document type is, how the skill produces one, when it earns its place, and the
provenance behind it.

| Property | Value |
| --- | --- |
| Authors | A predictive legal memorandum |
| Purpose group | Regulated & compliance reports |
| MIF `conceptType` | `semantic` |
| Target MIF level | 3 |
| Primary source | Standard U.S. law-practice predictive-memo convention, with Bluebook practitioner citation style |

## What this document type is

A legal memo is a **predictive** internal analysis: given a set of facts and a
governing body of law, it states the most likely outcome and then earns that
prediction by working through the reasoning that produced it. Its defining
trait is the **IRAC** sub-structure inside the Discussion — Issue, Rule,
Application, Conclusion, applied once per discrete issue — which is what makes
the document a legal memo rather than a narrative brief or an advocacy piece.
The memo also carries a standard front-matter heading (To/From/Date/Re), a
Question Presented framed as a single yes/no question, a Brief Answer, a
neutral Statement of Facts, an overall Conclusion, and a back-matter table of
authorities citing every source in Bluebook practitioner style.

This is distinct from a single already-made, immutable technical decision (an
[adr](../adr/)), which has no predictive legal question and no authority to
weigh, and from a conformance finding against a named regulatory standard
rather than a prediction of how a legal question resolves.

## How the skill produces one

`legal-memo` is a genre skill: it carries the predictive-memo pattern as
durable instructions plus exemplars, and writes the artifact over a MIF floor
so the result is at once a human-readable memo and a machine-conformant unit.

- **Pattern, made operational.** The skill encodes the seven-part shape —
  front matter, Question Presented, Brief Answer, Statement of Facts,
  Discussion (IRAC per issue), Conclusion, back matter — and treats IRAC as
  the genre's single most load-bearing required element: a Discussion without
  identifiable Issue/Rule/Application/Conclusion per issue is not conformant.
  It requires exhaustive coverage of the supplied authority, honest
  acknowledgment of adverse authority, and hedged predictions where authorities
  disagree, and it forbids fabricated citations.
- **Exemplars set the bar.** Like every genre in the suite it ships
  `good-l1.md` (the MIF Level-1 floor), `good.md` (the Level-3 target),
  `bad.md` (a counter-example whose Discussion has no IRAC sub-structure), and
  `evals/evals.json`. The `check-exemplars` gate proves `good-l1.md` validates
  at L1 and `good.md` at Level 3.
- **MIF projection.** The document is authored with MIF frontmatter (via the
  shared `mif-frontmatter` substrate) and a `conceptType` of `semantic`,
  reflecting that the memo is declarative legal analysis and its rationale, not
  a time-bound event or a step sequence. `mif-validate` proves the Markdown ↔
  JSON-LD round-trip is lossless before the document is considered done.

## When it is beneficial

Reach for `legal-memo` when a supervising attorney or internal decision-maker
must act on a **prediction of how a legal question resolves** on a concrete set
of facts, and the reasoning chain from facts to rule to application needs to
survive scrutiny before anyone relies on it. It is the right genre whenever the
value is in showing the work issue by issue, with adverse authority surfaced
rather than hidden.

Do **not** use it when the decision is already made and only needs recording
immutably with its drivers — that is an [adr](../adr/): no predictive legal
question, no IRAC, no legal authority to weigh. Do not use it for a conformance
finding against a named regulatory standard rather than an issue-by-issue legal
prediction — that calls for a compliance-focused audit genre instead. Do not
use it to narrate a settled record of what already happened; a legal memo
predicts an outcome, it does not recount history.

## Example

A memo titled *"Hendricks Non-Compete / Client-List Question"* asks whether a
former account manager who solicits clients using a list compiled solely from
public trade directories breaches a non-solicitation covenant. The Brief
Answer predicts likely no. The Discussion runs two IRAC cycles: Issue A asks
whether the list is a protectable trade secret, citing the Uniform Trade
Secrets Act and the Restatement (Third) of Unfair Competition to conclude it is
not, because compilation effort alone does not establish secrecy; Issue B asks
whether the covenant reaches solicitation built on non-confidential
information, citing *BDO Seidman v. Hirshberg* to conclude the covenant is
unlikely to be enforced absent a genuine protectable interest. The Conclusion
recommends advising the client that an injunction carries a low probability of
success, and the back matter lists all three authorities in a numbered table.

## Provenance & citations

- **Genre source — Bluebook practitioner citation style:** the standard U.S.
  legal-citation authority, <https://www.legalbluebook.com/>; the skill
  instructs authors to verify the current edition live at authoring time rather
  than bake one in as settled fact.
- **Skill provenance:** authored by the `legal-memo` skill in the mif-docs
  plugin, <https://github.com/modeled-information-format/mif-docs-plugin>; the
  skill's exemplars and `evals/` define and verify the pattern.
- **MIF conformance:** the document projects to canonical JSON-LD under the MIF
  specification, <https://mif-spec.dev>, and is proven lossless by
  `mif-validate`.
- **Index:** this skill is one entry in the [skills by purpose](../../skills-by-purpose/)
  catalog; its closest sibling by contrast is [adr](../adr/), the immutable
  decision record this genre is not.
