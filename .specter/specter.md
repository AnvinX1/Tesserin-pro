# SPECTER — The Illusive Security Protocol

> **S**ecurity **P**rotocol for **E**xploitation, **C**omprehensive **T**esting, **E**valuation & **R**eporting
> by Anvin · Illusive Operations

Full skill reference and workflow guide. This document is the source of truth for all SPECTER operations.

---

## Path Convention

All paths in this document and in SKILL.md files are **relative to the `.specter/` directory**. When a skill references `references/severity-matrix.md`, look for `.specter/references/severity-matrix.md`.

---

## Governance — MANDATORY

**Before ANY security task**, invoke `skills/security-governance/SKILL.md` and confirm:

1. Authorization exists (bug bounty URL, pentest SOW, or explicit user confirmation)
2. Scope is defined (what's in, what's out)
3. Rules of engagement are set (rate limits, forbidden actions, data handling)

**Never skip governance.** No assessment, scan, or exploit proceeds without it.

---

## Skill Index

### Governance & Triage
| Skill | Path | When |
|-------|------|------|
| security-governance | `skills/security-governance/SKILL.md` | Always first — authorization + scope |
| bug-bounty-triage | `skills/bug-bounty-triage/SKILL.md` | New finding needs intake, dedup, routing |

### Reconnaissance & Design
| Skill | Path | When |
|-------|------|------|
| indepth-recon-analysis | `skills/indepth-recon-analysis/SKILL.md` | Map attack surface, fingerprint tech |
| threat-modeling | `skills/threat-modeling/SKILL.md` | System design review, STRIDE/PASTA |

### Code & Application
| Skill | Path | When |
|-------|------|------|
| secure-code-review | `skills/secure-code-review/SKILL.md` | Source code in scope |
| api-security-review | `skills/api-security-review/SKILL.md` | REST/GraphQL/WebSocket APIs |
| web-misconfig-review | `skills/web-misconfig-review/SKILL.md` | Server/app config audit |

### Infrastructure & Cloud
| Skill | Path | When |
|-------|------|------|
| cloud-config-audit | `skills/cloud-config-audit/SKILL.md` | AWS/Azure/GCP/IaC config |
| container-and-runtime-security | `skills/container-and-runtime-security/SKILL.md` | Docker/K8s environment |
| network-infrastructure-pentest | `skills/network-infrastructure-pentest/SKILL.md` | Network segmentation, firewalls |

### Supply Chain & Identity
| Skill | Path | When |
|-------|------|------|
| dependency-and-secret-audit | `skills/dependency-and-secret-audit/SKILL.md` | Dependencies, secrets, configs |
| ci-cd-supply-chain-security | `skills/ci-cd-supply-chain-security/SKILL.md` | Pipeline config, artifact integrity |
| active-directory-and-identity-audit | `skills/active-directory-and-identity-audit/SKILL.md` | AD, Kerberos, Azure AD |

### Specialized
| Skill | Path | When |
|-------|------|------|
| exploit-validation | `skills/exploit-validation/SKILL.md` | Suspected finding needs PoC |
| mobile-security-assessment | `skills/mobile-security-assessment/SKILL.md` | iOS/Android app in scope |

### Reporting
| Skill | Path | When |
|-------|------|------|
| evidence-and-reporting | `skills/evidence-and-reporting/SKILL.md` | Assessment complete, generate report |

---

## Workflow

```
Governance → Recon → [Threat Model] → Parallel Assessment → Triage → Validation → Report
```

1. **security-governance** — Set scope and authorization
2. **indepth-recon-analysis** — Map the target
3. **threat-modeling** — (optional) Analyze design-level risks
4. **Assessment skills** — Run appropriate skills in parallel based on target type
5. **bug-bounty-triage** — Process all findings through triage (routing matrix decides next skill)
6. **exploit-validation** — Validate suspected findings with PoC
7. **evidence-and-reporting** — Compile final report

---

## Finding Format

Every finding MUST use this structure:

```markdown
### [FINDING-ID]: [Title]

| Field | Value |
|-------|-------|
| **Severity** | S1-S5 (per references/severity-matrix.md) |
| **Confidence** | C1 Confirmed / C2 Firm / C3 Probable / C4 Speculative |
| **Status** | Suspected / Confirmed / Remediated / False Positive / Accepted Risk |
| **Category** | CWE-XXX / OWASP category |
| **Affected Target** | endpoint, file, component |

#### Issue Summary
#### Impact
#### Evidence
#### Remediation
#### Validation Notes
```

---

## Guardrails (22 Rules)

All skills enforce these — see `skills/security-governance/SKILL.md` for full details:

**Core:** Authorization required · Scope enforcement · Suspected ≠ Confirmed · Evidence required · Conservative classification · Data protection · Destructive action limits

**Extended:** Out-of-scope discovery protocol · Third-party testing limits · Zero-day disclosure · PII access limits · Active defense interaction · Incident response triggers · Regulatory escalation (GDPR/PCI/HIPAA) · Risk acceptance process · Scope expansion matrix · Evidence retention policy

---

## References

| Document | Purpose |
|----------|---------|
| `references/severity-matrix.md` | S1-S5 severity, C1-C4 confidence, triage SLAs |
| `references/authz-and-authn-checklist.md` | AuthN/AuthZ review checklist |
| `references/secrets-and-config-checklist.md` | Secret detection, config hygiene |
| `references/web-common-risks.md` | OWASP Top 10 + common vulns |
| `references/report-template.md` | Finding and report format |
| `references/owasp-api-top-10-checklist.md` | API1-API10 test procedures |
| `references/graphql-security-checklist.md` | GraphQL attack surface |
| `references/jwt-and-oauth-attacks.md` | JWT + OAuth attack patterns |
| `references/ssrf-exploitation-guide.md` | SSRF payloads and bypasses |
| `references/cloud-cis-benchmarks-summary.md` | AWS/Azure/GCP CIS checks |
| `references/tool-recommendations.md` | Categorized tool reference |

## Scripts

| Script | Purpose |
|--------|---------|
| `scripts/normalize_finding.py` | Raw data → standard finding |
| `scripts/severity_stats.py` | Report → statistics |
| `scripts/secret_grep.py` | Scan directory for secrets |
| `scripts/deduplicate_findings.py` | Merge duplicate findings |
| `scripts/export_findings.py` | Findings → JSON/CSV |
| `scripts/merge_reports.py` | Combine multiple reports |
| `scripts/validate_finding.py` | Format compliance check |
| `scripts/redact_evidence.py` | PII/secret redaction |
