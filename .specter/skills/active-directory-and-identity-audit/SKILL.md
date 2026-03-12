---
name: active-directory-and-identity-audit
description: >
  Audit Active Directory, LDAP, and enterprise identity infrastructure for
  misconfigurations, privilege escalation paths, Kerberos weaknesses, trust
  relationship abuse, and credential exposure.
applyTo: "**/*.{ps1,psm1,psd1,ldif,ldf,inf,admx,adml,xml,json,yaml,yml}"
---

# Active Directory & Identity Audit

## Purpose

Assess enterprise identity infrastructure — Active Directory, LDAP, Azure AD/Entra ID, and associated identity providers — for privilege escalation paths, Kerberos weaknesses, misconfigured trusts, excessive permissions, and credential exposure. Covers both on-premises AD and cloud identity (Azure AD, Okta, etc.).

## Triggers

- Enterprise environment with Active Directory in scope
- Azure AD / Entra ID tenant authorized for testing
- User requests AD security audit
- Recon identifies domain-joined systems or LDAP services
- Credential discovered during other assessment phase

## Required Inputs

| Input | Description | Required |
|-------|-------------|----------|
| `governance_context` | Active engagement governance record | Yes |
| `target_domain` | AD domain(s) or tenant in scope | Yes |
| `access_level` | Current credentials/access (domain user, local admin, etc.) | Yes |
| `environment` | On-prem AD, Azure AD, hybrid, Okta, etc. | Yes |
| `tools_available` | BloodHound, PowerView, Impacket, ADExplorer, etc. | Recommended |

## Workflow

1. **Scope Verification** — Confirm AD domain/tenant and testing boundaries.

2. **Domain Reconnaissance**
   - Enumerate domain controllers, functional level, trusts
   - Map organizational units (OUs) and Group Policy structure
   - Enumerate users, groups, computers, service accounts
   - Identify privileged groups: Domain Admins, Enterprise Admins, Schema Admins, Account Operators, Backup Operators
   - Map group nesting and effective memberships
   - Enumerate SPNs (Service Principal Names) for Kerberoasting targets
   - Identify accounts with no pre-authentication (AS-REP Roasting)
   - Enumerate password policies and fine-grained password policies
   - Map trust relationships (forest, domain, external, realm)

3. **Kerberos Attack Surface**

   | Attack | Condition | Impact |
   |--------|-----------|--------|
   | **Kerberoasting** | Service accounts with SPNs | Offline password cracking of service accounts |
   | **AS-REP Roasting** | Accounts with `DONT_REQUIRE_PREAUTH` | Offline password cracking without auth |
   | **Golden Ticket** | KRBTGT hash compromised | Persistent domain-level access |
   | **Silver Ticket** | Service account hash | Forged service ticket, impersonation |
   | **Constrained Delegation** | msDS-AllowedToDelegateTo set | Impersonate any user to delegated service |
   | **Unconstrained Delegation** | TrustedForDelegation flag | Capture TGTs of connecting users |
   | **Resource-Based Constrained Delegation (RBCD)** | Write access to msDS-AllowedToActOnBehalfOfOtherIdentity | Privilege escalation via delegation |
   | **Pass-the-Ticket** | Ticket extracted from memory | Lateral movement without password |
   | **Overpass-the-Hash** | NTLM hash available | Request Kerberos ticket using NT hash |
   | **Diamond Ticket** | KRBTGT AES key | Undetectable persistence |

4. **Privilege Escalation Paths**
   - Run BloodHound collection and graph analysis
   - Identify shortest paths to Domain Admin
   - Map ACL-based attack paths (GenericAll, GenericWrite, WriteDACL, WriteOwner, ForceChangePassword)
   - Identify misconfigured Group Policy Objects (GPOs) — who can modify them?
   - Check for AdminSDHolder abuse
   - Enumerate LAPS (Local Admin Password Solution) deployment and access
   - Check for gMSA/sMSA account misconfigurations
   - Identify shadow admin paths (non-obvious accounts with elevated effective permissions)
   - Check for privilege escalation via AD Certificate Services (AD CS — ESC1-ESC8)

