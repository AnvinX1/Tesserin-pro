---
name: secure-code-review
description: >
  Source-level vulnerability hunting. Systematic review of application source code
  for injection flaws, auth bypasses, logic bugs, cryptographic weaknesses, and
  unsafe patterns. Operates on code files within the workspace.
applyTo: "**/*.{js,ts,jsx,tsx,py,rb,java,go,php,cs,c,cpp,rs,swift,kt,scala,sh,bash,sql,html,xml,yaml,yml,json,toml,ini,cfg,conf,env,tf,hcl}"
---

# Secure Code Review

## Purpose

Perform systematic, source-level security analysis of application code. Identify injection vulnerabilities, authentication/authorization flaws, cryptographic weaknesses, unsafe data handling, business logic bugs, and insecure patterns. Produce actionable findings with exact file locations, code snippets, and remediation guidance.

## Triggers

- User requests code review for security issues
- New code added to repository (PR review)
- Recon analysis identifies code-level investigation targets
- Bug bounty triage routes a finding for code-level analysis
- Dependency audit surfaces code-level usage of vulnerable library

## Required Inputs

| Input | Description | Required |
|-------|-------------|----------|
| `governance_context` | Active engagement governance record | Yes |
| `target_files` | Files, directories, or patterns to review | Yes |
| `language` | Primary programming language(s) | Auto-detected |
| `framework` | Framework in use (Express, Django, Rails, etc.) | Auto-detected |
| `focus_areas` | Specific vulnerability classes to prioritize | Recommended |
| `context` | Business context: what the code does, data sensitivity | Recommended |

## Workflow

1. **Scope & Context** — Identify language, framework, and application purpose. Understand data flows and trust boundaries.

2. **Entrypoint Mapping** — Find all external input sources:
   - HTTP request handlers (routes, controllers)
   - CLI argument parsers
   - File readers / parsers
   - Database query builders
   - Message queue consumers
   - WebSocket handlers
   - Deserialization points

3. **Taint Analysis** — Trace data flow from each input source:
   - Where does user input enter?
   - What transformations are applied? (validation, sanitization, encoding)
   - Where does it reach a sink? (SQL query, command execution, HTML output, file system, redirect)
   - Are there gaps in the sanitization chain?

4. **Vulnerability Pattern Scan** — Check for each class:

   **Injection**
   - SQL injection: string concatenation in queries, missing parameterization
   - Command injection: user input in `exec`, `system`, `spawn`, `popen`
   - XSS: unescaped output in HTML, `innerHTML`, `dangerouslySetInnerHTML`
   - Template injection: user input in template strings/engines
   - Path traversal: user input in file paths without sanitization
   - LDAP/XPath/NoSQL injection: unparameterized queries
   - Header injection: user input in HTTP headers
   - Log injection: unsanitized input in log statements

   **Authentication & Session**
   - Hardcoded credentials
   - Weak password hashing (MD5, SHA1, no salt)
   - Missing authentication on endpoints
   - Session token generation (insufficient entropy)
   - Insecure "remember me" implementation
   - JWT issues: `none` algorithm, weak secret, missing validation

   **Authorization**
   - Missing authorization checks on endpoints
   - IDOR: direct object references without ownership validation
   - Privilege escalation: role checks bypassable
   - Mass assignment: unprotected model binding

   **Cryptography**
   - Weak algorithms (MD5, SHA1, DES, RC4)
   - Hardcoded keys/IVs
   - Insufficient key length
   - ECB mode usage
   - Missing integrity checks (encryption without authentication)
   - Predictable random number generation for security-sensitive operations

   **Data Handling**
   - Sensitive data in logs
   - Sensitive data in error messages
   - PII stored unencrypted
   - Missing input validation at trust boundaries
   - Unsafe deserialization
   - XML external entity (XXE) processing
   - File upload without type/size validation

   **Logic & Race Conditions**
   - TOCTOU (time-of-check-time-of-use) vulnerabilities
   - Business logic bypasses
   - Integer overflow/underflow in security-critical paths
   - Missing rate limiting on sensitive operations
   - Unsafe redirects (open redirect)
   - Error handling that reveals internal state

5. **Framework-Specific Checks** — Review for known framework pitfalls:
   - Express.js: missing `helmet`, raw body parsing, prototype pollution
   - Django: `| safe` filter misuse, CSRF exemptions, `DEBUG=True`
   - Rails: `html_safe`, mass assignment, `render inline:`
   - Spring: SpEL injection, actuator exposure, CSRF config
   - React: `dangerouslySetInnerHTML`, state exposure
   - PHP: `eval()`, `include` with user input, type juggling

6. **Severity Assessment** — For each finding, apply `references/severity-matrix.md`

7. **Remediation** — Provide specific fix for each finding with corrected code example

## Allowed Actions

- Read and analyze all source code files within authorized scope
- Search for patterns using grep, AST queries, or regex
- Trace data flows across files and modules
- Identify vulnerable code patterns
- Generate remediation code examples
- Execute static analysis commands (linters, SAST tools) within workspace
- Review git history for security-relevant changes
- Analyze configuration files for security settings
- Cross-reference with known CVE patterns in dependencies

## Forbidden Actions

- Modify source code without explicit user permission
- Execute the application code (static analysis only unless exploit-validation is invoked)
- Access files outside authorized scope
- Report code style issues as security findings
- Skip context analysis and rely solely on pattern matching
- Present theoretical issues as confirmed without explaining conditions needed

## Output Format

### Finding

```markdown
### [FINDING-ID]: [Title]

| Field | Value |
|-------|-------|
| **Severity** | [S1-S5] |
| **Confidence** | [C1-C4] |
| **Status** | Suspected / Confirmed |
| **Category** | [CWE-XXX: Category Name] |
| **Affected File(s)** | [file:line] |

#### Issue Summary
[What the vulnerability is and why it's exploitable]

#### Vulnerable Code
\```[language]
// file: [path]:[line range]
[exact vulnerable code snippet]
\```

#### Attack Scenario
[How an attacker exploits this. Include example payload if applicable.]

#### Impact
[What can be achieved: data exposure, RCE, privilege escalation, etc.]

#### Evidence
[Taint trace: input source → transformations → dangerous sink]

#### Remediation
\```[language]
// Corrected code
[fixed code snippet]
\```

#### Validation Notes
[How to verify the fix works. Test cases to confirm remediation.]
```

## References

- `references/web-common-risks.md` — Vulnerability taxonomy
- `references/authz-and-authn-checklist.md` — Auth review checklist
- `references/secrets-and-config-checklist.md` — Secrets in code
- `references/severity-matrix.md` — Severity classification
