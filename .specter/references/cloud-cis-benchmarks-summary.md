# Cloud CIS Benchmarks Summary

Condensed high-impact checks from CIS Benchmarks for AWS, Azure, and GCP. Use with `cloud-config-audit`, `container-and-runtime-security`, and `security-governance` skills.

---

## AWS CIS Benchmark (v3.0) — Top Checks

### 1 — Identity and Access Management

| # | Check | Finding if Violated |
|---|-------|---------------------|
| 1.4 | Root account has no access keys | S1 — Root credential exposure |
| 1.5 | MFA enabled on root | S1 — Root account takeover risk |
| 1.6 | Hardware MFA on root | S2 — Root MFA downgrade |
| 1.8 | IAM password policy ≥ 14 chars | S3 — Weak passwords |
| 1.10 | MFA enabled for console users | S2 — Account takeover |
| 1.12 | No user access keys unused > 90 days | S2 — Stale credentials |
| 1.15 | No inline policies on IAM users | S3 — Unmanaged permissions |
| 1.16 | No full `*:*` admin policies | S1 — Overprivileged principals |
| 1.17 | IAM Support role for incident management | S4 — Governance gap |
| 1.20 | No expired SSL/TLS certs in IAM | S2 — Certificate hygiene |
| 1.22 | IAM Access Analyzer enabled | S3 — No external access detection |

### 2 — Storage

| # | Check | Finding if Violated |
|---|-------|---------------------|
| 2.1.1 | S3 deny-http-requests policy | S2 — Plaintext data in transit |
| 2.1.2 | S3 MFA Delete enabled | S3 — Deletion without MFA |
| 2.1.4 | S3 public access blocked (account level) | S1 — Public data exposure |
| 2.1.5 | S3 SSE encryption at rest | S2 — Data at rest unencrypted |
| 2.2.1 | EBS encryption by default | S2 — Unencrypted volumes |
| 2.3.1 | RDS encryption enabled | S2 — Database data exposure |
| 2.3.2 | RDS auto minor version upgrade | S3 — Unpatched databases |
| 2.3.3 | RDS not publicly accessible | S1 — Database internet exposure |

### 3 — Logging

| # | Check | Finding if Violated |
|---|-------|---------------------|
| 3.1 | CloudTrail enabled in all regions | S1 — No audit trail |
| 3.2 | CloudTrail log file validation | S2 — Tamper-undetectable logs |
| 3.3 | CloudTrail S3 bucket not public | S1 — Log exposure |
| 3.4 | CloudTrail → CloudWatch Logs integration | S2 — No real-time alerting |
| 3.6 | S3 bucket access logging on CloudTrail bucket | S3 — Log access unaudited |
| 3.7 | CloudTrail KMS-encrypted | S2 — Logs readable if bucket compromised |
| 3.9 | VPC Flow Logs enabled | S2 — No network visibility |

### 4 — Monitoring

| # | Check | Finding if Violated |
|---|-------|---------------------|
| 4.1 | Unauthorized API call alarm | S3 — No unauthorized access detection |
| 4.3 | Root account usage alarm | S2 — Root activity unmonitored |
| 4.4 | IAM policy change alarm | S2 — Policy tampering undetected |
| 4.5 | CloudTrail config change alarm | S1 — Audit evasion undetected |
| 4.12 | Network gateway change alarm | S2 — Network egress changes |
| 4.14 | VPC change alarm | S2 — Network topology changes |
| 4.15 | Organizations change alarm | S2 — Org-level changes |

### 5 — Networking

| # | Check | Finding if Violated |
|---|-------|---------------------|
| 5.1 | No 0.0.0.0/0 inbound on port 22 | S2 — SSH open to internet |
| 5.2 | No 0.0.0.0/0 inbound on port 3389 | S2 — RDP open to internet |
| 5.3 | No unrestricted default security group | S3 — Default SG allows traffic |
| 5.4 | VPC peering least-privilege routing | S3 — Overly permissive peering |

---

## Azure CIS Benchmark (v3.0) — Top Checks

### Identity and Access

| # | Check | Finding if Violated |
|---|-------|---------------------|
| 1.1 | Security Defaults or Conditional Access enabled | S1 — No baseline protection |
| 1.2 | MFA for all users | S2 — Account takeover |
| 1.3 | No guest users with privileged roles | S1 — External admin access |
| 1.5 | Password hash sync enabled (hybrid) | S3 — Weak hybrid auth |
| 1.8 | Custom banned password list | S3 — Weak passwords |
| 1.11 | Conditional Access requires MFA for admins | S1 — Admin MFA bypass |
| 1.21 | No custom subscription owner roles | S2 — Role sprawl |
| 1.23 | No Service Principal as subscription owner | S2 — Non-human admin |

