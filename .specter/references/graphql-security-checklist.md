# GraphQL Security Checklist

Comprehensive testing guide for GraphQL API security. Use with `api-security-review` skill.

---

## Discovery & Enumeration

- [ ] Detect GraphQL endpoint (`/graphql`, `/gql`, `/api/graphql`, `/query`)
- [ ] Test introspection query: `{ __schema { types { name } } }`
- [ ] If introspection disabled, use field suggestion leaking (`{ user { na } }` → suggestion: `name`?)
- [ ] Extract full schema via introspection (all types, fields, arguments, mutations, subscriptions)
- [ ] Map all queries, mutations, and subscriptions
- [ ] Identify all custom scalar types and input types
- [ ] Note deprecated fields (often still functional, may have weaker controls)

**Introspection Query:**
```graphql
{
  __schema {
    queryType { name }
    mutationType { name }
    subscriptionType { name }
    types {
      name
      kind
      fields {
        name
        type { name kind ofType { name kind } }
        args { name type { name kind } }
      }
    }
  }
}
```

---

## Authentication & Authorization

- [ ] Test every query/mutation without authentication token
- [ ] Test every query/mutation with low-privilege token
- [ ] Test field-level authorization: can regular user query admin-only fields?
- [ ] Test mutation authorization: can regular user invoke admin mutations?
- [ ] Test nested object authorization: `{ user(id: OTHER) { orders { items } } }`
- [ ] Test subscription authorization: can user subscribe to others' events?
- [ ] Verify authorization on resolver level (not just type level)
- [ ] Check for authorization bypass via aliases or fragments

---

## Injection Attacks

### SQL/NoSQL Injection
- [ ] Test string arguments: `{ user(name: "' OR 1=1 --") { id } }`
- [ ] Test filter arguments: `{ users(filter: { email: { $ne: "" } }) { email } }`
- [ ] Test sorting/ordering parameters
- [ ] Test search/full-text arguments

### Server-Side Template Injection
- [ ] Test string inputs rendered in responses: `{{ 7*7 }}`
- [ ] Test in custom formatting fields

### OS Command Injection
- [ ] Test in file processing mutations, export features
- [ ] Test in DNS/network lookup features

**Payloads:**
```graphql
# SQLi in argument
{ user(id: "1 OR 1=1") { name email } }

# NoSQL injection
{ users(filter: "{\"email\": {\"$gt\": \"\"}}") { email } }
```

---

## Denial of Service

### Query Depth Attack
```graphql
# Deeply nested query — test if depth limiting enforced
{
  user {
    friends {
      friends {
        friends {
          friends {
            friends {
              friends {
                name
              }
            }
          }
        }
      }
    }
  }
}
```
- [ ] Test query depth limits (try 5, 10, 15, 20 levels)
- [ ] Expected: server rejects queries beyond configured depth

### Query Breadth / Complexity Attack
```graphql
# Wide query requesting all fields on complex type
{
  allUsers {
    id name email phone address {
      street city state zip country
    }
    orders {
      id total items { name price quantity product { name category vendor { name } } }
    }
    payments { id amount method last4 }
    sessions { id ip userAgent lastActive }
  }
}
```
- [ ] Test query complexity/cost limits
- [ ] Expected: server rejects overly complex queries

### Alias-Based Attack (Rate Limit Bypass)
```graphql
# Send 1000 queries in a single request using aliases
{
  a1: user(id: "1") { name }
  a2: user(id: "2") { name }
  a3: user(id: "3") { name }
  # ... repeat 1000 times
}
```
- [ ] Test if rate limiting is per-request or per-operation
- [ ] Expected: server limits number of aliases or total cost

### Batch Query Attack
```json
[
  {"query": "{ user(id: 1) { name } }"},
  {"query": "{ user(id: 2) { name } }"},
  {"query": "{ user(id: 3) { name } }"}
]
```
- [ ] Test batch query limits
- [ ] Expected: maximum batch size enforced

### Circular Fragment Attack
```graphql
fragment UserFields on User {
  friends {
    ...FriendFields
  }
}
fragment FriendFields on User {
  friends {
    ...UserFields
  }
}
query { user(id: 1) { ...UserFields } }
```
- [ ] Expected: server detects and rejects circular fragments

---

## Information Disclosure

- [ ] Introspection enabled in production (disclose full schema)
- [ ] Field suggestions in error messages (partial schema disclosure)
- [ ] Verbose error messages with stack traces
- [ ] Debug/trace mode enabled (Apollo tracing, extensions)
- [ ] GraphiQL/Playground enabled in production
- [ ] Type names revealing internal architecture (InternalUserResolver, DebugQuery)
- [ ] Deprecated fields functional and less secured
- [ ] `__typename` leaking object types in polymorphic queries

---

## IDOR / Object Access

- [ ] Test every query accepting an ID with another user's ID
- [ ] Test nested object access across ownership boundaries
- [ ] Test mutations: update/delete with other user's object IDs
- [ ] Test connections/edges: can pagination cursor manipulation expose other data?
- [ ] Test with `node(id: "BASE64_ENCODED_ID")` global ID relay pattern — decode and manipulate

---

## Mutations

- [ ] Test all mutations for authorization
- [ ] Test mass assignment: send extra fields in mutation input
- [ ] Test file upload mutations (multipart form data): type bypass, size limit, RCE
- [ ] Test transaction mutations for race conditions
- [ ] Test delete mutations for cascading effects
- [ ] Test create mutations for object injection (creating privileged objects)

---

## Subscriptions

- [ ] Test subscription authentication enforcement
- [ ] Test subscribing to other users' events
- [ ] Test subscription flooding (many concurrent subscriptions)
- [ ] Test subscription injection (malicious filter/argument)
- [ ] Check WebSocket security (origin validation, auth persistence)

---

## Configuration

- [ ] Introspection disabled in production
- [ ] Query depth limit configured (recommend: 10-15)
- [ ] Query complexity/cost analysis configured
- [ ] Batch query limit configured (recommend: 5-10)
- [ ] Maximum alias count configured
- [ ] Timeout configured for long-running queries
- [ ] Persisted queries / allowlisting in use for production
- [ ] Field-level error masking (no internal details in errors)
- [ ] APQ (Automatic Persisted Queries) registered queries only
