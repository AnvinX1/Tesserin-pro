---
name: dependency-and-secret-audit
description: >
  Audit third-party dependencies for known vulnerabilities and detect hardcoded
  secrets, API keys, and credentials in source code, configuration, and git history.
applyTo: "**/*.{json,lock,toml,cfg,txt,xml,gradle,pom,csproj,gemfile,pipfile,go.sum,go.mod,cargo.toml,cargo.lock,package.json,package-lock.json,yarn.lock,pnpm-lock.yaml,requirements.txt,Pipfile.lock,composer.json,composer.lock,build.gradle,pom.xml,*.csproj,Gemfile.lock,mix.lock,pubspec.lock,env,env.*,.env,.env.*}"
---

# Dependency & Secret Audit

## Purpose

Systematically audit the project's dependency tree for known vulnerabilities (CVEs) and scan the codebase for hardcoded secrets, API keys, tokens, and credentials. Identify supply chain risks, outdated components, and configuration-level secret exposure.

## Triggers

- User requests dependency or secret audit
- New project onboarded for security review
- Dependency files modified (package.json, requirements.txt, go.mod, etc.)
- CI/CD pipeline review needed
- Code review surfaces potential secret or vulnerable dependency
- Recon identifies technology versions for CVE matching

## Required Inputs

| Input | Description | Required |
|-------|-------------|----------|
| `governance_context` | Active engagement governance record | Yes |
| `target_directory` | Root directory of the project | Yes |
| `package_manager` | npm, pip, go, maven, cargo, gem, composer, etc. | Auto-detected |
| `focus` | `dependencies`, `secrets`, or `both` (default: `both`) | No |

## Workflow

### Part A: Dependency Audit

1. **Identify Package Manager** — Detect from lockfiles and manifest files:
   - Node.js: `package.json`, `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`
   - Python: `requirements.txt`, `Pipfile`, `Pipfile.lock`, `pyproject.toml`, `poetry.lock`
   - Go: `go.mod`, `go.sum`
   - Java: `pom.xml`, `build.gradle`
   - Ruby: `Gemfile`, `Gemfile.lock`
   - PHP: `composer.json`, `composer.lock`
   - Rust: `Cargo.toml`, `Cargo.lock`
   - .NET: `*.csproj`, `packages.config`

2. **Extract Dependencies** — Parse manifest and lockfiles. Catalog:
   - Direct dependencies with versions
   - Transitive dependencies (from lockfiles)
   - Dev vs production dependencies

3. **CVE Lookup** — For each dependency:
   - Check version against known CVEs (NVD, GitHub Advisories, OSV)
   - Use native audit commands where available:
     - `npm audit` / `yarn audit` / `pnpm audit`
     - `pip-audit` / `safety check`
     - `go vuln check` (govulncheck)
     - `bundle audit`
     - `cargo audit`
   - Cross-reference with Snyk, Trivy, or Grype if available
   - Flag: CVE ID, severity, affected versions, fixed version

4. **Supply Chain Risk Assessment** — Check for:
   - Typosquatting (similar package names to popular packages)
   - Dependency confusion (private package names matching public ones)
   - Abandoned/unmaintained packages (no updates in 2+ years)
   - Packages with post-install scripts doing unusual things
   - Excessive transitive dependency trees
   - Pinning: are versions pinned or using floating ranges?

5. **License Risk** — Flag:
   - Copyleft licenses in proprietary projects (GPL, AGPL)
   - Unknown/missing licenses
   - License incompatibilities

### Part B: Secret Detection

6. **File Scan** — Search for secrets in:
   - Source code files (all languages)
   - Configuration files (`.env`, `config.*`, `settings.*`, `*.yml`, `*.yaml`, `*.toml`, `*.ini`)
   - Docker files (`Dockerfile`, `docker-compose.*`)
   - CI/CD configs (`.github/workflows/*`, `.gitlab-ci.yml`, `Jenkinsfile`, `.circleci/*`)
   - Documentation and README files
   - Terraform/CloudFormation/Pulumi files

