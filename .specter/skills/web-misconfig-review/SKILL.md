---
name: web-misconfig-review
description: >
  Review web server, application, and infrastructure configuration for security
  misconfigurations. Covers headers, TLS, CORS, error handling, directory exposure,
  and deployment hygiene.
applyTo: "**/*.{conf,cfg,ini,yaml,yml,json,toml,xml,htaccess,nginx,apache,tf,hcl,dockerfile,Dockerfile,docker-compose.*}"
---

# Web Misconfiguration Review

## Purpose

Systematically review web server, application server, and infrastructure configuration for security misconfigurations that expose attack surface, leak information, or weaken security posture. Covers HTTP headers, TLS, CORS, error handling, directory listings, default credentials, and deployment hygiene.

## Triggers

- Recon analysis identifies configuration issues
- User requests configuration security audit
- Deployment configuration files available for review
- HTTP response headers need analysis
- New infrastructure or server configuration being reviewed

## Required Inputs

| Input | Description | Required |
|-------|-------------|----------|
| `governance_context` | Active engagement governance record | Yes |
| `target` | Web application URL or configuration files | Yes |
| `config_files` | Server/app config files if available (nginx.conf, apache.conf, etc.) | Recommended |
| `http_responses` | Sample HTTP response headers from target | Recommended |

## Workflow

1. **Scope Verification** — Confirm target is within authorized scope.

2. **HTTP Security Headers Audit** — Check response headers:

   | Header | Expected | Risk if Missing |
   |--------|----------|-----------------|
   | `Content-Security-Policy` | Restrictive policy | XSS, data injection |
   | `X-Content-Type-Options` | `nosniff` | MIME-type sniffing attacks |
   | `X-Frame-Options` | `DENY` or `SAMEORIGIN` | Clickjacking |
   | `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | Protocol downgrade |
   | `Referrer-Policy` | `strict-origin-when-cross-origin` or stricter | Information leakage |
   | `Permissions-Policy` | Restrict unnecessary features | Feature abuse |
   | `Cache-Control` | `no-store` on sensitive pages | Data caching |
   | `X-Powered-By` | **Should not exist** | Technology fingerprinting |
   | `Server` | Generic or absent | Version fingerprinting |

3. **TLS/SSL Configuration** — Review:
   - TLS 1.2+ enforced (TLS 1.0/1.1 disabled)
   - Strong cipher suites only (no RC4, DES, 3DES, export ciphers)
   - HSTS enabled with sufficient max-age
   - Certificate validity and chain
   - Certificate transparency
   - OCSP stapling configured
   - No mixed content (HTTP resources on HTTPS pages)

4. **CORS Configuration** — Analyze:
   - `Access-Control-Allow-Origin` — no wildcard `*` on authenticated endpoints
   - Origin reflection (echoing request origin back) — dangerous
   - `Access-Control-Allow-Credentials: true` with permissive origins
   - Pre-flight request handling
   - Allowed methods and headers scope

5. **Error Handling & Information Disclosure** — Test for:
   - Stack traces in error responses
   - Database error messages exposed
   - Internal file paths revealed
   - Framework/language version in errors
   - Debug mode enabled in production
   - Detailed error messages on login/registration (user enumeration)
   - Custom error pages for 4xx/5xx (not default framework pages)

6. **Directory & File Exposure** — Check:
   - Directory listing enabled
   - `.git/` directory accessible
   - `.env` files accessible
   - Backup files (`.bak`, `.old`, `.swp`, `~`)
   - Source maps (`.map`) in production
   - `robots.txt` revealing sensitive paths
   - `sitemap.xml` exposing internal URLs
   - `crossdomain.xml` / `clientaccesspolicy.xml` overly permissive
   - `/.well-known/` endpoints revealing information

7. **Server Configuration** — Review:
   - Unnecessary HTTP methods enabled (TRACE, PUT, DELETE where not needed)
   - Default server pages/documentation present
   - Admin interfaces exposed without restriction
   - Rate limiting configured on auth endpoints
   - Request size limits configured
   - Timeout configurations appropriate
   - Compression enabled for responses (BREACH risk on sensitive data)

8. **Cookie Security** — For each cookie:
   - `Secure` flag set (HTTPS only)
   - `HttpOnly` flag set (no JS access)
   - `SameSite` attribute set (`Strict` or `Lax`)
   - Reasonable expiration
   - No sensitive data in cookie value
   - Cookie scope not overly broad (domain/path)

9. **Deployment Hygiene** — Check:
   - No test/staging credentials in production config
   - Environment-specific configs separated
   - Debug flags disabled
   - Development dependencies not installed in production
   - Container runs as non-root
   - Unnecessary ports not exposed

10. **Classify & Route** — Assign severity per `severity-matrix.md`, route findings to `bug-bounty-triage`

## Allowed Actions

- Analyze HTTP response headers
- Review server/application configuration files
- Check for exposed files and directories
- Test CORS behavior with different origins
- Analyze TLS configuration
- Review cookie attributes
- Inspect error response content
- Review deployment configurations (Docker, CI/CD, cloud)
- Active probing within authorized scope (header injection, method testing)

## Forbidden Actions

- Modify server configuration without explicit permission
- Perform DoS testing against the server
- Access data through discovered misconfigurations beyond proof-of-concept
- Test configurations on out-of-scope systems
- Report minor header optimizations as high-severity findings

## Output Format

```markdown
### [FINDING-ID]: [Title]

| Field | Value |
|-------|-------|
| **Severity** | [S1-S5] |
| **Confidence** | [C1-C4] |
| **Status** | Suspected / Confirmed |
| **Category** | [CWE / OWASP A05] |
| **Affected Target** | [URL, config file, or server] |

#### Issue Summary
[What is misconfigured and why it matters]

#### Impact
[What an attacker can achieve through this misconfiguration]

#### Evidence
\```
[HTTP response headers, config snippet, or test result]
\```

#### Remediation
\```[config language]
[Corrected configuration]
\```

#### Validation Notes
[How to verify the fix. Expected headers/behavior after remediation.]
```

## References

- `references/web-common-risks.md` — A05: Security Misconfiguration
- `references/secrets-and-config-checklist.md` — Server and config security
- `references/severity-matrix.md` — Severity classification
