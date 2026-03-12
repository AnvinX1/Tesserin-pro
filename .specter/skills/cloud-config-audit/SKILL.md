---
name: cloud-config-audit
description: >
  Audit cloud infrastructure configuration for security misconfigurations across
  AWS, Azure, and GCP. Covers IAM, storage, networking, compute, and logging.
  Reviews IaC templates (Terraform, CloudFormation, Pulumi).
applyTo: "**/*.{tf,hcl,json,yaml,yml,template,cfn,bicep,pulumi.*}"
---

# Cloud Configuration Audit

## Purpose

Review cloud infrastructure configuration for security misconfigurations. Analyze Infrastructure-as-Code (IaC) templates, cloud service configurations, and deployment patterns for overly permissive access, public exposure, unencrypted resources, missing logging, and insecure defaults. Covers AWS, Azure, and GCP.

## Triggers

- IaC files (Terraform, CloudFormation, Bicep, Pulumi) present in repository
- User requests cloud security review
- Recon identifies cloud-hosted infrastructure
- Deployment configuration files need security audit
- Cloud credentials or configuration discovered in code

## Required Inputs

| Input | Description | Required |
|-------|-------------|----------|
| `governance_context` | Active engagement governance record | Yes |
| `target_files` | IaC files, cloud config, or deployment manifests | Yes |
| `cloud_provider` | AWS, Azure, GCP, or multi-cloud | Auto-detected |
| `environment` | Production, staging, development | Recommended |

## Workflow

1. **Scope Verification** — Confirm cloud resources are within authorized scope.

2. **IaC Template Analysis** — Parse and review:
   - Terraform (`.tf`, `.tfvars`, state files)
   - CloudFormation (JSON/YAML templates)
   - Azure Bicep/ARM templates
   - Pulumi programs
   - Kubernetes manifests
   - Docker Compose files
   - Helm charts

3. **IAM & Access Control Review:**

   | Check | Risk |
   |-------|------|
   | Wildcard permissions (`*`) | Excessive privilege |
   | `Action: "*"` on any resource | Admin-equivalent access |
   | Public access policies on resources | Unauthorized access |
   | Cross-account access without conditions | Trust boundary violation |
   | IAM users with inline policies | Unmanageable permissions |
   | Missing MFA requirements for privileged roles | Credential compromise risk |
   | Service accounts with excessive permissions | Lateral movement risk |
   | Assume-role trust policies too broad | Privilege escalation |
   | Missing permission boundaries | Unbounded access |

4. **Storage Security:**

   | Check | Risk |
   |-------|------|
   | S3/Blob/GCS buckets with public access | Data exposure |
   | Missing encryption at rest | Data at rest exposure |
   | Missing encryption in transit | Data in transit exposure |
   | Overly permissive bucket policies | Unauthorized access |
   | Versioning disabled (no recovery from deletion) | Data loss risk |
   | No lifecycle policies (data retention) | Compliance risk |
   | Cross-origin resource sharing on storage | Data leakage |
   | Missing access logging on storage | Audit gap |

5. **Network Security:**

   | Check | Risk |
   |-------|------|
   | Security groups with `0.0.0.0/0` ingress | Unrestricted access |
   | SSH (22) / RDP (3389) open to internet | Remote access exposure |
   | Database ports open to internet (3306, 5432, 27017, 6379) | Data exposure |
   | Missing network segmentation | Lateral movement |
   | VPC flow logs disabled | Visibility gap |
   | No WAF on public-facing applications | Missing protection |
   | Overly permissive NACLs | Network exposure |
   | Default VPC in use | Shared responsibility |

6. **Compute Security:**

   | Check | Risk |
   |-------|------|
   | Containers running as root | Privilege escalation |
   | Privileged containers | Host escape |
   | No resource limits on containers | DoS risk |
   | EC2/VM instances with public IPs without necessity | Exposure |
   | Missing instance metadata service v2 (IMDSv2) | SSRF to credential theft |
   | User data scripts containing secrets | Credential exposure |
   | Unencrypted EBS/disk volumes | Data at rest exposure |
   | Missing auto-patching / update configuration | Vulnerability window |

7. **Logging & Monitoring:**

   | Check | Risk |
   |-------|------|
   | CloudTrail/Activity Log/Audit Log disabled | No audit trail |
   | Log storage not encrypted | Log data exposure |
   | No alerting on security events | Delayed incident response |
   | Log retention too short | Compliance/forensic gap |
   | No centralized log aggregation | Visibility gap |
   | S3/storage access logging disabled | Missing audit trail |

8. **Secrets & Key Management:**

   | Check | Risk |
   |-------|------|
   | Secrets in plaintext in IaC templates | Credential exposure |
   | KMS keys with overly permissive policies | Key abuse |
   | Missing key rotation | Key compromise window |
   | Secrets in environment variables in task/container definitions | Exposure in metadata |
   | No secrets manager integration | Poor secrets hygiene |

9. **Kubernetes-Specific** (if applicable):

   | Check | Risk |
   |-------|------|
   | `hostNetwork: true` | Container escape |
   | `hostPID: true` or `hostIPC: true` | Process isolation bypass |
   | Missing `NetworkPolicy` | Unrestricted pod communication |
   | `automountServiceAccountToken: true` (default) | Token exposure |
   | Privileged `securityContext` | Host access |
   | Missing resource requests/limits | DoS / noisy neighbor |
   | Default service account used | Excessive permissions |
   | Tiller (Helm v2) deployed | Full cluster access |
   | RBAC ClusterRoleBinding to `cluster-admin` for non-admin | Excessive privilege |
   | Secrets in ConfigMaps instead of Secrets | Unencrypted sensitive data |

10. **Classify & Route** — Assign severity per `severity-matrix.md`, route to `bug-bounty-triage`

## Allowed Actions

- Read and analyze all IaC files and cloud configuration
- Parse Terraform state files for resource configuration
- Check cloud resource configurations against security benchmarks
- Identify overly permissive IAM policies
- Detect public exposure of resources
- Cross-reference with CIS Benchmarks for AWS/Azure/GCP
- Review Kubernetes manifests for security issues
- Assess network security group rules
- Run IaC scanning tools (tfsec, checkov, trivy) if available
- Analyze encryption and logging configuration

## Forbidden Actions

- Access live cloud environments without explicit authorization
- Modify cloud resources or IaC files without permission
- Use discovered cloud credentials to access services
- Assume cloud resource state not visible in IaC (stick to code review unless live access authorized)
- Report all non-default configurations as vulnerabilities

## Output Format

```markdown
### [FINDING-ID]: [Title]

| Field | Value |
|-------|-------|
| **Severity** | [S1-S5] |
| **Confidence** | [C1-C4] |
| **Status** | Suspected / Confirmed |
| **Category** | [CIS Benchmark ID or CWE] |
| **Cloud Provider** | AWS / Azure / GCP / Kubernetes |
| **Affected Resource** | [resource type and identifier] |
| **Affected File** | [IaC file:line] |

#### Issue Summary
[What is misconfigured and why it's a security risk]

#### Impact
[What an attacker could achieve if this misconfiguration is exploited]

#### Evidence
\```hcl
[Relevant IaC code snippet showing the misconfiguration]
\```

#### Remediation
\```hcl
[Corrected IaC configuration]
\```

#### CIS Benchmark Reference
[Applicable CIS benchmark control if relevant]

#### Validation Notes
[How to verify fix: plan/apply output, policy check command, or manual verification]
```

## References

- `references/severity-matrix.md` — Severity classification
- `references/secrets-and-config-checklist.md` — Cloud secrets and configuration
- `references/report-template.md` — Report format
