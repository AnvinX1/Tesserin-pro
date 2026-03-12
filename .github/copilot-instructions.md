# SPECTER — The Illusive Security Protocol

This project uses SPECTER, a modular security skills system. Security skills, references, and scripts are installed at `.specter/`.

## For All Security Work

Before performing any security assessment, penetration testing, code review, or vulnerability analysis:

1. **Read governance first**: `.specter/skills/security-governance/SKILL.md` — confirm authorization, scope, and rules of engagement before proceeding.
2. **Select the right skill**: Read `.specter/specter.md` for the full skill index and routing guide. Match the task to the appropriate skill and follow its workflow.
3. **Use standard output format**: All findings must use the format from `.specter/references/report-template.md` with severity ratings from `.specter/references/severity-matrix.md`.
4. **Route through triage**: Send findings through `.specter/skills/bug-bounty-triage/SKILL.md` for deduplication and prioritization.

## Installed Skills (16)

- **Governance**: security-governance, bug-bounty-triage
- **Recon**: indepth-recon-analysis, threat-modeling
- **Application**: secure-code-review, api-security-review, web-misconfig-review
- **Infrastructure**: cloud-config-audit, container-and-runtime-security, network-infrastructure-pentest
- **Supply Chain**: dependency-and-secret-audit, ci-cd-supply-chain-security, active-directory-and-identity-audit
- **Specialized**: exploit-validation, mobile-security-assessment
- **Reporting**: evidence-and-reporting

All skill files are at `.specter/skills/<name>/SKILL.md`. Read the relevant SKILL.md before starting work.

## Critical Rules

- Never perform security testing without confirmed authorization
- Separate Suspected findings from Confirmed findings
- Redact PII and credentials in all output
- Follow the 22 guardrails in security-governance
