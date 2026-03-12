# OWASP API Security Top 10 (2023) Checklist

Testing checklist for each OWASP API Security Top 10 category. Use with `api-security-review` skill.

---

## API1: Broken Object-Level Authorization (BOLA)

**What:** API endpoints expose object IDs; authorization not enforced per-object.

- [ ] For every endpoint accepting an ID parameter, test with IDs belonging to other users
- [ ] Test sequential IDs: increment/decrement to access adjacent objects
- [ ] Test UUID replacement: swap UUIDs between authenticated sessions
- [ ] Test bulk endpoints: does listing/exporting respect object-level authorization?
- [ ] Test nested objects: `/users/123/orders/456` — change both IDs independently
- [ ] Test with different roles: admin vs user, paid vs free
- [ ] Check GraphQL: query with different object IDs in arguments
- [ ] Verify 403/401 returned, not 200 with empty body or 404 (404 may still leak existence)

**Payloads:**
```
# Original: GET /api/orders/1001 (user A's order)
# Test:     GET /api/orders/1002 (user B's order with user A's token)

# Bulk test: GET /api/users?id=1001&id=1002&id=1003
# GraphQL:   query { user(id: "other-user-uuid") { email, ssn } }
```

---

## API2: Broken Authentication

**What:** Weak auth mechanisms allow attackers to compromise tokens or exploit implementation flaws.

- [ ] Test brute force on login endpoint (rate limiting?)
- [ ] Test credential stuffing (common password lists)
- [ ] Send requests without any authentication — expect 401
- [ ] Send requests with expired token — expect 401
- [ ] Send requests with malformed token — expect 401
- [ ] Test JWT: change `alg` to `none`, strip signature
- [ ] Test JWT: change `alg` from RS256 to HS256 (key confusion)
- [ ] Test JWT: brute force weak HMAC secret
- [ ] Test token reuse after logout (server-side invalidation?)
- [ ] Test password reset token entropy and lifetime
- [ ] Check for user enumeration via error message differences
- [ ] Test OAuth: redirect_uri manipulation, state parameter validation

**Payloads:**
```
# JWT none algorithm:
# Header: {"alg":"none","typ":"JWT"}
# No signature section

# JWT algorithm confusion:
# Change alg from RS256 to HS256, sign with public key as HMAC secret

# Missing auth: Remove Authorization header entirely
```

---

## API3: Broken Object Property Level Authorization

**What:** Users can read/modify object properties they shouldn't have access to.

- [ ] **Mass Assignment:** Add extra fields to POST/PUT requests (role, is_admin, price, balance)
- [ ] **Excessive Data Exposure:** Check if API response contains more fields than UI displays
- [ ] Send update with `{"role": "admin"}` or `{"is_admin": true}`
- [ ] Send update with `{"price": 0}` or `{"balance": 999999}`
- [ ] Compare response fields for same object as admin vs regular user
- [ ] Check GraphQL: request fields not intended for current role
- [ ] Test partial update (PATCH): include unauthorized fields

**Payloads:**
```json
// Mass assignment test — add fields to registration/update
POST /api/users
{"name": "test", "email": "test@test.com", "role": "admin", "is_verified": true}

// Excessive data — check response for sensitive fields
GET /api/users/me → Does response include: internal_id, password_hash, ssn, api_keys?
```

---

## API4: Unrestricted Resource Consumption

**What:** API doesn't limit request rate, payload size, or query complexity.

- [ ] Test rate limiting: send 100+ requests in quick succession
- [ ] Test pagination: request `?page_size=100000` or `?limit=999999`
- [ ] Test file upload: upload very large file (exceeds expected limit)
- [ ] Test GraphQL query depth: deeply nested query (10+ levels)
- [ ] Test GraphQL query breadth: request all fields on all related objects
- [ ] Test batch operations: send array of 10000 items in one request
- [ ] Test regex/search: `.*` or complex regex causing ReDoS
- [ ] Test export endpoints: request full database export
- [ ] Test concurrent requests: parallel connections from same token
- [ ] Check response time on complex queries (CPU-bound DoS)

**Payloads:**
```graphql
# GraphQL depth bomb
query { user { friends { friends { friends { friends { friends { name } } } } } } }

# GraphQL alias abuse (bypass rate limiting per-query)
query { a1: user(id:1){name} a2: user(id:2){name} ... a1000: user(id:1000){name} }
```

---

## API5: Broken Function-Level Authorization (BFLA)

**What:** Regular users can invoke admin/privileged API functions.

