---
id: 8aecb2ab-6015-5812-9cfd-e438035a9a67
type: semantic
created: '2026-07-01T10:00:00Z'
modified: '2026-07-01T10:00:00Z'
namespace: nist-sp/container-security
title: Guidelines for Secure Configuration of Container Orchestration Platforms
tags:
  - nist-sp
  - container-security
  - orchestration
  - zero-trust
temporal:
  '@type': TemporalMetadata
  validFrom: '2026-07-01T00:00:00Z'
  recordedAt: '2026-07-01T10:00:00Z'
  ttl: P2Y
provenance:
  '@type': Provenance
  sourceType: user_explicit
  trustLevel: verified
  wasGeneratedBy:
    '@id': urn:mif:activity:container-baseline-drafting-2026-07-01
    '@type': prov:Activity
citations:
  - '@type': Citation
    citationType: specification
    citationRole: source
    title: Application Container Security Guide (NIST SP 800-190)
    url: https://doi.org/10.6028/NIST.SP.800-190
    date: '2017-09-25'
    accessed: '2026-06-28'
  - '@type': Citation
    citationType: specification
    citationRole: source
    title: Security and Privacy Controls for Information Systems and Organizations (NIST SP 800-53 Rev. 5)
    url: https://doi.org/10.6028/NIST.SP.800-53r5
    date: '2020-09-23'
    accessed: '2026-06-28'
  - '@type': Citation
    citationType: specification
    citationRole: source
    title: Zero Trust Architecture (NIST SP 800-207)
    url: https://doi.org/10.6028/NIST.SP.800-207
    date: '2020-08-11'
    accessed: '2026-06-28'
relationships:
  - type: relates-to
    target: /semantic/compliance-audit/container-platform-fedramp-assessment.md
ontology:
  '@type': OntologyReference
  id: mif-docs
  version: 1.0.0
  uri: https://mif-spec.dev/ontologies/mif-docs
entity:
  name: Guidelines for Secure Configuration of Container Orchestration Platforms
  entity_type: special-publication
---

# Guidelines for Secure Configuration of Container Orchestration Platforms

## Authority

This publication is issued as a National Institute of Standards and
Technology (NIST) Special Publication in the SP 800 series to provide
computer security guidance for federal information systems, developed in
furtherance of NIST's statutory responsibilities. Nothing in this publication
alters or supersedes the authority of the Secretary of Commerce, the Director
of the Office of Management and Budget, or any other federal official over
information systems, nor is it intended to establish binding legal
requirements outside the federal enterprise.

## Purpose & Scope

This publication establishes baseline security requirements for configuring
container orchestration platforms (Kubernetes-class systems) that host
federal workloads. It covers container runtime hardening, orchestrator access
control, and network segmentation. It does not cover application-layer
vulnerability scanning, container image provenance and supply-chain
attestation, or CI/CD pipeline security, each of which is addressed by
separate NIST guidance.

## Audience

Cloud platform engineers who configure orchestration clusters, security
control owners and ISSOs/ISSMs responsible for authorizing container
platforms, and auditors assessing a platform's configuration against SP 800-53
control families.

## Abstract

Container orchestration platforms concentrate access control, network
policy, and workload isolation decisions in a small number of cluster-wide
configuration surfaces. Misconfiguration of any one surface — an
over-privileged runtime, an orchestrator API server without role-based access
control, or a flat cluster network — can expose every workload the cluster
hosts. This publication states baseline normative requirements for the three
surfaces most load-bearing for federal deployments: runtime hardening,
orchestrator access control, and network segmentation aligned with zero trust
principles, and maps each requirement to the SP 800-53 Revision 5 control
families it satisfies.

## Keywords

container security; orchestration; Kubernetes; access control; network
segmentation; zero trust; role-based access control; namespace isolation;
workload isolation; runtime hardening

## 1. Container Runtime Hardening

### 1.1. Root Privilege Restriction

Organizations shall run container workloads under a non-root user identity
and shall configure the container runtime to deny privilege escalation from
within the container [1].

### 1.2. Read-Only Root Filesystems

Organizations should mount container root filesystems read-only wherever the
hosted application permits, reducing the surface for runtime tampering [1].

## 2. Orchestrator Access Control

### 2.1. Role-Based Access Control

Organizations shall enforce role-based access control (RBAC) at the
orchestrator API server and shall not grant cluster-admin scope to workload
service accounts [1].

### 2.2. Namespace Isolation

Organizations should isolate tenant workloads into distinct namespaces and
should enforce a default-deny network policy between namespaces as the
starting posture [1] [3].

## 3. Network Segmentation and Zero Trust Alignment

### 3.1. Default-Deny Network Policy

Organizations shall apply default-deny network policies between namespaces
and may permit exceptions only through explicit allow-list rules scoped to a
named source and destination [3].

### 3.2. Identity-Based Segmentation

Organizations should align inter-service network segmentation with the zero
trust tenets in [3]: every request is authenticated and authorized on its own
merits, regardless of its network location or prior access.

## Definitions / Glossary

- **Container**: A lightweight, standalone executable package that includes
  everything needed to run a piece of software, isolated from other
  containers by the host operating system's kernel facilities [1].
- **Orchestrator**: The control-plane software (e.g. a Kubernetes API server
  and its controllers) that schedules containers onto hosts and enforces
  cluster-wide policy [1].
- **Namespace**: A logical partition within an orchestrator that scopes names,
  access control, and (with a network policy) network reachability for a set
  of workloads [1].
- **Zero Trust Architecture**: A security model in which no implicit trust is
  granted to assets or accounts based on physical or network location; every
  request is authenticated, authorized, and encrypted before access is
  granted [3].
- **Role-Based Access Control (RBAC)**: An access-control approach that grants
  permissions to roles rather than individual identities, with identities
  assigned to roles [2].

## References

1. National Institute of Standards and Technology, "Application Container
   Security Guide," NIST Special Publication 800-190, September 2017.
   <https://doi.org/10.6028/NIST.SP.800-190>
2. National Institute of Standards and Technology, "Security and Privacy
   Controls for Information Systems and Organizations," NIST Special
   Publication 800-53, Revision 5, September 2020.
   <https://doi.org/10.6028/NIST.SP.800-53r5>
3. National Institute of Standards and Technology, "Zero Trust Architecture,"
   NIST Special Publication 800-207, August 2020.
   <https://doi.org/10.6028/NIST.SP.800-207>

## Appendix A: Control Mapping Crosswalk

| Requirement | SP 800-53 Rev. 5 Control(s) | Rationale |
| --- | --- | --- |
| 1.1 Root Privilege Restriction | AC-6, CM-7 | Least privilege; least functionality |
| 1.2 Read-Only Root Filesystems | CM-6, SI-7 | Configuration settings; software/information integrity |
| 2.1 Role-Based Access Control | AC-3, AC-6 | Access enforcement; least privilege |
| 2.2 Namespace Isolation | SC-7, AC-4 | Boundary protection; information flow enforcement |
| 3.1 Default-Deny Network Policy | SC-7 | Boundary protection |
| 3.2 Identity-Based Segmentation | IA-2, SC-7 | Identification and authentication; boundary protection |
