---
name: container-and-runtime-security
description: >
  Assess container runtime security including escape paths, kernel exploitation,
  capability abuse, namespace breakouts, and orchestration runtime issues beyond
  static configuration review.
applyTo: "**/*.{yaml,yml,json,dockerfile,Dockerfile,toml,sh}"
---

# Container & Runtime Security

## Purpose

Assess container runtime security beyond static configuration. While `cloud-config-audit` reviews IaC and Kubernetes manifests, this skill focuses on runtime exploitability: container escape paths, kernel vulnerabilities, capability abuse, namespace breakouts, service mesh bypass, and orchestration runtime issues. Validates whether misconfigurations are actually exploitable at runtime.

## Triggers

- Containerized workloads in authorized scope
- Cloud-config-audit identifies container misconfigurations needing runtime validation
- User requests container escape or runtime assessment
- Kubernetes cluster authorized for active testing
- Container image needs runtime security evaluation

## Required Inputs

| Input | Description | Required |
|-------|-------------|----------|
| `governance_context` | Active engagement governance record | Yes |
| `target` | Container, pod, cluster, or container image | Yes |
| `access_level` | Current access (shell in container, K8s API access, etc.) | Yes |
| `runtime` | Docker, containerd, CRI-O, Podman | Recommended |
| `orchestrator` | Kubernetes, ECS, Docker Swarm, Nomad | Recommended |

## Workflow

1. **Scope Verification** — Confirm container environment is within authorized scope. Verify blast radius constraints.

2. **Container Escape Path Analysis**

   | Path | Condition | Test |
   |------|-----------|------|
   | **Privileged container** | `--privileged` or `privileged: true` | Mount host filesystem, access host devices |
   | **Dangerous capabilities** | `SYS_ADMIN`, `SYS_PTRACE`, `DAC_READ_SEARCH`, `NET_ADMIN` | Capability-specific escape techniques |
   | **Host PID namespace** | `hostPID: true` | Access host processes, `/proc` manipulation |
   | **Host network namespace** | `hostNetwork: true` | Sniff host traffic, access host-bound services |
   | **Host IPC namespace** | `hostIPC: true` | Shared memory access, IPC exploitation |
   | **Docker socket mount** | `/var/run/docker.sock` mounted | Full host control via Docker API |
   | **Host path mounts** | Sensitive host paths mounted (/, /etc, /var) | Read/write host filesystem |
   | **Kernel exploits** | Unpatched kernel, known CVEs | Privilege escalation to host |
   | **cgroup escape** | Writable cgroup filesystem (CVE-2022-0492 pattern) | Escape via release_agent |
   | **runc vulnerabilities** | Outdated runc version | CVE-2019-5736 (runc overwrite) pattern |
   | **eBPF abuse** | `SYS_ADMIN` or `BPF` capability | Kernel-level visibility and manipulation |

3. **Capability Analysis**
   - List effective capabilities: `capsh --print` or `/proc/self/status`
   - Map each capability to exploitation potential:
     - `CAP_SYS_ADMIN`: Mount filesystems, namespace manipulation, cgroup access
     - `CAP_SYS_PTRACE`: Trace host processes (with hostPID), inject code
     - `CAP_NET_ADMIN`: Network configuration manipulation
     - `CAP_NET_RAW`: Raw socket creation, packet crafting
     - `CAP_DAC_READ_SEARCH`: Read any file regardless of permissions
     - `CAP_SETUID`/`CAP_SETGID`: Arbitrary user/group switching
     - `CAP_CHOWN`: Take ownership of any file
     - `CAP_MKNOD`: Create device nodes
   - Test if `seccomp` profile restricts dangerous syscalls
   - Test if `AppArmor`/`SELinux` profiles are enforced

