---
name: api-security-review
description: >
  API-specific security testing for REST, GraphQL, WebSocket, and gRPC endpoints.
  Covers authentication, authorization, injection, rate limiting, mass assignment,
  and API-specific attack patterns.
applyTo: "**/*.{js,ts,py,rb,java,go,php,yaml,yml,json,graphql,gql,proto}"
---

# API Security Review

## Purpose

Perform targeted security review of API endpoints. APIs present unique attack surface beyond standard web vulnerabilities: mass assignment, BOLA/BFLA, excessive data exposure, lack of rate limiting, and GraphQL-specific issues. This skill covers REST, GraphQL, WebSocket, and gRPC APIs.

## Triggers

- API endpoints identified during recon analysis
- User requests API security review
- API documentation (OpenAPI/Swagger, GraphQL schema) available
- Code review identifies API route definitions
- New API version or endpoint deployed

## Required Inputs

| Input | Description | Required |
|-------|-------------|----------|
| `governance_context` | Active engagement governance record | Yes |
| `api_target` | Base URL or API endpoint(s) | Yes |
| `api_type` | REST, GraphQL, WebSocket, gRPC | Auto-detected |
| `api_docs` | OpenAPI/Swagger spec, GraphQL schema, or proto files | Recommended |
| `auth_mechanism` | Bearer token, API key, OAuth, session cookie | Recommended |
| `source_code` | API route handlers and middleware | Recommended |

## Workflow

1. **Scope Verification** — Confirm API target is within authorized scope.

2. **API Discovery & Mapping** — Enumerate:
   - All endpoints (from docs, source code, or active discovery)
   - HTTP methods per endpoint
   - Request/response schemas
   - Authentication requirements per endpoint
   - Rate limiting configuration
   - API versioning scheme
   - For GraphQL: full schema introspection (queries, mutations, subscriptions, types)

3. **OWASP API Security Top 10 (2023) Review:**

   **API1: Broken Object-Level Authorization (BOLA)**
   - Test every endpoint that accepts object IDs
   - Swap IDs between users: can user A access user B's objects?
   - Test with sequential IDs, UUIDs, and encoded references
   - Check bulk/list endpoints for data leakage

   **API2: Broken Authentication**
   - Test authentication on every endpoint (remove token, use expired token)
   - Check for authentication bypass via parameter pollution
   - Test token generation entropy and lifetime
   - Verify logout actually invalidates tokens

   **API3: Broken Object Property Level Authorization**
   - Test mass assignment: send extra fields in create/update requests
   - Check response filtering: does the API return more fields than needed?
   - Test field-level access: can regular user see/modify admin-only fields?

   **API4: Unrestricted Resource Consumption**
   - Check rate limiting on all endpoints (especially auth, search, export)
   - Test pagination limits (request page_size=999999)
   - Check file upload size limits
   - Test query complexity limits (GraphQL: deeply nested queries)
   - Check for batch/bulk endpoints without limits

   **API5: Broken Function-Level Authorization (BFLA)**
   - Test admin endpoints with regular user tokens
   - Check HTTP method restrictions (can regular user PUT/DELETE?)
   - Test undocumented endpoints found during discovery
   - Verify role-based access on every function

   **API6: Unrestricted Access to Sensitive Business Flows**
   - Identify valuable business flows (purchase, transfer, signup)
   - Test for anti-automation controls
   - Check for race conditions in critical flows
   - Test business logic bypass (skip steps, negative values)

   **API7: Server-Side Request Forgery (SSRF)**
   - Test URL/webhook parameters for SSRF
   - Check file import/fetch features
   - Test with internal IPs, cloud metadata URLs
   - Check for protocol restrictions

   **API8: Security Misconfiguration**
   - Check CORS on API endpoints
   - Verify error responses don't leak internal details
   - Check for exposed debug/health/metrics endpoints
   - Review API gateway configuration

   **API9: Improper Inventory Management**
   - Identify old API versions still accessible
   - Check for shadow/undocumented APIs
   - Test deprecated endpoints for weaker security
   - Map API vs documented API (find gaps)

   **API10: Unsafe Consumption of Third-Party APIs**
   - Identify outbound API calls in source code
   - Check if responses from third-party APIs are validated
   - Verify TLS on outbound connections
   - Check for SSRF via third-party URL construction

4. **GraphQL-Specific Testing** (if applicable):
   - Introspection query enabled? (`__schema`, `__type`)
   - Query depth limiting (deeply nested query bomb)
   - Query complexity/cost analysis
   - Batch query abuse
   - Field suggestions leaking schema info
   - Mutation authorization (field-level)
   - Subscription authorization
   - Alias-based rate limit bypass

5. **WebSocket-Specific Testing** (if applicable):
   - Authentication during handshake vs per-message
   - Authorization on each message type
   - Input validation on WebSocket messages
   - Cross-Site WebSocket Hijacking (CSWSH)
   - Message injection
   - Origin validation

6. **Input Validation Testing** — On each endpoint:
   - SQL/NoSQL injection in query parameters and body
   - Command injection in processing parameters
   - XSS in reflected API responses
   - XML/JSON injection in structured inputs
   - Path traversal in file-related parameters
   - Type confusion (string where int expected, array where string expected)

7. **Classify & Route** — Per `severity-matrix.md`, route to `bug-bounty-triage`

## Allowed Actions

- Enumerate API endpoints from docs, code, or active discovery
- Send test requests with manipulated parameters within authorized scope
- Test authentication and authorization boundaries
- Analyze API response data for over-exposure
- Test rate limiting and resource consumption
- Review API source code for vulnerabilities
- GraphQL introspection and schema analysis
- Test BOLA/BFLA with credential swapping
- Fuzz input fields for injection vulnerabilities
- Test business logic flows

## Forbidden Actions

- Test APIs outside authorized scope
- Exfiltrate real user data found through BOLA
- Perform sustained DoS against rate limiting (test, don't abuse)
- Use discovered API keys to access third-party services
- Modify production data without explicit authorization
- Skip authentication testing because "it probably works"

## Output Format

```markdown
### [FINDING-ID]: [Title]

| Field | Value |
|-------|-------|
| **Severity** | [S1-S5] |
| **Confidence** | [C1-C4] |
| **Status** | Suspected / Confirmed |
| **Category** | [OWASP API Top 10 category + CWE] |
| **Affected Endpoint** | [METHOD /path] |
| **API Type** | REST / GraphQL / WebSocket / gRPC |

#### Issue Summary
[What the vulnerability is and how it manifests in the API]

#### Evidence
\```http
[Request]
[Response — sensitive data REDACTED]
\```

**Reproduction Steps:**
1. Authenticate as [role/user]
2. Send request to [endpoint] with [manipulation]
3. Observe [result]

#### Impact
[What an attacker can achieve via this API vulnerability]

#### Remediation
[Specific fix: add authorization check, implement rate limiting, filter response fields, etc.]
\```[language]
[Corrected code or configuration]
\```

#### Validation Notes
[How to verify the fix works. Expected behavior after remediation.]
```

## References

- `references/authz-and-authn-checklist.md` — Authentication and authorization testing
- `references/web-common-risks.md` — Injection and SSRF patterns
- `references/severity-matrix.md` — Severity classification
