# Player Identity (Delta)

## ADDED Requirements

### Requirement: Password-Verified Local Seat Token Mint

The server SHALL mint a local seat token only after verifying that seat's password on that request, SHALL sign with that seat's key a player token with the same payload, scope and verifier semantics as the primary mint route at that head, and SHALL apply a route-wide attempt window before key derivation, one in-flight mint per seat and a durable per-seat lockout after repeated failures. The attempt window SHALL NOT be keyed by a client address or any forwarded header. A second mint for a seat that already has a mint in flight SHALL be refused immediately with a retry-after, SHALL NOT be queued and SHALL NOT count as a failed password attempt. The per-seat lockout SHALL engage after 5 consecutive failed password attempts and SHALL last 60 seconds (Root-recommended defaults pending the owner answer, configurable only server-side); refusals of a locked seat SHALL NOT run key derivation. The failure count and the lock SHALL both be durable across restart; a successful mint and a re-provision SHALL clear both, and revocation SHALL NOT. A seat id alone SHALL NOT be a credential, and selecting a seat SHALL grant no role.

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

#### Scenario: Lockout threshold and clearing

- **GIVEN** a seat that has received 5 consecutive wrong passwords
- **WHEN** the operator revokes it, and later re-provisions it
- **THEN** the lock and failure count SHALL persist through the revoke and SHALL be cleared by the re-provision

#### Scenario: Second concurrent mint

- **GIVEN** a mint for a seat that is still deriving or signing
- **WHEN** a second mint for the same seat arrives
- **THEN** it SHALL be refused with a retry-after, not queued, and SHALL NOT count as a failed password attempt

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

#### Scenario: Mint racing a revoke

- **GIVEN** a mint that has passed password verification
- **WHEN** a revoke or re-provision commits before the token is issued
- **THEN** no token SHALL be returned and the refusal SHALL be the same as for a revoked seat

### Requirement: Local Seat Routes Accept Only Loopback Same-Origin Requests

Every local-seat route SHALL refuse, before reading the body or deriving any key, a request whose Host is not a loopback literal (127.0.0.1, localhost or [::1], with an optional port), whose Origin header, when present, does not match the request's scheme and Host, or whose Sec-Fetch-Site header, when present, is neither same-origin nor none. This guard applies to the local-seat routes only and discharges nothing for the primary token or vault routes.

#### Scenario: Foreign Host is refused before the body

- **GIVEN** a request to a local-seat route whose Host is a non-loopback name, including a rebinding name whose Origin matches it
- **WHEN** it arrives with any body
- **THEN** it SHALL be refused before the body is parsed and no key derivation SHALL run

#### Scenario: Cross-site Origin is refused before key derivation

- **GIVEN** a request to a local-seat route on a loopback Host
- **WHEN** its Origin names another site or its Sec-Fetch-Site is cross-site or same-site
- **THEN** it SHALL be refused and no password SHALL be verified

### Requirement: Local Seat Credential Secrecy

Seat and operator passwords SHALL be accepted only in a POST body. Passwords, derived keys and seat private keys SHALL NOT appear in URLs, logs, error payloads, operation records, the campaign event journal, match history or any list or mint response. The seat private key SHALL be stored only encrypted under a key derived from the seat password with the existing vault KDF, and decrypted key material SHALL NOT outlive the request. Local-seat responses SHALL carry Cache-Control: no-store.

#### Scenario: Mints leave no secret behind

- **GIVEN** one failed and one successful mint and one provision
- **WHEN** the server log, the error payload, the operation records and the responses are inspected
- **THEN** none SHALL contain a password, derived key or private key, and the stored seat key SHALL be ciphertext
