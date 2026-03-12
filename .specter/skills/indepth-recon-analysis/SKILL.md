---
name: indepth-recon-analysis
description: >
  Deep reconnaissance review and attack surface mapping. Analyzes gathered recon data
  to identify exposed services, entry points, technology stacks, and potential attack vectors.
applyTo: "**/*"
---

# In-Depth Recon Analysis

## Purpose

Systematically analyze reconnaissance data to map the full attack surface of a target. Identify exposed services, technology stacks, entry points, data flows, and potential weaknesses. Transform raw recon into actionable intelligence for downstream security skills.

## Triggers

- New target authorized for assessment
- User provides recon data (subdomains, ports, endpoints, technology fingerprints)
- User requests attack surface mapping
- Pre-engagement scoping requires surface analysis
- Source code available for analysis of exposed functionality

## Required Inputs

| Input | Description | Required |
|-------|-------------|----------|
| `governance_context` | Active engagement governance record | Yes |
| `target` | Target application, domain, or repository | Yes |
| `recon_data` | Any combination of: subdomain lists, port scans, HTTP responses, technology fingerprints, directory listings, source code, API documentation | At least one |

## Workflow

1. **Scope Verification** — Confirm all recon targets are within authorized scope.

2. **Asset Inventory** — Catalog all discovered assets:
   - Domains and subdomains
   - IP addresses and open ports
   - Web applications and endpoints
   - API endpoints (REST, GraphQL, WebSocket, gRPC)
   - Login/authentication pages
   - File upload/download endpoints
   - Admin/management interfaces
   - Third-party integrations

3. **Technology Fingerprinting** — Identify:
   - Web servers (nginx, Apache, IIS, etc.)
   - Application frameworks (Express, Django, Rails, Spring, etc.)
   - Frontend frameworks (React, Angular, Vue, etc.)
   - CMS platforms (WordPress, Drupal, etc.)
   - Database technologies (inferred from errors, headers, behavior)
   - Cloud services (AWS, Azure, GCP indicators)
   - CDN/WAF presence (Cloudflare, Akamai, etc.)
   - Version numbers where observable

4. **Entry Point Mapping** — For each endpoint, identify:
   - Input vectors (query params, POST body, headers, cookies, file uploads)
   - Authentication requirements
   - Authorization levels
   - Data formats accepted (JSON, XML, multipart, GraphQL)
   - Response types and data exposed

5. **Data Flow Analysis** — Map:
   - User → Application → Database paths
   - Authentication/session flows
   - File upload → storage → retrieval paths
   - Third-party API integrations
   - Webhook/callback endpoints
   - Inter-service communication

6. **Exposure Assessment** — Flag:
   - Unnecessary services exposed to internet
   - Debug/development endpoints in production
   - Default pages or error pages leaking information
   - Old/deprecated endpoints still active
   - Admin interfaces without IP restriction
   - Backup files, source maps, `.git` directories
   - Open redirects
   - CORS misconfigurations

7. **Attack Vector Identification** — For each significant entry point:
   - Map applicable vulnerability classes (reference `web-common-risks.md`)
   - Assess WAF/filtering presence and potential bypass
   - Identify chaining opportunities
   - Note authentication/authorization weaknesses
   - Flag high-value targets (admin panels, payment flows, PII endpoints)

8. **Route Findings** — Send identified vectors to appropriate skills via `bug-bounty-triage`

## Allowed Actions

- Analyze provided recon data (passive analysis)
- Parse and normalize scan/crawl output
- Fingerprint technology from response headers, HTML, JS files
- Map application structure from source code
- Identify exposed endpoints and input vectors
- Correlate findings across data sources
- Generate attack surface maps
- Recommend targeted testing priorities
- Active probing within authorized scope (directory brute-force, parameter discovery, endpoint enumeration)
- DNS enumeration and subdomain discovery within scope
- Banner grabbing and service identification
- Content discovery (hidden paths, backup files, dev artifacts)

## Forbidden Actions

- Scan or probe targets not in authorized scope
- Send exploit payloads during recon phase (recon only)
- Perform denial of service testing during recon
- Access or exfiltrate data discovered during recon
- Ignore scope boundaries for "interesting" discoveries
- Report recon artifacts as confirmed vulnerabilities without validation

## Output Format

### Attack Surface Report

```markdown
## Recon Analysis: [Target]

### Asset Inventory

| Asset | Type | Technology | Auth Required | Notes |
|-------|------|-----------|---------------|-------|
| app.example.com | Web App | React + Express | Yes | Main application |
| api.example.com/v2 | REST API | Node.js | Bearer token | API v2 |
| admin.example.com | Admin Panel | React | Yes (MFA) | Staff only |

### Technology Stack

| Layer | Technology | Version | Notes |
|-------|-----------|---------|-------|
| Web Server | nginx | 1.24.x | Via Server header |
| Application | Express.js | Unknown | Via response patterns |
| Frontend | React | 18.x | Via JS bundles |
| Database | PostgreSQL | Unknown | Via error messages |

### Entry Points

| Endpoint | Method | Inputs | Auth | Priority |
|----------|--------|--------|------|----------|
| /api/v2/users/:id | GET | path param (id) | Bearer | High — IDOR candidate |
| /api/v2/upload | POST | multipart file | Bearer | High — file upload |
| /login | POST | email, password | None | Medium — auth testing |
| /search | GET | q (query param) | None | Medium — injection candidate |

### Exposure Findings

| Finding | Severity | Confidence | Notes |
|---------|----------|------------|-------|
| .git directory accessible | S3 | C2 | Returns 200, needs content verification |
| Admin panel no IP restriction | S3 | C2 | Publicly accessible, has MFA |
| Server version in headers | S5 | C1 | nginx/1.24.0 exposed |

### Recommended Testing Priority

1. [High] IDOR testing on /api/v2/users/:id — sequential IDs observed
2. [High] File upload abuse on /api/v2/upload — test extension/type bypass
3. [Medium] SQL/NoSQL injection on /search — unparameterized query suspected
4. [Medium] Authentication flow analysis — test rate limiting, enumeration
```

## References

- `references/web-common-risks.md` — Vulnerability taxonomy for vector identification
- `references/authz-and-authn-checklist.md` — Authentication entry point analysis
- `references/severity-matrix.md` — Severity classification
