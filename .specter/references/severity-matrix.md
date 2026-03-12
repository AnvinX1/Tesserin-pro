# Severity Matrix

Standard severity classification for all findings. Aligns with CVSS v3.1 qualitative ratings and common bug bounty program tiers.

## Severity Levels

| Level | CVSS Range | Label | Description |
|-------|-----------|-------|-------------|
| S1 | 9.0–10.0 | **Critical** | Full system compromise, RCE, auth bypass on critical assets, mass data exfiltration, pre-auth SQLi on production. Immediate action required. |
| S2 | 7.0–8.9 | **High** | Significant data exposure, stored XSS on admin panels, privilege escalation, SSRF to internal services, account takeover. |
| S3 | 4.0–6.9 | **Medium** | Limited data leak, CSRF on state-changing actions, IDOR with partial impact, information disclosure enabling chained attacks. |
| S4 | 0.1–3.9 | **Low** | Minor information disclosure, verbose errors, missing non-critical headers, self-XSS, theoretical issues requiring unlikely conditions. |
| S5 | 0.0 | **Informational** | Best-practice deviations, cosmetic issues, hardening recommendations with no direct exploitability. |

## Confidence Levels

| Level | Label | Criteria |
|-------|-------|---------|
| C1 | **Confirmed** | Exploited and validated with PoC. Evidence attached. Reproducible. |
| C2 | **High Confidence** | Strong indicators, partial PoC, or known-vulnerable pattern match. Needs full validation. |
| C3 | **Moderate** | Suspicious pattern, requires further analysis or access to confirm. |
| C4 | **Tentative** | Theoretical, inferred from limited data, or based on version fingerprint alone. |

## Impact Categories

| Category | Examples |
|----------|---------|
| **Confidentiality** | Data exposure, credential leak, PII access |
| **Integrity** | Data modification, code injection, config tampering |
| **Availability** | DoS, resource exhaustion, service disruption |
| **Authentication** | Auth bypass, session hijack, token abuse |
| **Authorization** | Privilege escalation, IDOR, role confusion |
| **Compliance** | Regulatory violation, policy breach, audit failure |

## Chaining & Escalation

- When individual findings chain together to produce higher impact, assign severity based on the **combined** impact, not individual components.
- Document the chain clearly: `Finding A (S4) + Finding B (S3) → Combined Impact (S2)`.
- Each link in the chain must have its own evidence.

## Triage Priority

| Severity | Response Target | Escalation |
|----------|----------------|------------|
| S1 Critical | Immediate | Notify stakeholder within 1 hour |
| S2 High | Same day | Include in next triage cycle |
| S3 Medium | Within sprint | Standard backlog |
| S4 Low | Best effort | Track for hardening |
| S5 Info | Optional | Document only |
