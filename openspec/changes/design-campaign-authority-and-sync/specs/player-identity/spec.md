# Player Identity (Delta)

## ADDED Requirements

### Requirement: Password-Verified Local Seat Token Mint

The server SHALL mint a local seat token only after verifying that seat's password on that request, SHALL sign an ordinary unscoped player token with that seat's key through the existing canonical payload, and SHALL apply a route-wide attempt window before key derivation, one in-flight mint per seat and a durable per-seat lockout after repeated failures. A seat id alone SHALL NOT be a credential, and selecting a seat SHALL grant no role.

#### Scenario: Distinct stable principals

- **GIVEN** two provisioned seats and a primary vault identity
- **WHEN** a GM profile and two guest profiles mint, reload and reconnect
- **THEN** three distinct non-secret playerIds SHALL be verified by the unchanged token verifier
- **AND** renewal SHALL return the same playerId while the seat key is unchanged

#### Scenario: Brute force is throttled durably

- **GIVEN** a provisioned seat
- **WHEN** wrong passwords reach the lockout threshold
- **THEN** further mints for that seat, including with the correct password, SHALL be refused until the lockout expires
- **AND** the lockout SHALL survive a server restart

### Requirement: Local Seat Revocation and Re-provision

Revocation SHALL be effective at the next mint or renewal; an already-issued seat bearer SHALL keep its original lifetime of at most one hour, with no immediate eviction or retroactive invalidation. A revoke or re-provision that completes while a mint is in progress SHALL prevent that mint from issuing a token. Re-provision SHALL generate a new key and therefore a new playerId, and the previous password SHALL stop working.

#### Scenario: Revoked seat keeps only its issued bearer

- **GIVEN** a seat bearer issued before the operator revokes the seat
- **WHEN** the guest requests another mint or renewal
- **THEN** the request SHALL be refused even with the correct password
- **AND** the issued bearer SHALL verify only until its original expiry

#### Scenario: Re-provision rotates the principal

- **GIVEN** a seat re-provisioned with a new password
- **WHEN** the guest uses the old password and then the new password
- **THEN** the old password SHALL fail and the new one SHALL mint a different playerId that requires ordinary membership admission
