# Tool Recommendations

Categorized tool reference for each skill domain. Tools listed are well-known, open-source or community-standard unless noted. Use this as a lookup when a skill workflow references tooling.

---

## Reconnaissance & OSINT

| Tool | Purpose | License | Notes |
|------|---------|---------|-------|
| Nmap | Port scanning, service detection, NSE scripts | GPLv2 | Core network scanner |
| Masscan | High-speed port scanning | AGPLv3 | Rate-limit aware |
| Amass | Subdomain enumeration, ASN discovery | Apache 2.0 | OWASP project |
| Subfinder | Passive subdomain discovery | MIT | Fast, API-driven |
| httpx | HTTP probing, tech detection | MIT | Pairs with subfinder |
| Nuclei | Template-based vulnerability scanner | MIT | Community templates |
| Shodan CLI | Internet-wide scanning data | Commercial | API key required |
| theHarvester | Email, subdomain, IP harvesting | GPLv2 | Multi-source |
| WhatWeb | Web technology fingerprinting | GPLv2 | CMS/framework detection |
| Wappalyzer | Browser-based tech fingerprinting | MIT | Extension + CLI |

## Web Application Testing

| Tool | Purpose | License | Notes |
|------|---------|---------|-------|
| Burp Suite | Web proxy, scanner, repeater | Commercial/Community | Industry standard |
| OWASP ZAP | Web proxy, active/passive scanner | Apache 2.0 | Free alternative to Burp |
| ffuf | Web fuzzer (dirs, params, vhosts) | MIT | Fast, flexible |
| Gobuster | Directory/file brute-force | Apache 2.0 | Go-based |
| SQLMap | SQL injection detection and exploitation | GPLv2 | Automated SQLi |
| XSStrike | XSS detection and exploitation | GPLv3 | Advanced XSS |
| Commix | Command injection exploitation | GPLv3 | OS command injection |
| Arjun | HTTP parameter discovery | GPLv3 | Hidden param finder |
| ParamSpider | Parameter URL mining | GPLv3 | Web archive sourced |
| Dalfox | XSS scanning and analysis | MIT | Pipe-friendly |

## API & GraphQL

| Tool | Purpose | License | Notes |
|------|---------|---------|-------|
| Postman | API testing and collection | Commercial/Free | GUI + CLI (newman) |
| GraphQL Voyager | GraphQL schema visualization | MIT | Interactive graph |
| InQL | GraphQL introspection scanner | Apache 2.0 | Burp extension |
| Clairvoyance | GraphQL schema brute-force | Apache 2.0 | When introspection is off |
| jwt_tool | JWT attack toolkit | GPLv3 | All JWT attacks |
| Kiterunner | API endpoint brute-force | BSD-3 | Wordlist-driven |
| RESTler | Stateful REST API fuzzer | MIT | Microsoft Research |

## Authentication & Identity

| Tool | Purpose | License | Notes |
|------|---------|---------|-------|
| Hydra | Online brute-force (multi-protocol) | AGPLv3 | Use responsibly |
| Hashcat | Offline hash cracking | MIT | GPU-accelerated |
| John the Ripper | Offline hash cracking | GPLv2 | CPU + rules |
| CrackMapExec | AD/SMB/WinRM lateral movement | BSD-2 | Post-exploitation |
| BloodHound | AD attack path visualization | GPLv3 | Graph-based analysis |
| Rubeus | Kerberos abuse toolkit | BSD-3 | Windows/.NET |
| Impacket | Network protocol Python toolkit | Apache 2.0 | AD attacks, SMB, Kerberos |
| Certipy | AD CS (certificate) exploitation | MIT | ESC1-ESC8 |
| Mimikatz | Credential extraction | Custom | Windows post-exploit |
| KerBrute | Kerberos user enumeration + brute | Apache 2.0 | Pre-auth attacks |

## Cloud Security

| Tool | Purpose | License | Notes |
|------|---------|---------|-------|
| Prowler | AWS/Azure/GCP CIS benchmark scanner | Apache 2.0 | Multi-cloud |
| ScoutSuite | Multi-cloud security audit | GPLv2 | AWS/Azure/GCP/OCI |
| Steampipe | SQL-based cloud querying | AGPLv3 | CIS + custom queries |
| CloudSploit | Cloud misconfiguration scanner | GPLv2 | Aqua Security |
| Pacu | AWS exploitation framework | BSD-2 | Rhino Security |
| AWS CLI | AWS service interaction | Apache 2.0 | Official |
| az CLI | Azure service interaction | MIT | Official |
| gcloud CLI | GCP service interaction | Apache 2.0 | Official |
| Checkov | IaC static analysis | Apache 2.0 | Terraform/CloudFormation |
| tfsec | Terraform static analysis | MIT | AquaSecurity |

## Container & Kubernetes

