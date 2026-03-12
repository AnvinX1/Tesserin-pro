---
name: threat-modeling
description: >
  Proactive threat identification using structured frameworks (STRIDE, PASTA).
  Models data flows, trust boundaries, and threat actors to prioritize security
  testing and contextualize findings with business risk.
applyTo: "**/*"
---

# Threat Modeling

## Purpose

Proactively identify threats before or during security assessment using structured frameworks. While other skills are reactive (find vulnerabilities), threat modeling maps the system's design, data flows, trust boundaries, and threat actors to prioritize testing and contextualize findings with business risk. Produces threat models that guide all downstream assessment skills.

## Triggers

- Start of new engagement (before detailed testing)
- New system architecture or major feature being designed
- User requests threat model
- Complex system where testing priorities are unclear
- Findings need business risk contextualization
- Architecture review or design security assessment

## Required Inputs

| Input | Description | Required |
|-------|-------------|----------|
| `governance_context` | Active engagement governance record | Yes |
| `system_description` | Architecture docs, diagrams, or code structure | Yes |
| `data_classification` | What sensitive data the system handles | Recommended |
| `threat_actors` | Who might attack (external, insider, competitor, nation-state) | Recommended |
| `business_context` | Business value, regulatory requirements, risk appetite | Recommended |
| `existing_controls` | Current security measures in place | Recommended |

## Workflow

1. **System Decomposition** — Break system into components:
   - External entities (users, third-party services, external APIs)
   - Processes (application components, microservices, serverless functions)
   - Data stores (databases, caches, file storage, message queues)
   - Data flows (between each component, protocols used)
   - Trust boundaries (network zones, authentication boundaries, privilege levels)

2. **Data Flow Diagram (DFD)** — Create structured representation:

   ```
   Level 0: Context diagram (system as single process, external entities)
   Level 1: Major subsystems and data stores
   Level 2: Individual processes and detailed data flows
   ```

   For each data flow, document:
   - Source → Destination
   - Data type and sensitivity classification
   - Protocol and encryption
   - Authentication and authorization mechanism
   - Trust boundary crossings

3. **STRIDE Analysis** — For each component and data flow:

   | Threat | Question | Example |
   |--------|----------|---------|
   | **S**poofing | Can an attacker impersonate a legitimate entity? | Stolen JWT, forged certificate, session hijack |
   | **T**ampering | Can data be modified in transit or at rest? | Man-in-the-middle, SQL injection, parameter tampering |
   | **R**epudiation | Can actors deny their actions? | Missing audit logs, unsigned transactions |
   | **I**nformation Disclosure | Can sensitive data be exposed? | Unencrypted traffic, verbose errors, directory listing |
   | **D**enial of Service | Can the system be made unavailable? | Resource exhaustion, algorithmic complexity, unbounded queries |
   | **E**levation of Privilege | Can an attacker gain higher access? | IDOR, missing authorization, kernel exploit, container escape |

4. **PASTA Analysis** (if business risk context available):

   | Stage | Activity |
   |-------|----------|
   | 1. Define Objectives | Business objectives, security requirements, compliance mandates |
   | 2. Define Technical Scope | Architecture, technologies, dependencies, infrastructure |
   | 3. Application Decomposition | DFD, trust boundaries, entry points, assets |
   | 4. Threat Analysis | Threat intelligence, relevant attack patterns, known TTPs |
   | 5. Vulnerability Analysis | Map to known weaknesses, correlate with CVEs |
   | 6. Attack Modeling | Attack trees, kill chains for highest-risk scenarios |
   | 7. Risk & Impact Analysis | Quantify risk: likelihood × impact, prioritize by business value |

5. **Threat Actor Profiling** — For each relevant actor:

   | Actor | Capability | Motivation | Typical TTPs |
   |-------|-----------|------------|--------------|
   | Script kiddie | Low | Notoriety, fun | Public exploits, automated scanners |
   | Opportunistic attacker | Medium | Financial gain | Known CVEs, credential stuffing, phishing |
   | Organized crime | High | Financial gain, ransomware | Spear phishing, zero-days, persistence |
   | Insider threat | Medium-High | Revenge, financial, espionage | Authorized access abuse, data exfiltration |
   | Competitor | Medium-High | Competitive advantage | Targeted attacks, IP theft |
   | Nation-state | Very High | Espionage, disruption | APT, supply chain, zero-days, infrastructure |

