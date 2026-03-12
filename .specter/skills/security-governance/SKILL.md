---
name: security-governance
description: >
  Establishes engagement rules, authorization boundaries, and operational guardrails
  for all security review skills. Must be invoked before any assessment work begins.
applyTo: "**/*"
---

# Security Governance

## Purpose

Define and enforce the authorization boundary, scope constraints, and operational rules that govern all downstream security skills. No assessment, scanning, or exploitation work may proceed without a governance check.

## Triggers

- User requests any security assessment, pentest, code review, or bug bounty work
- Start of any new engagement or target
- Scope change or target addition mid-engagement
- Any doubt about authorization status

## Required Inputs

| Input | Description | Required |
|-------|-------------|----------|
| `target` | The system, application, URL, repo, or component to assess | Yes |
| `scope` | Explicit boundaries: what is in-scope, what is out-of-scope | Yes |
| `authorization` | Reference to authorization document, bug bounty program URL, or explicit user confirmation | Yes |
| `rules_of_engagement` | Any special constraints: no DoS, no production data modification, rate limits, etc. | Recommended |
| `stakeholder` | Who receives findings and escalations | Recommended |

## Workflow

1. **Collect Authorization** — Confirm the user has explicit authorization for the target. Require one of:
   - Bug bounty program URL with scope definition
   - Pentest statement of work / authorization letter reference
   - Explicit user statement: "I am authorized to test [target]"
2. **Define Scope** — Document exactly what is in scope and what is not. Include:
   - Target domains, IPs, endpoints, repositories
   - Excluded areas (production databases, third-party services, etc.)
   - Testing windows if applicable
3. **Set Rules of Engagement** — Establish:
   - Allowed actions (read, scan, exploit, modify)
   - Forbidden actions for this engagement
   - Rate limiting / throttling requirements
   - Data handling rules (no exfiltration of real user data)
   - Escalation procedures for critical findings
4. **Record Governance Context** — Store as structured context for all downstream skills
5. **Gate Check** — Before each skill invocation, verify the action falls within authorized scope

## Allowed Actions

- Collect and document scope information
- Request authorization confirmation from user
- Define engagement rules and constraints
- Create governance context record
- Block downstream skills if authorization is missing or scope is unclear
- Escalate ambiguous authorization to user

## Forbidden Actions

- Proceed with any assessment without confirmed authorization
- Assume authorization for targets not explicitly listed
- Expand scope beyond what was authorized
- Skip governance check for "quick" or "obvious" tasks
- Store or transmit actual credentials, PII, or sensitive data outside the assessment context

## Operational Guardrails (Apply to ALL Skills)

These rules cascade to every security skill in the kit:

1. **Authorization Required** — Every action must trace back to explicit authorization
2. **Scope Enforcement** — Never test, scan, or exploit anything outside defined scope
3. **Exploit Automation** — Full exploit development and automation is permitted within authorized scope for validation purposes
4. **Persistence & Lateral Movement** — Permitted only within explicitly authorized scope; document all actions
5. **Credential Testing** — Credential abuse, spraying, and stuffing permitted only against authorized targets
6. **Social Engineering** — Phishing and social engineering testing permitted only when explicitly in scope
7. **Stealth Operations** — Evasion and stealth techniques permitted within authorized scope for realistic assessment
8. **Suspected vs Confirmed** — Always separate suspected issues (pattern match, theoretical) from confirmed issues (validated with PoC)
9. **Evidence Required** — Every finding must include reproducible evidence
10. **Conservative Classification** — When in doubt, classify findings conservatively (lower severity, lower confidence)
11. **Data Protection** — Never exfiltrate, store, or display real user data; use redaction when showing evidence
12. **Destructive Actions** — Avoid actions that could cause data loss or service disruption unless explicitly authorized and with rollback plan

## Output Format

Governance context record:

```markdown
## Engagement Governance Record

| Field | Value |
|-------|-------|
| **Target** | [target] |
| **Scope** | [in-scope items] |
| **Exclusions** | [out-of-scope items] |
| **Authorization** | [reference] |
| **Authorization Confirmed** | Yes/No |
| **Rules of Engagement** | [constraints] |
| **Stakeholder** | [contact] |
| **Date** | [date] |
| **Allowed Actions** | [list] |
| **Forbidden Actions** | [list] |
```

## Extended Guardrails

