# User Identity (Delta)

## ADDED Requirements

### Requirement: Local Seat Credentials Are Not Vault Identities

Operator-managed local seat credentials SHALL be stored separately from vault identities and SHALL NOT be vault identities. Creating, re-provisioning, revoking, claiming or renewing a local seat SHALL NOT create, list, activate, switch or delete any vault identity, and multi-identity management SHALL remain excluded. The primary vault identity's create, unlock, export and signing behavior SHALL be unchanged; the primary password SHALL only be verified to authorize operator seat writes.

#### Scenario: Seat use leaves the primary vault untouched

- **GIVEN** an active primary vault identity and two provisioned local seats
- **WHEN** guests claim, mint and renew their seat credentials
- **THEN** the active vault row SHALL be the same primary identity
- **AND** no vault identity row SHALL be added or switched

#### Scenario: Operator writes require the primary password each time

- **GIVEN** an operator-managed loopback server with a primary vault identity
- **WHEN** a seat provision, re-provision or revoke request carries a wrong or missing operator password
- **THEN** the request SHALL be refused before any seat state changes
- **AND** the UI SHALL disclose that the operator can act as any seat and that shared OS access is not isolated

### Requirement: Operator Seat Writes Are Throttled Before Key Derivation

Operator seat writes SHALL be subject to a route-wide attempt window applied before any key derivation, including the primary password check. The window SHALL NOT be keyed by a client address or any forwarded header, so the operator path never becomes an unthrottled oracle for the primary vault password.

#### Scenario: Operator password guessing is throttled

- **GIVEN** the operator attempt window is exhausted by wrong primary passwords
- **WHEN** a provision request carries the correct primary password, with or without a different forwarded client-address header
- **THEN** it SHALL be refused with a retry-after and no key derivation SHALL run
- **AND** no seat state SHALL change

### Requirement: Operator Seat Writes Are Idempotent and Generation-Fenced

Operator seat writes SHALL carry a client operation id and an expected seat generation. A duplicate delivery of a recorded operation SHALL return the recorded outcome without re-verifying or re-applying any seat password; a reused operation id whose non-secret parameters differ SHALL be refused; a stale expected generation SHALL be refused without any state change. The operator UI SHALL mint a fresh operation id for every user-initiated submit, so a deliberate resubmission is a new operation fenced by the expected generation.

#### Scenario: Duplicate delivery replays the recorded outcome

- **GIVEN** a provision recorded under an operation id
- **WHEN** the same request is delivered again with that operation id
- **THEN** the recorded generation and outcome SHALL be returned and the originally applied seat password SHALL remain in force

#### Scenario: Reused operation id with different parameters is refused

- **GIVEN** an operation id recorded for one seat and kind
- **WHEN** it is sent with a different seat, kind or label
- **THEN** the request SHALL be refused and no seat state SHALL change

#### Scenario: Stale expected generation is refused

- **GIVEN** a seat whose generation advanced after the operator loaded it
- **WHEN** a new operation carries the older expected generation
- **THEN** the request SHALL be refused with the current generation and no seat state SHALL change