4. **Kubernetes Runtime Testing** (if applicable)

   **Service Account Token Analysis:**
   - Is service account token auto-mounted? Check `/var/run/secrets/kubernetes.io`
   - What RBAC permissions does the service account have?
   - Can it list secrets, create pods, exec into other pods?
   - Can it escalate to cluster-admin via RBAC misconfiguration?

   **Pod-to-Pod Lateral Movement:**
   - Can container reach other pods? (NetworkPolicy enforcement)
   - Can container reach Kubernetes API server?
   - Can container reach cloud metadata endpoint (169.254.169.254)?
   - Can container reach internal services (databases, caches)?

   **Node Exploitation:**
   - Can pod access kubelet API (10250, 10255)?
   - Read-only kubelet port (10255) — list pods, environment variables
   - Read-write kubelet port (10250) — exec into pods, container creation
   - etcd access (2379) — read all cluster secrets

   **Admission Controller Bypass:**
   - Can privileged pods be created in namespace?
   - Are OPA/Gatekeeper/Kyverno policies enforced?
   - Can admission webhooks be bypassed via API versioning?

5. **Container Image Runtime Analysis**
   - Run as root? Check `USER` directive enforcement
   - Writable filesystems? Check `readOnlyRootFilesystem`
   - Leftover build tools (gcc, wget, curl, nc) enabling exploitation?
   - Known CVEs in base image OS packages?
   - SUID/SGID binaries available for privilege escalation?
   - Package managers available (apt, yum, apk) for installing tools?

6. **Service Mesh / Sidecar Security** (if applicable)
   - mTLS enforcement between services (Istio, Linkerd)
   - Sidecar injection — can it be bypassed?
   - Service mesh authorization policies enforced?
   - Can traffic bypass sidecar proxy?
   - Envoy admin interface accessible?

7. **Runtime Monitoring Assessment**
   - Are runtime security tools deployed? (Falco, Sysdig, Aqua, etc.)
   - Do they detect container escape attempts?
   - Are alerts configured for privileged operations?
   - Can monitoring be evaded from within container?

8. **Classify & Route** — Per `severity-matrix.md`, route to `bug-bounty-triage`

## Allowed Actions

- Execute commands within authorized containers
- Test container escape paths within authorized scope
- Analyze capabilities, seccomp profiles, AppArmor/SELinux
- Query Kubernetes API with available service account tokens
- Test network segmentation between pods/services
- Analyze mounted filesystems and volumes
- Test kubelet API access
- Validate runtime security monitoring detection
- Attempt privilege escalation within authorized boundary

## Forbidden Actions

- Escape to host systems outside authorized scope
- Disrupt running production workloads
- Delete or modify critical Kubernetes resources without authorization
- Deploy persistent access mechanisms without cleanup plan
- Access etcd directly in production without explicit authorization
- Cause cluster-wide denial of service
- Access other tenants' workloads in shared clusters

## Output Format

```markdown
### [FINDING-ID]: [Title]

| Field | Value |
|-------|-------|
| **Severity** | [S1-S5] |
| **Confidence** | [C1-C4] |
| **Status** | Suspected / Confirmed |
| **Category** | [MITRE ATT&CK Container / CWE] |
| **Runtime** | Docker / containerd / CRI-O |
| **Affected Target** | [Container, pod, node, cluster] |
| **Escape Achieved** | Yes / No / Partial |

#### Issue Summary
[Description of runtime vulnerability or escape path]

#### Evidence
\```
[Capability dump, API response, filesystem access proof — REDACTED]
\```

**Reproduction Steps:**
1. [Gain shell in container]
2. [Check capability / mount / namespace]
3. [Execute escape technique]
4. [Demonstrate host-level access]

#### Impact
[Container escape → host compromise, cluster takeover, data access, lateral movement]

#### Remediation
\```yaml
[Corrected pod spec / security context / network policy]
\```

#### Validation Notes
[Re-run escape test after fix, verify seccomp/AppArmor enforcement]
```

## References

- `references/severity-matrix.md` — Severity classification
- `references/cloud-cis-benchmarks-summary.md` — Container CIS benchmarks
