---
name: evidence-and-reporting
description: >
  Compile, format, and generate security assessment reports from triaged findings.
  Produces consistent, professional reports with executive summaries, finding details,
  remediation guidance, and validation notes.
applyTo: "**/*"
---

# Evidence & Reporting

## Purpose

Transform triaged security findings into structured, professional reports. Ensure all findings have complete evidence, consistent formatting, proper severity classification, and actionable remediation. Generate executive summaries, finding detail sections, and remediation priority lists.

## Triggers

- Assessment complete, findings ready for report
- User requests report generation
- Finding batch reaches reporting threshold
- Stakeholder requests status update
- Individual finding needs formal documentation

## Required Inputs

| Input | Description | Required |
|-------|-------------|----------|
| `governance_context` | Active engagement governance record | Yes |
| `findings` | Triaged findings from `bug-bounty-triage` | Yes |
| `report_type` | `full`, `executive`, `finding-only`, `delta` | Default: `full` |
| `audience` | `technical`, `executive`, `mixed` | Default: `mixed` |

## Workflow

1. **Validate Findings** — For each finding, verify:
   - [ ] Title is concise and descriptive
   - [ ] Severity and confidence assigned per `severity-matrix.md`
   - [ ] Status clearly marked: Suspected, Confirmed, Remediated, False Positive
   - [ ] Evidence is present and reproducible
   - [ ] Affected target precisely identified
   - [ ] Impact clearly stated
   - [ ] Remediation is specific and actionable
   - [ ] Validation notes explain how to verify the fix
   - [ ] CWE or OWASP category assigned
   - [ ] No suspected findings presented as confirmed

2. **Evidence Quality Check** — Each finding must have:
   - Proof of concept or clear indicators
   - Exact reproduction steps (numbered)
   - Relevant request/response data, code snippets, or screenshots
   - Timestamps if applicable
   - Context: authentication state, user role, environment
   - Sensitive data redacted (credentials, PII, real user data)

3. **Compile Report** — Assemble using `references/report-template.md`:

   **Full Report Structure:**
   1. Assessment Summary (scope, dates, authorization)
   2. Executive Summary (finding counts, risk posture, key themes)
   3. Methodology (skills used, tools, approach)
   4. Finding Summary Table (all findings, sortable by severity)
   5. Detailed Findings (each finding in full template format)
   6. Remediation Priority (ordered by severity × exploitability)
   7. Appendices (tool output, raw data, methodology notes)

   **Executive Report:** Sections 1, 2, 4, 6 only
   **Finding-Only:** Section 5 only
   **Delta Report:** Only new/changed findings since last report

4. **Executive Summary Generation** — Synthesize:
   - Total findings by severity level
   - Key risk themes (e.g., "authorization controls are consistently weak")
   - Most critical findings highlighted
   - Overall risk posture assessment
   - Top 3 remediation priorities

5. **Remediation Prioritization** — Order by:
   - Severity (S1 first)
   - Exploitability (easy exploits first)
   - Blast radius (wider impact first)
   - Fix complexity (quick wins elevated when severity is equal)
   - Group related findings for batch remediation

6. **Consistency Review** — Verify:
   - Severity ratings are consistent across similar findings
   - Terminology is uniform throughout
   - Finding IDs are sequential and unique
   - Cross-references between related findings are correct
   - No contradictions between findings

7. **Output** — Generate formatted markdown report

## Allowed Actions

- Read and compile all triaged findings
- Generate report sections from templates
- Assign finding IDs
- Create executive summaries
- Prioritize remediations
- Cross-reference related findings
- Redact sensitive information in evidence
- Format evidence for readability
- Calculate finding statistics

## Forbidden Actions

- Fabricate or embellish evidence
- Change finding severity without documented justification
- Omit findings from reports without documented reason
- Include raw credentials or PII in reports (must redact)
- Present suspected findings as confirmed in report
- Generate reports for out-of-scope targets
- Alter reproduction steps to simplify (must be accurate)

## Output Format

### Full Report

```markdown
# Security Assessment Report

## 1. Assessment Summary

| Field | Value |
|-------|-------|
| **Assessment Name** | [name] |
| **Target** | [target] |
| **Scope** | [scope] |
| **Date** | [date] |
| **Authorization** | [reference] |
| **Methodology** | [skills and tools used] |

## 2. Executive Summary

[2-4 sentences: overall findings and risk posture]

| Severity | Count |
|----------|-------|
| Critical (S1) | X |
| High (S2) | X |
| Medium (S3) | X |
| Low (S4) | X |
| Informational (S5) | X |
| **Total** | **X** |

**Key Risk Themes:**
1. [Theme 1]
2. [Theme 2]
3. [Theme 3]

**Critical Findings Requiring Immediate Action:**
- [F-XXX]: [Title] — [one-line impact]

## 3. Methodology

[Skills invoked, tools used, approach, coverage notes]

## 4. Finding Summary

| ID | Title | Severity | Confidence | Status | Target |
|----|-------|----------|------------|--------|--------|
| F-001 | [title] | S1 | C1 | Confirmed | [target] |
| F-002 | [title] | S2 | C2 | Suspected | [target] |

## 5. Detailed Findings

### F-001: [Title]

[Full finding using template from references/report-template.md]

## 6. Remediation Priority

| Priority | Finding | Severity | Fix Complexity | Recommendation |
|----------|---------|----------|---------------|----------------|
| 1 | F-001 | S1 | Low | [brief action] |
| 2 | F-003 | S2 | Medium | [brief action] |

## 7. Appendices

[Tool output, raw data, additional context]
```

## References

- `references/report-template.md` — Finding template and report structure
- `references/severity-matrix.md` — Severity and confidence definitions