| Tool | Purpose | License | Notes |
|------|---------|---------|-------|
| Trivy | Container image/IaC vulnerability scanner | Apache 2.0 | Aqua Security |
| Grype | Container image vulnerability scanner | Apache 2.0 | Anchore |
| Syft | SBOM generation for containers | Apache 2.0 | Anchore |
| kube-bench | CIS Kubernetes benchmark | Apache 2.0 | AquaSecurity |
| kube-hunter | K8s penetration testing | Apache 2.0 | AquaSecurity |
| Falco | K8s runtime security monitoring | Apache 2.0 | Sysdig/CNCF |
| CDK | Container/K8s exploitation toolkit | Apache 2.0 | Chinese-origin, verify |
| Peirates | K8s penetration testing | MIT | Pod-level attacks |
| Docker Bench | Docker CIS benchmark | Apache 2.0 | Docker, Inc. |
| Dive | Docker image layer inspection | MIT | Layer analysis |

## Mobile Security

| Tool | Purpose | License | Notes |
|------|---------|---------|-------|
| MobSF | Mobile static/dynamic analysis | GPLv3 | Android + iOS |
| Frida | Dynamic instrumentation | wxWindows | Runtime hooking |
| Objection | Frida-powered mobile toolkit | GPLv3 | Runtime exploration |
| Jadx | Android APK decompiler | Apache 2.0 | Java source recovery |
| APKTool | APK decompile/recompile | Apache 2.0 | Smali level |
| Ghidra | Binary reverse engineering | Apache 2.0 | NSA (free) |
| Hopper | Binary disassembler | Commercial | macOS/Linux |
| drozer | Android security framework | BSD-3 | Deprecated but useful |
| SSL Kill Switch 2 | iOS SSL pinning bypass | MIT | Jailbreak required |
| r2frida | Radare2 + Frida integration | MIT | Advanced RE |

## Network & Infrastructure

| Tool | Purpose | License | Notes |
|------|---------|---------|-------|
| Nmap | Port/service scanning + NSE | GPLv2 | (listed above also) |
| Wireshark | Packet capture and analysis | GPLv2 | GUI + tshark CLI |
| Responder | LLMNR/NBT-NS/MDNS poisoning | GPLv3 | AD environments |
| mitm6 | IPv6 DNS takeover | GPLv2 | AD environments |
| Bettercap | Network attack framework | GPLv3 | MITM, sniffing, spoofing |
| testssl.sh | TLS/SSL configuration testing | GPLv2 | Comprehensive TLS audit |
| SSLyze | TLS configuration scanner | AGPLv3 | Python-based |
| Nikto | Web server scanner | GPLv2 | Legacy but useful |
| enum4linux-ng | SMB/NetBIOS enumeration | GPLv3 | Linux-based |
| CrackMapExec | Multi-protocol pentest tool | BSD-2 | (listed above also) |

## CI/CD & Supply Chain

| Tool | Purpose | License | Notes |
|------|---------|---------|-------|
| Gitleaks | Git secret scanning | MIT | Pre-commit + CI |
| TruffleHog | Secret detection in repos | AGPLv3 | Multi-source |
| Semgrep | Static analysis (custom rules) | LGPL-2.1 | Code pattern matching |
| Snyk | Dependency vulnerability scanning | Commercial/Free | Multi-language |
| Socket.dev | Supply chain threat detection | Commercial | npm/PyPI focus |
| Cosign | Container image signing | Apache 2.0 | Sigstore project |
| SLSA Verifier | SLSA provenance verification | Apache 2.0 | Supply chain integrity |
| Dependabot | Automated dependency updates | GitHub | Built into GitHub |
| Renovate | Automated dependency updates | AGPLv3 | Multi-platform |
| npm audit / pip audit | Package audit | Varies | Built-in package auditors |

## Secrets & Configuration

| Tool | Purpose | License | Notes |
|------|---------|---------|-------|
| Gitleaks | Git secret scanning | MIT | (listed above) |
| TruffleHog | Deep secret detection | AGPLv3 | (listed above) |
| detect-secrets | Secret detection (Yelp) | Apache 2.0 | Baseline + scanning |
| git-secrets | AWS secret prevention | Apache 2.0 | Pre-commit hook |
| SecretFinder | JS file secret extraction | MIT | Regex-based |
| Vault | Secret management | MPL-2.0 | HashiCorp |
| SOPS | Encrypted file editing | MPL-2.0 | Mozilla |

## Reporting & Evidence

| Tool | Purpose | License | Notes |
|------|---------|---------|-------|
| Dradis | Collaborative pentest reporting | GPLv2 | Team-focused |
| Ghostwriter | Pentest management platform | BSD-3 | SpecterOps |
| Pwndoc | Pentest report generation | MIT | Template-based |
| Flameshot | Screenshot capture | GPLv3 | Annotated screenshots |
| asciinema | Terminal session recording | GPLv3 | Shareable recordings |
| CyberChef | Data encoding/decoding | Apache 2.0 | GCHQ, browser-based |

---

## Selection Criteria

When recommending tools to the user:

1. **Prefer open-source** — unless commercial tool has clear advantage
2. **Check context** — suggest tools appropriate to the target OS and environment
3. **Note prerequisites** — some tools need root, jailbreak, or specific runtimes
4. **Respect scope** — only suggest tools usable within authorized assessment scope
5. **Version awareness** — some tools change rapidly; note when version matters
