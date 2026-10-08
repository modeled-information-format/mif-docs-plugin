---
id: 4268529c-a22b-5ea6-93e4-8577339116a2
type: semantic
created: 2026-06-30T10:00:00Z
---

# Compliance Audit Report: Nimbus Ledger — Security and Availability Controls (2026 H1)

**Nimbus Ledger** (fictional, illustrative service organization) — controls
report draft for the period January 1, 2026 through June 30, 2026. Criteria
assessed against: AICPA Trust Services Criteria — Security (common criteria)
and Availability.

## Independent Service Auditor's Report

This section is a **DRAFT placeholder only**. No audit opinion is expressed.
No licensed CPA firm has performed an examination of Nimbus Ledger's system or
controls under AICPA attestation standards (SSAE 18). This document models
the structure of a SOC 2 Type II report for internal readiness purposes; it
is not, and must not be represented as, an attestation, assurance,
certification, or audit opinion.

## Management's Assertion

Nimbus Ledger management asserts that, throughout the period January 1, 2026
through June 30, 2026, the controls described below were suitably designed
and, with one noted exception, operated effectively to meet the Security and
Availability criteria for the ledger-reconciliation platform.

## System Description

- **Infrastructure**: Production workloads run in a single cloud provider
  region with a warm-standby region for failover.
- **Software**: A monolithic reconciliation service and a separate
  authentication service, both deployed from a single CI/CD pipeline.
- **People**: A 12-person engineering team; a 3-person security/compliance
  function reporting to the CTO.
- **Data**: Customer ledger records and reconciliation artifacts, encrypted
  at rest and in transit.
- **Processes**: Change management, access provisioning/deprovisioning, and
  incident response, each documented in the internal runbook set.

## Trust Services Criteria

In scope: **Security** (common criteria, always required) and
**Availability**. Excluded: Processing Integrity, Confidentiality, and
Privacy — no findings this period cover those criteria, so no claim of
coverage is made for them.

## Tests of Controls & Findings (with Severity)

| Control | Test Performed | Result / Exception | Severity |
| --- | --- | --- | --- |
| Multi-factor authentication is required for all administrative console access via the identity provider | Sampled admin login events for the period; confirmed MFA challenge on each | Met — no exceptions | — |
| Production code changes require peer review and pass automated CI gates before merge | Sampled merged pull requests for the period; confirmed review approval and green CI status on each | Met — no exceptions | — |
| Encrypted backups of customer ledger data are taken daily and restoration is tested quarterly | Reviewed backup job logs and the Q1/Q2 restoration test records | Met — no exceptions | — |
| Quarterly access reviews are performed for all production systems within 30 days of quarter-end | Reviewed access-review completion records for Q1 and Q2 2026 | **Exception** — the Q1 review was completed 47 days after quarter-end, 17 days past the control's stated SLA | Medium |

## Remediation Plan

- **Gap**: Q1 quarterly access review completed 17 days past SLA.
  **Action**: Add a calendar-triggered reminder to the access-review owner at
  T-10 days before the SLA deadline, and escalate to the security lead if the
  review is not started by T-5 days.
  **Owner**: Security & Compliance lead.
  **Target date**: 2026-08-15 (in place for the Q3 2026 review cycle).

## Other Information / Management's Response

Management concurs with the exception noted above. The Q2 2026 access review
was completed within SLA, and the reminder/escalation process described in
the Remediation Plan has been scheduled for implementation ahead of the Q3
review. This section, and any roadmap items referenced within it, falls
outside the scope of the criteria tested above.

## References

1. AICPA & CIMA, *2017 Trust Services Criteria (With Revised Points of Focus
   — 2022)* — <https://www.aicpa-cima.com/resources/download/2017-trust-services-criteria-with-revised-points-of-focus-2022>
2. AICPA, *Statement on Standards for Attestation Engagements No. 18* — <https://www.aicpa-cima.com/resources/download/aicpa-statement-on-standards-for-attestation-engagements-no-18>

<!--
MIF Level 1 (floor): id, type, created + body. A complete, valid compliance
audit report draft — but opaque to a machine consumer. It cannot be queried
for "is this audit period still current?", "where did the evidence come
from?", or "what remediation issue tracks this gap?". Compare templates/
good.md (full L3: temporal validity, W3C-PROV provenance, per-row citations,
typed relationships). Gate: mif-validate --level 1.
-->
