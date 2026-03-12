---
name: bug-bounty-triage
description: >
  Intake, deduplication, severity assignment, and prioritization of security findings
  for bug bounty and pentest engagements. Processes raw findings into actionable triaged items.
applyTo: "**/*"
---

# Bug Bounty Triage

## Purpose

Process raw security findings through structured triage: validate scope, deduplicate, assign severity and confidence, prioritize, and prepare for detailed investigation or reporting. Acts as the central intake funnel for all identified issues.

## Triggers

- New potential vulnerability discovered during any assessment
- Batch of scanner results needs processing
- User submits a finding for triage
- Recon data reveals potential attack surface
- Dependency audit or code review produces candidate issues

## Required Inputs

| Input | Description | Required |
|-------|-------------|----------|
| `governance_context` | Active engagement governance record | Yes |
| `finding_raw` | Raw finding data: description, location, evidence snippet | Yes |
| `source` | Origin skill or tool that produced the finding | Yes |
| `existing_findings` | List of already-triaged findings for deduplication | Recommended |

## Workflow

1. **Scope Check** — Verify the finding target is within authorized scope per governance context. Reject out-of-scope findings immediately with documented reason.

2. **Intake & Normalize** — Parse the raw finding into standard fields:
   - Title (concise, descriptive)
   - Affected target/files
   - Vulnerability type / CWE category
   - Raw evidence

3. **Deduplication** — Compare against existing findings:
   - Same vulnerability type + same endpoint = duplicate → merge evidence
   - Same vulnerability type + different endpoint = separate finding
   - Different vulnerability type + same endpoint = separate finding
   - Related findings that chain = link with cross-reference

4. **Severity Assessment** — Apply `references/severity-matrix.md`:
   - Assign severity (S1–S5) based on impact
   - Assign confidence (C1–C4) based on evidence quality
   - Consider chaining potential — document if this finding enables escalation
   - Mark as **Suspected** or **Confirmed**

5. **Prioritization** — Rank by:
   - Severity × Confidence (highest first)
   - Exploitability (easy to exploit ranks higher)
   - Business impact (user data, financial, reputation)
   - Chaining potential

6. **Route for Action** — Direct finding to appropriate next skill using the routing matrix:

### Routing Decision Matrix

| Finding Characteristics | Route To | Trigger Condition |
|------------------------|----------|-------------------|
| Code-level flaw, needs source analysis | `secure-code-review` | Source code available, injection/logic/auth pattern |
| Needs PoC development or exploit chain | `exploit-validation` | Suspected finding, S1-S2, needs confirmation |
| Insufficient info, attack surface unclear | `indepth-recon-analysis` | Missing context, needs enumeration |
| Server/infra configuration issue | `web-misconfig-review` | Headers, TLS, CORS, directory exposure |
| API-specific vulnerability | `api-security-review` | REST/GraphQL/WebSocket endpoint |
| Dependency or supply chain issue | `dependency-and-secret-audit` | CVE in library, outdated package, leaked secret |
| Cloud infrastructure misconfiguration | `cloud-config-audit` | IAM, storage, network, compute finding |
| Container or K8s issue | `container-and-runtime-security` | Image vuln, escape path, pod misconfiguration |
| CI/CD pipeline risk | `ci-cd-supply-chain-security` | Pipeline config, artifact integrity, registry |
| Mobile app finding | `mobile-security-assessment` | APK/IPA, mobile API, certificate pinning |
| AD/identity infrastructure | `active-directory-and-identity-audit` | Kerberos, LDAP, Azure AD finding |
| Network segmentation or infra | `network-infrastructure-pentest` | Firewall, VLAN, protocol-level finding |
| Architecture/design risk | `threat-modeling` | Design flaw, missing control, trust boundary |
| Fully validated, evidence complete | `evidence-and-reporting` | Confirmed + evidence + remediation clear |

### Finding Chain Tracking

When findings can be combined for escalated impact:
- Tag each finding with `Chain-Group: [GROUP-ID]`
- Document the chain sequence: Finding A → enables → Finding B → escalates to → Impact
- Reassess severity of the **chain** (not individual findings) — chains often escalate severity
- Route the entire chain group to `exploit-validation` for combined PoC

### Delta / Retest Workflow

When reassessing previously reported findings:
- Tag with `Retest-Of: [ORIGINAL-FINDING-ID]`
- Compare current state vs original: Fixed / Partially Fixed / Unfixed / Regressed
- Update status: `Remediated` | `Suspected` (if regression) | `Confirmed` (if unfixed)
- Note bypass if original fix was incomplete

### False Positive Feedback Loop

When a finding is marked as false positive:
- Document the FP reasoning in triage notes
- Tag with `FP-Reason: [category]` — categories: environment-specific, test-data, WAF-artifact, tool-error, logic-error
- If the same FP pattern recurs (≥ 3 times from same source), record a tuning note for that source tool/skill
- Feed back to the originating skill to reduce future FP rate

7. **Document** — Record triaged finding in standard format

## Allowed Actions

- Parse and normalize finding data
- Query existing findings for deduplication
- Assign severity and confidence ratings
- Prioritize and route findings
- Merge duplicate findings with combined evidence
- Flag potential finding chains
- Request additional evidence from source skill
- Mark findings as false positive with documented reasoning

## Forbidden Actions

- Triage findings for out-of-scope targets
- Inflate severity without evidence
- Discard findings without documenting reason
- Present suspected findings as confirmed
- Modify or fabricate evidence
- Skip deduplication step

## Output Format

### Triaged Finding

```markdown
### [FINDING-ID]: [Title]

| Field | Value |
|-------|-------|
| **Severity** | [S1-S5] |
| **Confidence** | [C1-C4] |
| **Status** | Suspected / Confirmed |
| **Category** | [CWE/OWASP category] |
| **Affected Target** | [endpoint, file, component] |
| **Source** | [originating skill/tool] |
| **Duplicates** | [related finding IDs or "None"] |
| **Chain Potential** | [related findings that combine for higher impact] |
| **Next Action** | [route to skill or "Ready for Report"] |

#### Summary
[1-3 sentences]

#### Evidence (Raw)
[Unmodified evidence from source]

#### Triage Notes
[Deduplication reasoning, severity justification, routing rationale]
```

### Triage Summary Table

```markdown
| ID | Title | Severity | Confidence | Status | Next Action |
|----|-------|----------|------------|--------|-------------|
| F-001 | [title] | S1 | C1 | Confirmed | exploit-validation |
| F-002 | [title] | S3 | C3 | Suspected | secure-code-review |
```

## References

- `references/severity-matrix.md` — Severity and confidence classification
- `references/report-template.md` — Final finding format
- `references/web-common-risks.md` — Vulnerability taxonomy
- `references/owasp-api-top-10-checklist.md` — API vulnerability reference
- `references/tool-recommendations.md` — Tool selection for validation
