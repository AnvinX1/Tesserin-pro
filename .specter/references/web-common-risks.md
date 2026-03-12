# Web Common Risks Reference

Comprehensive reference of common web application vulnerabilities. Organized by OWASP Top 10 (2021) categories with testing guidance for each.

---

## A01: Broken Access Control

| Risk | Test Method |
|------|------------|
| IDOR (Insecure Direct Object Reference) | Modify IDs/UUIDs in requests; access other users' resources |
| Privilege escalation (vertical) | Access admin functions with regular user token |
| Privilege escalation (horizontal) | Access user B's data with user A's session |
| Path traversal | Inject `../` sequences in file parameters |
| Forced browsing | Access `/admin`, `/debug`, `/backup`, `/status` without auth |
| CORS misconfiguration | Check `Access-Control-Allow-Origin` for wildcard or reflection |
| Missing function-level access control | Call API endpoints directly, bypassing UI restrictions |
| Metadata manipulation | Tamper with JWT claims, cookie values, hidden form fields |
| Directory traversal in file upload/download | Manipulate filename parameter |

## A02: Cryptographic Failures

| Risk | Test Method |
|------|------------|
| Sensitive data in transit without TLS | Intercept traffic, check for HTTP endpoints |
| Weak TLS configuration | Test with `testssl.sh` or `sslyze` |
| Weak hashing algorithms | Check for MD5/SHA1 in password storage |
| Missing encryption at rest | Review database/storage configuration |
| Hardcoded encryption keys | Code review for key material in source |
| Predictable tokens/nonces | Analyze randomness of generated values |
| Certificate issues | Check expiry, chain, hostname match |
| Key exposure | Check for private keys in repos/configs |

## A03: Injection

| Risk | Test Method |
|------|------------|
| SQL Injection | `' OR 1=1--`, time-based blind, UNION-based; test all input fields |
| NoSQL Injection | `{"$gt":""}`, `{"$ne":""}` in JSON params |
| Command Injection | `; id`, `| whoami`, `` `id` `` in input fields |
| LDAP Injection | `*)(uid=*))(|(uid=*` in login/search fields |
| XPath Injection | `' or '1'='1` in XML-processed inputs |
| Template Injection (SSTI) | `{{7*7}}`, `${7*7}`, `<%= 7*7 %>` in rendered fields |
| Header Injection (CRLF) | `%0d%0a` in header-reflected inputs |
| Log Injection | Newlines/control characters in logged inputs |
| XML External Entity (XXE) | DOCTYPE with ENTITY in XML upload/input |

## A04: Insecure Design

| Risk | Test Method |
|------|------------|
| Missing rate limiting | Brute force login, enumerate users |
| No account lockout | Repeated failed auth attempts |
| Predictable resource locations | Sequential IDs, guessable URLs |
| Missing anti-automation controls | Script rapid form submissions |
| Insecure password recovery | Analyze reset token entropy, flow logic |
| Business logic flaws | Test negative quantities, race conditions, state manipulation |
| Missing input validation | Boundary testing, type confusion |

## A05: Security Misconfiguration

| Risk | Test Method |
|------|------------|
| Default credentials | Try `admin:admin`, `admin:password`, known defaults |
| Unnecessary features enabled | Check for debug endpoints, test pages |
| Missing security headers | Inspect response headers |
| Verbose error messages | Trigger errors, check for stack traces |
| Directory listing enabled | Browse directory paths |
| Unnecessary HTTP methods | `OPTIONS` request, try `PUT`, `DELETE`, `TRACE` |
| Cloud storage misconfiguration | Check S3 bucket policies, Azure blob access |
| Permissive CORS | Check `Access-Control-Allow-Origin` behavior |

## A06: Vulnerable and Outdated Components

| Risk | Test Method |
|------|------------|
| Known CVEs in dependencies | `npm audit`, `pip-audit`, `snyk`, `trivy` |
| Outdated frameworks/libraries | Check version against latest release + CVE databases |
| Unsupported software versions | Check vendor EOL announcements |
| Unpatched server software | Version fingerprint + CVE lookup |
| Client-side library vulnerabilities | Check JS libraries against RetireJS database |

## A07: Identification and Authentication Failures

| Risk | Test Method |
|------|------------|
| Credential stuffing | Test rate limiting on login |
| Brute force | Automated login attempts |
| Default credentials | Try known defaults for framework/service |
| Weak password policy | Test minimum length, complexity bypass |
| Missing MFA on sensitive functions | Check admin, financial, PII-access functions |
| Session fixation | Pre-set session ID, login, check if retained |
| Session not invalidated on logout | Replay session cookie after logout |
| Insecure "remember me" | Analyze persistent token security |

## A08: Software and Data Integrity Failures

| Risk | Test Method |
|------|------------|
| Unsigned updates/deployments | Check update mechanism for signature verification |
| Insecure deserialization | Test serialized object inputs for gadget chains |
| CI/CD pipeline compromise | Review pipeline config for injection points |
| Dependency confusion | Check for private package name squatting |
| Missing SRI (Subresource Integrity) | Check `<script>` and `<link>` tags for `integrity` attribute |

## A09: Security Logging and Monitoring Failures

| Risk | Test Method |
|------|------------|
| Missing auth event logging | Trigger login failures, check logs |
| Sensitive data in logs | Review log outputs for passwords/tokens |
| Missing anomaly alerting | Simulate attack patterns, check for alerts |
| Log injection | Include control chars in logged inputs |
| Insufficient log retention | Check log rotation/retention settings |

## A10: Server-Side Request Forgery (SSRF)

| Risk | Test Method |
|------|------------|
| Internal service access | URL parameters pointing to `127.0.0.1`, `169.254.169.254`, internal IPs |
| Cloud metadata access | Target `http://169.254.169.254/latest/meta-data/` |
| Protocol smuggling | `gopher://`, `file://`, `dict://` in URL params |
| DNS rebinding | Use rebinding service to bypass IP validation |
| Partial SSRF | Check if response content/status is reflected |

---

## Additional Risks

### Cross-Site Scripting (XSS) Quick Reference
| Type | Payload Example | Where to Test |
|------|----------------|---------------|
| Reflected | `<script>alert(1)</script>` | URL params, search fields, error messages |
| Stored | `<img src=x onerror=alert(1)>` | Comments, profiles, messages, upload names |
| DOM-based | `#<img src=x onerror=alert(1)>` | Fragment identifiers, `document.location`, `innerHTML` sinks |
| Mutation | `<noscript><p title="</noscript><img src=x onerror=alert(1)>">` | HTML parsers, sanitization bypass |

### Cross-Site Request Forgery (CSRF)
- Missing or weak anti-CSRF tokens on state-changing requests
- Token not bound to session
- GET requests that modify state
- SameSite cookie attribute missing or set to `None`
- Referer/Origin header validation bypassable

### Business Logic Vulnerabilities
- Race conditions (TOCTOU: time-of-check-time-of-use)
- Price/quantity manipulation (negative values, overflow)
- Workflow bypass (skip steps in multi-step process)
- Coupon/discount abuse (reuse, stacking)
- Feature abuse (mass email, resource exhaustion via legitimate function)
