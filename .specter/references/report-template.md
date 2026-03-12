# Report Template

Standard template for security assessment findings. Each finding should be a self-contained, reproducible report. Use this template in the `evidence-and-reporting` skill.

---

## Assessment Summary

| Field | Value |
|-------|-------|
| **Assessment Name** | [Name/ID of engagement] |
| **Target** | [Application, URL, repository, or system] |
| **Scope** | [Authorized scope boundaries] |
| **Date** | [Assessment date(s)] |
| **Reviewer** | [Agent/Analyst identifier] |
| **Authorization Reference** | [Bug bounty program link, pentest SOW, or authorization doc] |

---

## Executive Summary

[2-4 sentences: scope, methodology, key findings count by severity, overall risk posture.]

| Severity | Count |
|----------|-------|
| Critical (S1) | 0 |
| High (S2) | 0 |
| Medium (S3) | 0 |
| Low (S4) | 0 |
| Informational (S5) | 0 |

---

## Finding Template

### [FINDING-ID]: [Title]

| Field | Value |
|-------|-------|
| **Severity** | S1/S2/S3/S4/S5 (see `references/severity-matrix.md`) |
| **Confidence** | C1/C2/C3/C4 (see `references/severity-matrix.md`) |
| **Category** | [OWASP category or CWE] |
| **Affected Target** | [URL, endpoint, file path, component] |
| **Status** | Suspected / Confirmed / Remediated / False Positive |

#### Issue Summary
[1-3 sentences describing the vulnerability. What is it, where is it, why does it matter.]

#### Impact
[What can an attacker achieve? Data exposure? RCE? Privilege escalation? Include blast radius.]

#### Evidence

```
[Proof of concept: HTTP request/response, code snippet, screenshot reference, command output]
[Include timestamps, session context, and exact reproduction steps]
```

**Reproduction Steps:**
1. [Step 1]
2. [Step 2]
3. [Step 3]

#### Remediation
[Specific fix recommendation. Include code example if applicable.]

```
[Remediation code snippet or configuration change]
```

#### Validation Notes
[How to verify the fix. What tests confirm the issue is resolved.]

#### References
- [CVE/CWE/OWASP reference]
- [Vendor advisory or documentation]
- [Related findings in this assessment]

---

## Finding Status Legend

| Status | Meaning |
|--------|---------|
| **Suspected** | Pattern matches or indicators found, not yet validated with PoC |
| **Confirmed** | Validated with working PoC, reproducible |
| **Remediated** | Fix applied, retest confirms resolution |
| **False Positive** | Investigation determined no actual vulnerability |
| **Accepted Risk** | Stakeholder acknowledged and accepted the risk |

---

## Report Sections

A complete report includes:

1. **Assessment Summary** — scope, dates, authorization
2. **Executive Summary** — high-level findings and risk posture
3. **Methodology** — tools used, approach, coverage notes
4. **Findings** — individual findings using template above
5. **Finding Summary Table** — all findings in tabular form
6. **Remediation Priority** — ordered by severity and exploitability
7. **Appendices** — raw data, full PoC output, tool configurations

### Finding Summary Table

| ID | Title | Severity | Confidence | Status | Target |
|----|-------|----------|------------|--------|--------|
| F-001 | [Title] | S1 | C1 | Confirmed | [Target] |
| F-002 | [Title] | S3 | C2 | Suspected | [Target] |

---

## Output Format Notes

- Use markdown for all reports
- Each finding is self-contained and independently reviewable
- Suspected findings clearly marked — never present speculation as confirmed
- All evidence timestamped and reproducible
- Remediation advice is specific and actionable, not generic
- Severity and confidence always use matrix definitions from `references/severity-matrix.md`
