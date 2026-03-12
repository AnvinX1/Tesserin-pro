# Authorization & Authentication Checklist

Systematic checklist for reviewing authentication and authorization controls. Use during secure code review, API security review, and web misconfiguration review.

---

## Authentication Controls

### Credential Handling
- [ ] Passwords hashed with bcrypt/scrypt/argon2 (not MD5/SHA1/SHA256 alone)
- [ ] Salt is unique per user and generated via CSPRNG
- [ ] No plaintext passwords stored anywhere (DB, logs, config, comments)
- [ ] Password complexity requirements enforced server-side
- [ ] Credential stuffing protections (rate limiting, CAPTCHA, lockout)
- [ ] No default credentials shipped or documented

### Session Management
- [ ] Session tokens generated with CSPRNG, minimum 128 bits of entropy
- [ ] Session IDs rotated after authentication
- [ ] Session invalidated on logout (server-side destruction)
- [ ] Absolute and idle session timeouts configured
- [ ] Session tokens not exposed in URLs, logs, or error messages
- [ ] Cookie flags set: `Secure`, `HttpOnly`, `SameSite=Strict|Lax`
- [ ] Concurrent session limits enforced where appropriate

### Multi-Factor Authentication
- [ ] MFA available for privileged accounts
- [ ] MFA bypass/recovery flow does not downgrade security
- [ ] TOTP secrets stored encrypted at rest
- [ ] Backup codes are single-use and stored hashed

### Token-Based Auth (JWT, OAuth, API Keys)
- [ ] JWTs signed with strong algorithm (RS256/ES256, not HS256 with weak secret, not `none`)
- [ ] `alg` header validated server-side, algorithm confusion prevented
- [ ] Token expiration (`exp`) enforced and reasonably short
- [ ] Refresh token rotation implemented
- [ ] Token revocation mechanism exists
- [ ] API keys not embedded in client-side code
- [ ] OAuth `state` parameter validated to prevent CSRF
- [ ] OAuth redirect URIs strictly validated (no open redirects)
- [ ] PKCE enforced for public OAuth clients

### Password Reset & Recovery
- [ ] Reset tokens are single-use, time-limited, and high-entropy
- [ ] Reset flow does not reveal whether account exists
- [ ] Reset link sent only to verified contact method
- [ ] Old password not required to be sent in reset request
- [ ] Account enumeration not possible via reset, registration, or login error messages

---

## Authorization Controls

### Access Control Model
- [ ] Authorization model identified (RBAC, ABAC, ACL)
- [ ] Default deny — access requires explicit grant
- [ ] Authorization enforced server-side (not just UI hiding)
- [ ] Every endpoint/resource has explicit access control check
- [ ] Admin functions isolated and restricted

### IDOR / Object-Level Authorization
- [ ] Direct object references validated against session user
- [ ] Sequential/predictable IDs not sole access control (use UUIDs or ownership check)
- [ ] Bulk operations enforce per-object authorization
- [ ] Parameter tampering tested: change IDs, UUIDs, filenames in requests

### Privilege Escalation
- [ ] Vertical escalation tested: regular user → admin functions
- [ ] Horizontal escalation tested: user A → user B's resources
- [ ] Role assignment endpoints restricted to admin only
- [ ] Self-registration cannot assign elevated roles
- [ ] Mass assignment / parameter pollution checked on role fields

### Function-Level Authorization
- [ ] Hidden/undocumented endpoints still enforce auth
- [ ] Debug/admin endpoints disabled or protected in production
- [ ] GraphQL introspection disabled in production or field-level auth enforced
- [ ] API versioning does not bypass authorization on old endpoints

### Row/Field-Level Security
- [ ] Database queries filter by tenant/user context
- [ ] API responses do not over-expose fields (no full-object dumps)
- [ ] Sensitive fields (SSN, payment, internal IDs) redacted from non-privileged responses
- [ ] Export/download endpoints enforce same access controls as view endpoints

---

## Testing Procedures

### Quick Validation Steps
1. Authenticate as low-privilege user
2. Capture request to privileged endpoint
3. Replay with low-privilege session token
4. Verify 403/401 response (not 200 with data)
5. Test same for horizontal access (other user's resources)
6. Remove auth header entirely — verify rejection

### Token Analysis
1. Decode JWT and inspect claims
2. Check `alg` field for `none` or weak algorithms
3. Attempt signature stripping
4. Check token lifetime and refresh mechanics
5. Test token reuse after logout

### Session Testing
1. Login and capture session cookie
2. Logout and replay captured cookie
3. Verify session is destroyed server-side
4. Test concurrent sessions if limits expected
5. Check for session fixation on login
