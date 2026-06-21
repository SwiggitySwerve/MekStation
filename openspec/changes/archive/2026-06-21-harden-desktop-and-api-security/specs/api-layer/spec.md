# api-layer Delta — harden-desktop-and-api-security

## ADDED Requirements

### Requirement: Boundary Schema Validation

The API layer SHALL validate request bodies against an explicit schema at the route
boundary for the abuse-surface mutation endpoints, rejecting malformed input with a
structured `400 Bad Request` before any cryptographic, store, or side-effecting work
is performed. The validation SHALL replace hand-rolled `typeof` guards on these
endpoints.

#### Scenario: Malformed body rejected before any work

- **GIVEN** a `POST /api/multiplayer/auth/token` or `POST /api/multiplayer/matches`
  request whose body does not satisfy the endpoint's schema
- **WHEN** the route handler runs
- **THEN** it SHALL respond `400 Bad Request` with a structured error
- **AND** it SHALL NOT run the key-derivation, identity-unlock, or match-creation
  work for that request.

#### Scenario: Well-formed body parses to a typed value

- **GIVEN** a request body that satisfies the endpoint's schema
- **WHEN** the boundary validation runs
- **THEN** it SHALL produce the typed, parsed value the handler consumes
- **AND** the handler SHALL proceed on the validated value rather than re-checking
  field types ad hoc.

### Requirement: Authentication Rate Limiting

The API layer SHALL apply a per-identifier rate limit in front of the
key-derivation and unbounded-creation endpoints — at minimum
`POST /api/multiplayer/auth/token`, `POST /api/vault/identity/unlock`, and
`POST /api/multiplayer/matches` — so that PBKDF2 key-derivation cost and match
creation cannot be driven without bound. Requests over the limit SHALL receive
`429 Too Many Requests` with a `Retry-After` header, and the limit SHALL be enforced
before the costly work runs.

#### Scenario: Over-limit token requests are throttled before PBKDF2

- **GIVEN** a client exceeds the configured request rate for
  `POST /api/multiplayer/auth/token`
- **WHEN** an over-limit request arrives
- **THEN** the handler SHALL respond `429 Too Many Requests` with a `Retry-After`
  header
- **AND** it SHALL NOT execute the PBKDF2 identity-unlock for that request.

#### Scenario: Under-limit requests proceed normally

- **GIVEN** a client within the configured request rate
- **WHEN** a well-formed request arrives at a rate-limited endpoint
- **THEN** the request SHALL be processed on the normal path
- **AND** no `429` SHALL be returned.

#### Scenario: Limiter scope is honestly stated

- **GIVEN** the rate limiter is enforced in the single-process server model
- **WHEN** the limiter's deployment scope is documented
- **THEN** the documentation SHALL state the limiter is process-local
- **AND** SHALL name a shared-store limiter as the follow-up required for
  multi-instance deployment rather than claiming distributed enforcement the code
  does not provide.

### Requirement: Security Response Headers

The API layer SHALL emit a baseline set of security response headers on the hardened
endpoints, and SHALL enforce an explicit same-origin Cross-Origin Resource Sharing
posture rather than leaving CORS unset.

#### Scenario: Baseline security headers present

- **GIVEN** a response from a hardened API endpoint
- **WHEN** its headers are inspected
- **THEN** `X-Content-Type-Options: nosniff` SHALL be present
- **AND** `X-Frame-Options: DENY` and a `Referrer-Policy` SHALL be present.

#### Scenario: CORS posture is explicit

- **GIVEN** a cross-origin request to a hardened API endpoint
- **WHEN** the response CORS headers are evaluated
- **THEN** the endpoint SHALL apply an explicit same-origin CORS posture
- **AND** SHALL NOT silently echo an arbitrary `Origin` as allowed.
