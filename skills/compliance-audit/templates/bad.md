---
id: 16f511a4-626a-5e55-8d6c-9b57763cc478
type: semantic
created: 2026-06-30T10:00:00Z
namespace: compliance-audit/antipattern
title: 'Antipattern: A Compliance Audit Report With No Tests-of-Controls Matrix'
tags:
  - antipattern
  - compliance-audit
---

# SOC 2 Type II Report: Acme Widgets

<!-- ANTIPATTERN: this is presented as an ISSUED SOC 2 report, not a draft. It
     never states that no CPA firm performed an examination and no opinion is
     expressed — the load-bearing no-attestation caveat is entirely absent. -->

We are pleased to confirm that Acme Widgets has achieved SOC 2 Type II
compliance for the period January 1, 2026 through June 30, 2026. All controls
were tested and passed.

## Management's Assertion

Management asserts the system operated effectively throughout the period.

## System Description

Acme Widgets runs its platform on cloud infrastructure with standard
engineering practices.

<!-- ANTIPATTERN: the System Description never breaks the system down across
     the five required components (infrastructure/software/people/data/
     processes) and cites no findings. -->

## Trust Services Criteria

We were evaluated against Security, Availability, Processing Integrity,
Confidentiality, and Privacy.

<!-- ANTIPATTERN: all five criteria are claimed in scope with no findings
     cited to support coverage of Processing Integrity, Confidentiality, or
     Privacy — an unsupported coverage claim the genre's Rules forbid. -->

## Summary of Results

All controls tested were found to be operating effectively with no
exceptions noted.

<!-- ANTIPATTERN: this is the genre's single most load-bearing required
     element and it is missing entirely — there is no tests-of-controls /
     findings matrix anywhere in this document. No table maps a control to a
     test performed and a result/exception with severity; nothing traces to
     a cited finding. A bare prose assertion of "no exceptions" is not a
     substitute for the required matrix. -->

<!-- ANTIPATTERN: no Remediation Plan section exists, consistent with the
     document's false claim that no exceptions were found. -->
