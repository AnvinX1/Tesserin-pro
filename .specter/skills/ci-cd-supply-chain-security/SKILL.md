---
name: ci-cd-supply-chain-security
description: >
  Audit CI/CD pipelines and software supply chains for poisoning vectors, secret
  exposure, artifact tampering, dependency confusion, and build environment compromise.
  Covers GitHub Actions, GitLab CI, Jenkins, and container build pipelines.
applyTo: "**/*.{yml,yaml,json,groovy,Jenkinsfile,Dockerfile,dockerfile,toml,cfg,sh,bash,ps1}"
---

# CI/CD & Supply Chain Security

## Purpose

Audit continuous integration/delivery pipelines and software supply chains for compromise vectors. CI/CD systems are high-value targets: they hold deployment credentials, build artifacts, and have write access to production. Supply chain attacks (dependency confusion, typosquatting, artifact tampering) bypass traditional application security controls entirely.

## Triggers

- CI/CD configuration files found in repository (.github/workflows, .gitlab-ci.yml, Jenkinsfile)
- User requests pipeline security review
- Dependency audit surfaces supply chain concerns
- New deployment pipeline being configured
- Security governance engagement includes infrastructure

## Required Inputs

| Input | Description | Required |
|-------|-------------|----------|
| `governance_context` | Active engagement governance record | Yes |
| `pipeline_configs` | CI/CD config files (workflow YAML, Jenkinsfile, etc.) | Yes |
| `ci_platform` | GitHub Actions, GitLab CI, Jenkins, CircleCI, etc. | Auto-detected |
| `package_registries` | npm, PyPI, Docker Hub, internal registries in use | Recommended |
| `deployment_targets` | Where artifacts deploy to (cloud, K8s, servers) | Recommended |

## Workflow

1. **Scope Verification** — Confirm CI/CD systems and registries are within authorized scope.

2. **Pipeline Configuration Review**

   **GitHub Actions:**
   - [ ] Review all workflow files in `.github/workflows/`
   - [ ] Check `pull_request_target` trigger (runs with write access on untrusted PR)
   - [ ] Check `workflow_run` chaining for privilege escalation
   - [ ] Review `permissions:` block — avoid default write-all
   - [ ] Check for `${{ github.event.*.body }}` or similar injection in `run:` steps
   - [ ] Verify actions pinned to SHA (not tag/branch — mutable references)
   - [ ] Review third-party actions for trust (verified publisher, source audit)
   - [ ] Check `GITHUB_TOKEN` permissions scope
   - [ ] Review secret access: which jobs/steps can access which secrets?
   - [ ] Check for `if:` conditions that can be bypassed
   - [ ] Review artifact upload/download for path traversal

   **GitLab CI:**
   - [ ] Review `.gitlab-ci.yml` and included templates
   - [ ] Check for script injection via CI/CD variables
   - [ ] Review protected branches and variable protection
   - [ ] Check runner configuration (shared vs. dedicated)
   - [ ] Review merge request pipeline vs. branch pipeline trust
   - [ ] Verify container image sources in `image:` directives
   - [ ] Check for `artifacts:` exposure across jobs
   - [ ] Review `trigger:` for cross-project pipeline abuse

   **Jenkins:**
   - [ ] Review Jenkinsfile and shared libraries
   - [ ] Check for Groovy sandbox escapes
   - [ ] Review plugin security (known CVEs in installed plugins)
   - [ ] Check node/agent security (who can run on which agent?)
   - [ ] Review credential binding and credential scope
   - [ ] Check for `sh` steps with injected variables
   - [ ] Review pipeline approval gates and access controls

   **General Pipeline Security:**
   - [ ] Secrets not echoed/printed in build logs
   - [ ] Build environment hardened (minimal tools, no unnecessary network)
   - [ ] Pipeline steps run as non-root where possible
   - [ ] Build cache not shared across untrusted builds
   - [ ] Artifact signing implemented
   - [ ] Reproducible builds configured where feasible

3. **Secret Exposure in Pipelines**
   - Secrets in environment variables visible to all steps (not scoped)
   - Secrets printed in debug/verbose build output
   - Secrets in build artifacts or container layers
   - Secrets accessible from pull request / merge request pipelines (untrusted code)
   - Secret rotation: how often? Automated?
   - Emergency revocation process for compromised pipeline secrets

