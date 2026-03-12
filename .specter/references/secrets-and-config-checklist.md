# Secrets & Configuration Security Checklist

Systematic checklist for auditing secrets management, configuration hygiene, and sensitive data exposure. Use during dependency audits, code review, and misconfiguration review.

---

## Secrets in Source Code

### Hardcoded Secrets Detection
- [ ] No API keys, tokens, or passwords in source files
- [ ] No secrets in configuration files committed to VCS
- [ ] No secrets in Dockerfiles, docker-compose files, or CI/CD configs
- [ ] No secrets in comments, TODOs, or dead code
- [ ] No private keys (PEM, PPK, PFX) in repository
- [ ] No database connection strings with embedded credentials
- [ ] No cloud provider credentials (AWS_SECRET_ACCESS_KEY, AZURE_CLIENT_SECRET, GCP service account JSON)
- [ ] `.env` files excluded via `.gitignore`
- [ ] Git history audited for previously committed secrets (use `git log -p`, trufflehog, gitleaks)

### Common Secret Patterns
```
# Grep patterns for detection
API[_-]?KEY|API[_-]?SECRET
ACCESS[_-]?TOKEN|AUTH[_-]?TOKEN|BEARER
PASSWORD|PASSWD|PWD|SECRET
PRIVATE[_-]?KEY|RSA|BEGIN.*PRIVATE
AWS_ACCESS_KEY_ID|AWS_SECRET_ACCESS_KEY
GITHUB_TOKEN|GH_TOKEN|GITLAB_TOKEN
DATABASE_URL|DB_PASSWORD|MONGO_URI
STRIPE_SECRET|TWILIO_AUTH|SENDGRID
JWT_SECRET|SESSION_SECRET|ENCRYPTION_KEY
```

### Secret Management
- [ ] Secrets injected via environment variables or secrets manager
- [ ] Secrets manager in use (Vault, AWS Secrets Manager, Azure Key Vault, GCP Secret Manager)
- [ ] Secrets rotated on schedule and after incidents
- [ ] Principle of least privilege for secret access
- [ ] Secrets encrypted at rest in config stores
- [ ] No secrets passed via CLI arguments (visible in process list)

---

## Configuration Security

### Application Configuration
- [ ] Debug mode disabled in production
- [ ] Verbose error messages disabled in production
- [ ] Stack traces not exposed to users
- [ ] Default accounts/credentials removed or changed
- [ ] Sample/example configuration files removed from production
- [ ] Feature flags for debug/test features disabled in production
- [ ] Admin interfaces bound to internal networks only or behind VPN

### Server Configuration
- [ ] Directory listing disabled
- [ ] Unnecessary HTTP methods disabled (TRACE, OPTIONS where not needed)
- [ ] Server version headers removed or generic (`Server`, `X-Powered-By`, `X-AspNet-Version`)
- [ ] TLS 1.2+ enforced, weak ciphers disabled
- [ ] HSTS enabled with adequate max-age
- [ ] Certificate valid, not self-signed in production, not expired
- [ ] Non-essential ports closed
- [ ] Management ports (SSH, RDP, DB) not exposed to internet

### Security Headers
- [ ] `Content-Security-Policy` set and restrictive
- [ ] `X-Content-Type-Options: nosniff`
- [ ] `X-Frame-Options: DENY` or `SAMEORIGIN` (or CSP frame-ancestors)
- [ ] `Referrer-Policy` set appropriately
- [ ] `Permissions-Policy` restricts unnecessary browser features
- [ ] `Cache-Control` prevents caching of sensitive responses
- [ ] CORS policy restrictive — no `Access-Control-Allow-Origin: *` on authenticated endpoints

### Database Configuration
- [ ] Database not exposed to internet
- [ ] Default database credentials changed
- [ ] Database user permissions follow least privilege
- [ ] Encryption at rest enabled
- [ ] Encryption in transit (TLS) enabled for DB connections
- [ ] Audit logging enabled for privileged operations
- [ ] Backup encryption enabled

### CI/CD Pipeline
- [ ] Secrets not echoed in build logs
- [ ] Pipeline secrets use masked/protected variables
- [ ] Build artifacts do not contain secrets
- [ ] Pull request builds cannot exfiltrate secrets from protected branches
- [ ] Dependency sources pinned and verified (checksums/signatures)
- [ ] Build environment hardened (no unnecessary tools, network restrictions)

---

## Sensitive Data Exposure

### Data Classification
- [ ] PII (names, emails, addresses, phone numbers) identified and protected
- [ ] Financial data (card numbers, bank accounts) encrypted and access-controlled
- [ ] Health data (PHI) protected per HIPAA requirements
- [ ] Authentication data (passwords, tokens) never logged or cached in plaintext
- [ ] Internal system details (IPs, paths, versions) not exposed to external users

### Logging & Monitoring Hygiene
- [ ] Secrets never logged (mask in log middleware)
- [ ] PII minimized in logs or pseudonymized
- [ ] Log files not publicly accessible
- [ ] Log rotation and retention configured
- [ ] Sensitive request parameters redacted in HTTP logs
- [ ] Error responses do not leak internal paths, SQL queries, or stack traces

---

## Quick Triage Commands

```bash
# Search for common secret patterns in codebase
grep -rniE "(api[_-]?key|api[_-]?secret|password|passwd|secret|private[_-]?key|access[_-]?token|bearer)" --include="*.{js,ts,py,rb,java,go,php,yml,yaml,json,xml,env,cfg,conf,ini,toml}" .

# Check for .env files committed
find . -name "*.env" -o -name ".env*" | grep -v node_modules | grep -v .git

# Search git history for secrets
git log --all -p | grep -iE "(password|secret|api.key|token)" | head -50

# Check for private keys
find . -name "*.pem" -o -name "*.key" -o -name "*.ppk" -o -name "*.pfx" -o -name "*.p12" | grep -v node_modules

# List exposed ports in Docker configs
grep -rn "EXPOSE\|ports:" docker* compose* 2>/dev/null
```
