---
id: 55dbd4f6-5926-5eb1-8185-87ef2df458ca
type: semantic
created: 2026-07-01T10:00:00Z
namespace: nist-sp/antipattern
title: 'Antipattern: An SP-Shaped Document With No Normative Force or Citations'
tags:
  - antipattern
  - nist-sp
---

# Guidelines for Container Security

<!-- ANTIPATTERN: no Authority statement, no Purpose & Scope, no Audience, no
     Abstract, and no Keywords — none of the required front matter that must
     precede the first numbered section is present. -->

## 1. Runtime Security

You should probably try to avoid running containers as root most of the time,
since that's generally considered a bad practice by a lot of security teams.

<!-- ANTIPATTERN: this is the genre's single most load-bearing rule, broken —
     the "requirement" is narrative and hedged ("should probably", "most of
     the time", "generally considered") instead of an explicit shall/should/
     may normative statement, and it cites no finding at all. It is an orphan
     normative claim: nothing traces it to evidence, and a reader cannot tell
     whether it is binding. -->

## 2. Access Control

Access control is important for orchestrators. Teams tend to use RBAC when
they can.

<!-- ANTIPATTERN: another uncited, hedged claim with no normative force and no
     bracketed reference — the same defect repeated, not a one-off slip. -->

## References

<!-- ANTIPATTERN: the References section is empty. Nothing in the body cites
     [1], [2], or any other numbered source, so there is nothing to resolve —
     every claim above is an orphan. -->

<!-- ANTIPATTERN: no Definitions/Glossary section at all, though this genre
     marks it required, and no appendix, though a container-security
     publication naturally supports a control-mapping crosswalk. -->