- [ ] Identify admin endpoints from docs, code, or discovery
- [ ] Call admin endpoints with regular user token
- [ ] Test HTTP method flip: if GET allowed, try PUT/DELETE/POST
- [ ] Test changing HTTP method on endpoints (POST → PUT, GET → DELETE)
- [ ] Test undocumented endpoints found via fuzzing
- [ ] Check if older API versions have weaker auth (v1 endpoints)
- [ ] Test management endpoints: `/admin`, `/internal`, `/debug`, `/metrics`, `/health`
- [ ] Test role-based endpoints: change role parameter in path/body

**Payloads:**
```
# Regular user calling admin endpoint
DELETE /api/admin/users/1002
Authorization: Bearer <regular-user-token>

# Method flip
GET /api/users/1001 → works
DELETE /api/users/1001 → should 403 for non-admin
```

---

## API6: Unrestricted Access to Sensitive Business Flows

**What:** No anti-automation on business-critical flows.

- [ ] Purchase/checkout flow: automate rapid purchases, race condition test
- [ ] Registration: mass account creation
- [ ] Comment/posting: automated spam
- [ ] Referral/coupon: abuse reward systems
- [ ] Password reset: enumerate users, flood reset emails
- [ ] Voting/rating: manipulate scores
- [ ] Transfer/payment: race conditions, negative amount
- [ ] Reservation: resource exhaustion (book all slots)

**Tests:**
```
# Race condition on purchase (send 10 concurrent requests)
# Negative quantity: {"item": "widget", "quantity": -1, "price": 100}
# Coupon reuse: apply same code multiple times in parallel
```

---

## API7: Server-Side Request Forgery (SSRF)

**What:** API fetches resources from attacker-controlled URLs.

- [ ] Test URL parameters: webhook URLs, image URLs, import URLs, redirect URLs
- [ ] Test with internal IPs: `127.0.0.1`, `0.0.0.0`, `::1`, `0x7f000001`
- [ ] Test cloud metadata: `http://169.254.169.254/latest/meta-data/`
- [ ] Test DNS rebinding: domain that resolves to internal IP
- [ ] Test protocol handlers: `file:///etc/passwd`, `gopher://`, `dict://`
- [ ] Test URL encoding bypass: `http://127.0.0.1` → `http://0177.0.0.1`, `http://2130706433`
- [ ] Test redirect bypass: external URL that 302s to internal target
- [ ] Check if response body reflected (full SSRF) or just status code (blind SSRF)

**Payloads:**
```
# Direct internal access
{"webhook_url": "http://169.254.169.254/latest/meta-data/iam/security-credentials/"}

# Localhost variations
http://127.0.0.1, http://localhost, http://0, http://[::1]
http://127.1, http://0x7f.0.0.1, http://2130706433

# DNS rebinding (use rebinding service)
http://rebind.it/YOUR_TARGET
```

---

## API8: Security Misconfiguration

- [ ] Check CORS: `Access-Control-Allow-Origin: *` on authenticated endpoints
- [ ] Check error responses: stack traces, internal paths, SQL errors
- [ ] Check HTTP methods: OPTIONS reveals allowed methods
- [ ] Check TLS: version, ciphers, certificate
- [ ] Check headers: `X-Powered-By`, `Server` version exposure
- [ ] Check debug endpoints: `/debug`, `/trace`, `/actuator`, `/graphiql`
- [ ] Check default credentials on API management tools
- [ ] Check API documentation publicly accessible (sensitive endpoint exposure)
- [ ] Check GraphQL introspection enabled in production
- [ ] Check rate limiting headers present and accurate

---

## API9: Improper Inventory Management

- [ ] Discover old API versions: `/api/v1/`, `/api/v2/` — test all for weaker security
- [ ] Compare security controls on old vs new versions
- [ ] Check for shadow APIs not in documentation
- [ ] Fuzz for undocumented endpoints
- [ ] Check if deprecated endpoints still functional
- [ ] Review API documentation for completeness vs actual endpoints
- [ ] Test staging/development API endpoints accessible from production

---

## API10: Unsafe Consumption of Third-Party APIs

- [ ] Identify outbound API calls (from source code or traffic analysis)
- [ ] Check if third-party response data is validated/sanitized before use
- [ ] Check TLS verification on outbound connections
- [ ] Test for SSRF via third-party URL parameters
- [ ] Check if third-party failures cause security-relevant errors
- [ ] Verify webhook authenticity verification (HMAC signatures)
- [ ] Check for API key exposure in client-side third-party calls