7. **Pattern Matching** — Scan for:
   - API keys (AWS, GCP, Azure, Stripe, Twilio, SendGrid, etc.)
   - OAuth tokens and secrets
   - Database connection strings with credentials
   - Private keys (RSA, SSH, PGP)
   - JWT secrets
   - Generic high-entropy strings in assignment context
   - Common variable names: `password`, `secret`, `token`, `api_key`, `access_key`
   - Base64-encoded credentials

8. **Git History Scan** — Check for secrets in:
   - Previous commits (rotated but still in history)
   - Deleted files still in git objects
   - Branch-specific secrets
   - Use: `git log -p --all -S 'password\|secret\|api_key\|token'`

9. **Environment & Config Hygiene** — Verify:
   - `.env` files in `.gitignore`
   - Secrets manager integration (Vault, AWS SSM, etc.)
   - No secrets in build logs or CI output
   - Config files don't have production secrets

10. **Classify & Triage** — For each finding:
    - Determine if secret is live/active (if testable within scope)
    - Assess blast radius (what does this key access?)
    - Assign severity based on secret type and exposure
    - Route to `bug-bounty-triage`

## Allowed Actions

- Read all project files for secret scanning
- Parse dependency manifests and lockfiles
- Run native audit commands (`npm audit`, `pip-audit`, etc.)
- Search git history for secret patterns
- Cross-reference dependency versions with CVE databases
- Analyze entropy of suspected secrets
- Classify and triage findings
- Recommend secret rotation and dependency updates

## Forbidden Actions

- Use discovered secrets to access external services (unless part of authorized exploit-validation)
- Exfiltrate or store discovered secrets outside the assessment context
- Modify dependency files without explicit user permission
- Skip git history scan when reviewing for secrets
- Report all high-entropy strings as secrets without context analysis
- Assume a secret is inactive without evidence

## Output Format

### Dependency Finding

```markdown
### [FINDING-ID]: Vulnerable Dependency — [package@version]

| Field | Value |
|-------|-------|
| **Severity** | [S1-S5] based on CVE severity |
| **Confidence** | [C1-C4] |
| **Status** | Confirmed (CVE match) |
| **Category** | CWE-1035: Vulnerable Third-Party Component |
| **Affected File** | [manifest file path] |
| **CVE** | [CVE-XXXX-XXXXX] |

#### Issue Summary
[Package] version [X.Y.Z] has known vulnerability [CVE]. [Brief description of the vulnerability.]

#### Impact
[What can be exploited via this vulnerability. Is it reachable in this codebase?]

#### Evidence
- Dependency declared in: [file:line]
- Vulnerable version: [version]
- Fixed in version: [version]
- CVE details: [brief]
- Reachability: [Is vulnerable function actually used? Code path analysis.]

#### Remediation
Update [package] to version [X.Y.Z] or later.
\```bash
[package manager update command]
\```

#### Validation Notes
Run `[audit command]` after update to confirm resolution.
```

### Secret Finding

```markdown
### [FINDING-ID]: Exposed Secret — [type]

| Field | Value |
|-------|-------|
| **Severity** | [S1-S5] |
| **Confidence** | [C1-C4] |
| **Status** | Suspected / Confirmed |
| **Category** | CWE-798: Hardcoded Credentials |
| **Affected File** | [file:line] |

#### Issue Summary
[Type of secret] found hardcoded in [file]. [Context of exposure.]

#### Impact
[What this secret provides access to. Blast radius.]

#### Evidence
\```
[file:line — showing context with secret REDACTED]
[e.g., API_KEY = "REDACTED_ak_live_****"]
\```
- Location: [file path and line]
- Type: [API key / password / token / private key]
- Committed in: [git commit hash if in history]

#### Remediation
1. Rotate the exposed secret immediately
2. Move to environment variable or secrets manager
3. Add file pattern to `.gitignore`
4. If in git history: consider `git filter-repo` or BFG Repo Cleaner
5. Revoke old credential with provider

#### Validation Notes
- Verify new secret works in application
- Confirm old secret is revoked
- Verify `.gitignore` prevents future commits
```

## References

- `references/secrets-and-config-checklist.md` — Detailed secret detection patterns
- `references/severity-matrix.md` — Severity classification
- `references/report-template.md` — Report format
