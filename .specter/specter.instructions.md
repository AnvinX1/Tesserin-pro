---
applyTo: "**"
---

# SPECTER Security Protocol Active

This project has **SPECTER** (The Illusive Security Protocol) installed at `.specter/`.

## When to Use SPECTER

Activate SPECTER skills when the user requests any of:
- Security assessment, audit, review, or pentest
- Vulnerability analysis or bug bounty work
- Code review for security issues
- Dependency or secret scanning
- Cloud, container, or infrastructure security review
- Threat modeling or attack surface mapping
- Exploit development or validation
- Security report generation

## Mandatory Rules

1. **Governance first** — Before ANY security work, read and apply `.specter/skills/security-governance/SKILL.md`. Confirm authorization and scope.
2. **Standard format** — All findings use the format defined in `.specter/references/report-template.md` with severity from `.specter/references/severity-matrix.md`.
3. **Read the skill** — When a task matches a skill, read the full SKILL.md before proceeding. Follow its workflow exactly.
4. **Never skip triage** — Route findings through `.specter/skills/bug-bounty-triage/SKILL.md` for dedup and prioritization.
5. **Redact PII** — Never output unredacted PII, credentials, or secrets in findings.

## Quick Reference

Full skill index, workflow, and governance details: `.specter/specter.md`

16 skills available across: governance, recon, code review, API security, web config, cloud, containers, network, supply chain, identity, mobile, threat modeling, exploit validation, and reporting.