5. **AD Certificate Services (AD CS)**
   - Enumerate certificate templates and enrollment permissions
   - Check for ESC1: Template allows SAN specification + enrollee has enroll rights
   - Check for ESC2: Template allows any purpose EKU
   - Check for ESC3: Certificate request agent abuse
   - Check for ESC4: Vulnerable certificate template ACLs
   - Check for ESC6: EDITF_ATTRIBUTESUBJECTALTNAME2 on CA
   - Check for ESC7: CA manager approval bypass
   - Check for ESC8: NTLM relay to AD CS HTTP endpoint

6. **Credential Exposure**
   - Check for passwords in Group Policy Preferences (GPP / cpassword)
   - Enumerate service accounts with weak/default passwords
   - Check for Kerberos pre-auth disabled accounts
   - Review SYSVOL for scripts containing credentials
   - Check for reversibly encrypted passwords in AD
   - Enumerate accounts with password never expires
   - Check NTDS.dit access controls
   - Review LAPS password access permissions

7. **Azure AD / Entra ID** (if hybrid or cloud-only)
   - Enumerate Azure AD roles and privileged assignments
   - Check for stale/orphaned guest accounts
   - Review conditional access policies for bypasses
   - Enumerate app registrations and service principals
   - Check for overly permissive API permissions (Graph API)
   - Review PIM (Privileged Identity Management) configuration
   - Check for sync account compromise path (Azure AD Connect)
   - Enumerate managed identities and their permissions

8. **Trust Relationship Analysis**
   - Map all trust relationships (direction, type, transitivity)
   - Identify SID filtering status on trusts
   - Check for SID history abuse potential
   - Assess cross-forest attack paths
   - Evaluate selective authentication settings

9. **Lateral Movement & Persistence Assessment**
   - Identify local admin reuse across systems
   - Check for WMI, WinRM, PSRemoting, RDP access paths
   - Enumerate sessions and logged-on users
   - Identify admin shares accessible (C$, ADMIN$)
   - Check for scheduled tasks, startup scripts with elevated privileges
   - Review Windows Event Log forwarding (or lack thereof)

10. **Classify & Route** — Per `severity-matrix.md`, route to `bug-bounty-triage`

## Allowed Actions

- Enumerate AD objects (users, groups, computers, GPOs, trusts) within authorized scope
- Run BloodHound/SharpHound collection within scope
- Perform Kerberoasting and AS-REP Roasting within scope
- Test delegation attack paths within scope
- Analyze ACL-based privilege escalation paths
- Enumerate and assess AD CS templates
- Test credential exposure (GPP, SYSVOL, LAPS)
- Analyze Azure AD configuration within scope
- Attempt lateral movement within authorized perimeter
- Forge tickets (Golden/Silver) within authorized scope for validation

## Forbidden Actions

- Attack AD infrastructure outside authorized scope
- Modify AD objects (users, groups, GPOs) without explicit permission
- Perform DCSync without explicit authorization
- Deploy persistent backdoors (Golden Ticket persistence) without authorization and cleanup plan
- Lock out user accounts
- Disrupt AD replication or services
- Access personal user data beyond what's needed for PoC

## Output Format

```markdown
### [FINDING-ID]: [Title]

| Field | Value |
|-------|-------|
| **Severity** | [S1-S5] |
| **Confidence** | [C1-C4] |
| **Status** | Suspected / Confirmed |
| **Category** | [CWE / MITRE ATT&CK Technique] |
| **Affected Target** | [Domain, OU, account, GPO, trust] |
| **Attack Path** | [Visual or text representation] |

#### Issue Summary
[Description of AD misconfiguration or attack path]

#### Evidence
\```
[BloodHound query/path, PowerView output, Kerberos ticket data — credentials REDACTED]
\```

**Reproduction Steps:**
1. [Enumerate with tool]
2. [Identify weakness]
3. [Exploit path]
4. [Demonstrate impact]

#### Impact
[Domain compromise, privilege escalation, persistence, data access]

#### Remediation
[Specific AD fix: GPO change, ACL correction, delegation cleanup, template fix]

#### Validation Notes
[How to verify fix: re-run BloodHound, check ACLs, test delegation]
```

## References

- `references/severity-matrix.md` — Severity classification
- `references/authz-and-authn-checklist.md` — Authentication in AD context