4. **Dependency Supply Chain Analysis**

   **Dependency Confusion / Substitution:**
   - Private package names registered on public registries?
   - Package manager configured to check private registry first?
   - Scoped packages used (@org/package-name)?
   - Lock files pinned to specific versions with integrity hashes?

   **Typosquatting:**
   - Dependencies with similar names to popular packages?
   - Dependencies with very few downloads / recent creation date?

   **Compromised Maintainer:**
   - Dependencies maintained by single developer?
   - Recent ownership transfers on dependencies?
   - Post-install scripts doing network calls or suspicious operations?

   **Build-Time Attacks:**
   - Setup.py / postinstall scripts executing arbitrary code
   - Makefile targets with network access during build
   - Compiler plugins or build tool extensions from untrusted sources

5. **Artifact Integrity**
   - Container images signed (Docker Content Trust, cosign/sigstore)?
   - Package artifacts signed and checksum-verified?
   - SBOM (Software Bill of Materials) generated?
   - Provenance attestation (SLSA framework compliance)?
   - Artifact storage access controls (who can push to registry)?
   - Immutable tags/versions enforced (prevent tag overwrite)?

6. **Container Build Security**
   - Base images from trusted sources? Pinned by digest (not :latest)?
   - Multi-stage builds to minimize attack surface?
   - No secrets in Dockerfile (ENV, ARG, COPY of .env)
   - No secrets in container layers (check with `dive` or `docker history`)
   - Container scanning in pipeline (Trivy, Grype, Snyk Container)?
   - Non-root USER directive?
   - Minimal OS packages installed?

7. **Deployment Pipeline Security**
   - Deployment credentials scoped to minimum necessary permissions?
   - Deployment approval gates for production?
   - Rollback mechanism tested and functional?
   - Deployment audit trail (who deployed what, when)?
   - Canary/blue-green deployment with security validation gate?
   - Infrastructure-as-Code changes reviewed before apply?

8. **SLSA Framework Assessment** (if applicable)
   - SLSA Level 1: Build process documented
   - SLSA Level 2: Hosted build platform, signed provenance
   - SLSA Level 3: Hardened build platform, non-falsifiable provenance
   - SLSA Level 4: Hermetic, reproducible build

9. **Classify & Route** — Per `severity-matrix.md`, route to `bug-bounty-triage`

## Allowed Actions

- Read and analyze all CI/CD configuration files
- Review pipeline execution logs (if authorized)
- Analyze dependency manifests and lock files
- Test for dependency confusion on public registries (passive lookup only)
- Review container image layers and build history
- Analyze artifact signing and provenance
- Check build environment configuration
- Review secret management integration
- Assess SLSA compliance level

## Forbidden Actions

- Execute code in CI/CD environments without authorization
- Publish packages to public registries
- Modify pipeline configurations without permission
- Trigger pipeline runs on production branches without authorization
- Exfiltrate pipeline secrets
- Tamper with build artifacts
- Register typosquat packages (even for testing)

## Output Format

```markdown
### [FINDING-ID]: [Title]

| Field | Value |
|-------|-------|
| **Severity** | [S1-S5] |
| **Confidence** | [C1-C4] |
| **Status** | Suspected / Confirmed |
| **Category** | [CWE / SLSA / Supply Chain] |
| **CI Platform** | GitHub Actions / GitLab CI / Jenkins / Other |
| **Affected File** | [workflow file:line] |

#### Issue Summary
[What the pipeline/supply chain weakness is]

#### Evidence
\```yaml
[Pipeline config snippet showing the vulnerability]
\```

**Attack Scenario:**
1. [How attacker exploits this in practice]
2. [What access/impact attacker achieves]

#### Impact
[Credential theft, artifact tampering, production compromise, etc.]

#### Remediation
\```yaml
[Corrected pipeline configuration]
\```

#### Validation Notes
[How to verify fix: test pipeline, check permissions, validate signing]
```

## References

- `references/secrets-and-config-checklist.md` — CI/CD secret hygiene
- `references/severity-matrix.md` — Severity classification