6. **Attack Tree Construction** — For top threats:
   - Define attacker goal (root node)
   - Map alternative paths to achieve goal (OR nodes)
   - Map required conditions for each path (AND nodes)
   - Annotate with: difficulty, detectability, existing controls
   - Identify: cheapest/easiest path = highest priority for testing

7. **Risk Prioritization** — Rank threats by:
   - Likelihood (actor capability × exploitability × exposure)
   - Impact (confidentiality, integrity, availability, financial, regulatory)
   - Existing control effectiveness
   - Detection capability

8. **Testing Priority Map** — Translate threats to testing actions:
   - Map each high-priority threat to specific assessment skill(s)
   - Define test scenarios that validate each threat
   - Prioritize assessment skill execution order based on threat ranking
   - Identify gaps: threats that current skills can't address

9. **Output** — Deliver threat model document and testing priority guide

## Allowed Actions

- Analyze architecture documents and diagrams
- Review source code structure for system decomposition
- Create data flow diagrams from available information
- Perform STRIDE/PASTA analysis
- Profile threat actors relevant to target
- Construct attack trees
- Prioritize threats by risk
- Map threats to assessment skills and test scenarios
- Identify security control gaps

## Forbidden Actions

- Perform active testing during threat modeling (this is analysis only)
- Make assumptions about system behavior without documenting them
- Skip threat categories because "they probably don't apply"
- Produce generic threat models not tailored to the specific system
- Ignore business context when available
- Dismiss low-likelihood threats without documenting reasoning

## Output Format

### Threat Model

```markdown
## Threat Model: [System Name]

### System Overview
[2-3 sentences: what the system does, key data, users]

### Data Flow Summary

| # | Flow | Source → Destination | Data | Protocol | Auth | Trust Boundary Crossing |
|---|------|---------------------|------|----------|------|------------------------|
| 1 | User login | Browser → API | Credentials | HTTPS | None → Session | External → DMZ |
| 2 | API to DB | API Server → PostgreSQL | User data | TCP/TLS | Service account | DMZ → Internal |

### STRIDE Threat Register

| ID | Component/Flow | Threat Type | Threat Description | Likelihood | Impact | Risk | Existing Control | Gap |
|----|---------------|-------------|-------------------|------------|--------|------|-----------------|-----|
| T-001 | User login | Spoofing | Credential stuffing, brute force | High | High | S1 | Rate limiting | No MFA |
| T-002 | API to DB | Tampering | SQL injection | Medium | Critical | S1 | Parameterized queries | None verified |
| T-003 | File upload | Elevation | RCE via malicious upload | Medium | Critical | S1 | Extension check | No content validation |

### Attack Trees (Top 3 Threats)

\```
Goal: Account Takeover
├── OR: Credential Theft
│   ├── AND: Phishing + No MFA
│   ├── AND: Credential Stuffing + Weak Rate Limiting
│   └── AND: Session Hijack + Missing Secure Cookie Flags
├── OR: Authorization Bypass
│   ├── IDOR on /api/users/:id
│   └── JWT algorithm confusion
└── OR: Password Reset Abuse
    └── AND: Predictable token + No rate limit on reset
\```

### Testing Priority Map

| Priority | Threat | Assessment Skill | Test Scenario |
|----------|--------|-----------------|---------------|
| 1 | T-001: Credential stuffing | api-security-review | Test rate limiting on /login |
| 2 | T-002: SQL injection | secure-code-review + exploit-validation | Review query construction, test payloads |
| 3 | T-003: Malicious file upload | exploit-validation | Upload polyglot, test execution |

### Assumptions & Limitations
[Documented assumptions made during modeling]
```

## References

- `references/severity-matrix.md` — Risk rating alignment
- `references/web-common-risks.md` — Threat-to-vulnerability mapping
- `references/authz-and-authn-checklist.md` — Authentication threat patterns
