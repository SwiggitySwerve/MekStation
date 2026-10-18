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
