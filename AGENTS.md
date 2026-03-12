# AGENTS — SPECTER Security Protocol

This project uses **SPECTER** (The Illusive Security Protocol), a modular security skills system for autonomous agents.

## Location

All SPECTER files are at `.specter/`:
- `.specter/specter.md` — Master skill index and workflow guide
- `.specter/skills/<name>/SKILL.md` — Individual skill definitions
- `.specter/references/` — Checklists, standards, attack references
- `.specter/scripts/` — Python helper scripts

## Protocol

For any security-related task:

1. **Governance first**: Read `.specter/skills/security-governance/SKILL.md`. Confirm authorization and scope before proceeding.
2. **Select skill**: Consult `.specter/specter.md` for the skill index. Match your task to the appropriate skill.
3. **Follow workflow**: Read the selected SKILL.md and execute its workflow step by step.
4. **Standard format**: Output findings per `.specter/references/report-template.md`.
5. **Severity ratings**: Apply `.specter/references/severity-matrix.md` (S1-S5 severity, C1-C4 confidence).
6. **Triage**: Route through `.specter/skills/bug-bounty-triage/SKILL.md`.

## Skills (16)

| Category | Skills |
|----------|--------|
| Governance | security-governance, bug-bounty-triage |
| Recon | indepth-recon-analysis, threat-modeling |
| Application | secure-code-review, api-security-review, web-misconfig-review |
| Infrastructure | cloud-config-audit, container-and-runtime-security, network-infrastructure-pentest |
| Supply Chain | dependency-and-secret-audit, ci-cd-supply-chain-security, active-directory-and-identity-audit |
| Specialized | exploit-validation, mobile-security-assessment |
| Reporting | evidence-and-reporting |

## Non-Negotiable Rules

- Authorization required before any security testing
- Never operate outside defined scope
- Separate Suspected from Confirmed findings
- Redact PII and credentials in all output
- Evidence required for every finding