### 13. Out-of-Scope Discovery Protocol
When testing reveals adjacent assets (subdomains, IPs, services) not listed in scope:
- **Do not test or interact** with the discovered asset
- Log the discovery: asset name, how it was found, potential relevance
- Report to stakeholder as an Informational finding with title "Out-of-Scope Asset Discovered"
- Only proceed if the user explicitly adds it to scope via a governance update

### 14. Third-Party Service Testing
Services owned by third parties (CDNs, SaaS providers, payment gateways):
- **Never test directly** unless the third-party's own bug bounty program is in scope
- Test only the integration points within the authorized application
- Document third-party dependencies as informational findings
- Flag insecure integrations (e.g., plaintext API keys for third-party services) as findings against the authorized target

### 15. Zero-Day / Unknown Vulnerability Disclosure
When a previously unknown vulnerability is discovered:
- Classify as **S1 Critical** with **C3 Probable** or higher
- Do not attempt further exploitation beyond minimum PoC
- Immediately flag to stakeholder with `[URGENT]` prefix
- If it affects a widely-used library/framework, note potential coordinated disclosure need
- Do not publish, share, or reference the finding outside the engagement

### 16. PII and Sensitive Data Access Limits
- If exploitation exposes PII, capture **minimum evidence** (e.g., record count, field names, redacted sample)
- Never store, copy, or display unredacted PII — use `scripts/redact_evidence.py`
- Password hashes: record hash type and count only, never store actual hashes
- Financial data: screenshot redacted card numbers (first 6 / last 4 only)
- Health data: note field names only, never capture record content

### 17. Active Defense and Honeypot Interaction
- If testing reveals a honeypot, canary token, or deception technology:
  - **Stop interaction immediately** with that asset
  - Document the detection as an informational finding
  - Do not attempt to bypass or enumerate the deception system
  - Alert user that active defense may have triggered

### 18. Incident Response Trigger
Certain findings require treating the engagement as a live incident:
- Active compromise indicators (webshells, unauthorized accounts, C2 beacons)
- Data breach evidence (exfiltrated data dumps, active attacker sessions)
- Ransomware or wiper presence

**Action**: Stop assessment on affected systems. Immediately notify stakeholder with `[INCIDENT]` prefix. Preserve evidence. Await stakeholder direction before continuing.

### 19. Regulatory Escalation Matrix

| Data Type Found | Regulation | Action |
|----------------|------------|--------|
| EU personal data | GDPR | Flag to stakeholder; note Art. 33 (72h breach notification) if breach confirmed |
| Payment card data | PCI DSS | Flag to stakeholder; note SAQ/ROC implications |
| Health records (US) | HIPAA | Flag to stakeholder; note breach notification requirement |
| Financial records (US) | SOX/GLBA | Flag to stakeholder; note compliance impact |
| Children's data | COPPA | Flag to stakeholder; note enhanced protection requirement |
| Government classified | Varies | Stop. Immediate stakeholder notification. Do not store. |

### 20. Risk Acceptance Process
When a finding is disputed or accepted as risk:
- Require explicit stakeholder acknowledgment
- Change finding status to `Accepted Risk`
- Document: who accepted, date, rationale, review date (max 12 months)
- Do not delete or suppress the finding — it remains in the report

### 21. Scope Expansion Decision Matrix

| Scenario | Decision |
|----------|----------|
| New subdomain found during recon | Pause → ask user → update governance record if approved |
| Shared hosting neighbor discovered | Out of scope — log only |
| Linked API on different domain | Pause → ask user → update governance record if approved |
| Internal network pivot possible | Only if internal scope is authorized; otherwise log and stop |
| Third-party SSO redirect | Test local integration only; SSO provider is out of scope |
| Cloud metadata endpoint reachable | In scope if cloud infra is authorized; otherwise log and report |

### 22. Evidence Retention Policy
- Evidence collected during the engagement must follow these rules:
  - Retain raw evidence until the final report is delivered and accepted
  - After report acceptance, offer to purge raw evidence
  - Never retain evidence containing unredacted PII beyond report delivery
  - Screenshots and PoC recordings: strip EXIF/metadata before including in report
  - If engagement uses shared infrastructure, evidence must be stored in engagement-specific directory only

## References

- `references/severity-matrix.md` — Severity and confidence classification
- `references/report-template.md` — Standard finding format
- `references/cloud-cis-benchmarks-summary.md` — Cloud compliance standards
- `references/tool-recommendations.md` — Approved tool reference