### Storage

| # | Check | Finding if Violated |
|---|-------|---------------------|
| 3.1 | Storage account requires HTTPS | S2 — Data in transit |
| 3.2 | Storage account encryption with CMK | S3 — Platform-managed keys |
| 3.7 | Public access disabled on blob containers | S1 — Public blob exposure |
| 3.8 | Default network access deny on storage | S2 — Network-open storage |
| 3.10 | Soft delete for blobs enabled | S3 — No deletion recovery |
| 3.15 | Private endpoint for storage | S2 — Public endpoint |

### Networking

| # | Check | Finding if Violated |
|---|-------|---------------------|
| 6.1 | No RDP from internet (0.0.0.0/0, ::/0) | S2 — RDP open to internet |
| 6.2 | No SSH from internet | S2 — SSH open to internet |
| 6.5 | Network Watcher enabled | S3 — No flow visibility |
| 6.6 | NSG flow logs enabled | S2 — No network audit |

### Logging

| # | Check | Finding if Violated |
|---|-------|---------------------|
| 5.1.1 | Diagnostic settings capture Admin logs | S2 — No admin audit |
| 5.1.4 | Activity log for all regions | S2 — Incomplete audit |
| 5.1.5 | Activity log storage ≥ 365 days | S3 — Short retention |
| 5.2.1 | Defender for Servers enabled | S2 — No server protection |
| 5.2.7 | Defender for Key Vault enabled | S2 — Secrets unmonitored |

---

## GCP CIS Benchmark (v3.0) — Top Checks

### Identity and Access

| # | Check | Finding if Violated |
|---|-------|---------------------|
| 1.1 | 2-Step Verification enforced (org) | S1 — No MFA |
| 1.4 | No service account keys (use Workload Identity) | S2 — Long-lived credentials |
| 1.5 | Service account no admin roles | S1 — SA admin access |
| 1.6 | Service account no user-managed keys | S2 — Key management risk |
| 1.7 | No service account token creator on SA | S2 — Impersonation chain |
| 1.9 | Cloud KMS crypto keys not publicly accessible | S1 — Public key access |
| 1.12 | API keys restricted to needed APIs | S3 — Unrestricted API keys |
| 1.15 | API keys rotated ≤ 90 days | S3 — Stale API keys |

### Logging and Monitoring

| # | Check | Finding if Violated |
|---|-------|---------------------|
| 2.1 | Cloud Audit Logging for all services | S1 — No audit trail |
| 2.2 | Log bucket retention lock | S2 — Mutable logs |
| 2.4 | Log alert for project ownership changes | S2 — Ownership transfer |
| 2.5 | Log alert for audit config changes | S1 — Audit evasion |
| 2.6 | Log alert for custom role changes | S3 — Privilege escalation |
| 2.9 | Log alert for VPC network changes | S2 — Network changes |
| 2.11 | Log alert for SQL instance config changes | S2 — Database changes |
| 2.12 | Log alert for Storage IAM changes | S2 — Storage access changes |

### Networking

| # | Check | Finding if Violated |
|---|-------|---------------------|
| 3.1 | Default network not used | S3 — Permissive defaults |
| 3.6 | No SSH from 0.0.0.0/0 | S2 — SSH open to internet |
| 3.7 | No RDP from 0.0.0.0/0 | S2 — RDP open to internet |
| 3.8 | VPC Flow Logs enabled for every subnet | S2 — No network visibility |
| 3.10 | SSL proxy load balancer (no TCP proxy) | S3 — Unencrypted ingress |

### Storage and Data

| # | Check | Finding if Violated |
|---|-------|---------------------|
| 5.1 | Cloud Storage bucket not public | S1 — Public data exposure |
| 5.2 | Cloud Storage uniform bucket-level access | S3 — Mixed ACL model |
| 6.1.2 | Cloud SQL no public IP | S1 — Database internet exposure |
| 6.2.1 | Cloud SQL requires SSL | S2 — Unencrypted DB connections |
| 6.7 | Cloud SQL automated backups | S3 — No recovery capability |

---

## Quick Assessment Approach

1. **Start with S1 checks** — these represent immediate risk
2. **Group by service** — IAM → Storage → Network → Logging
3. **Cross-reference with actual deployment** — skip checks for unused services
4. **Map findings to severity-matrix.md** — use CIS levels to calibrate S1-S5
5. **Note compensating controls** — a check may pass via alternative mechanism
