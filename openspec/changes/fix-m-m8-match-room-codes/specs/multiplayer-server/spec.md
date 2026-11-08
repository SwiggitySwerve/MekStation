## ADDED Requirements

### Requirement: Match stores own lobby invitation lifecycle

Match stores SHALL retain a normalized room code only for lobby metadata.
Creating, updating or closing a non-lobby match SHALL clear roomCode from
metadata and the lookup index. A seat leave that keeps lobby status SHALL retain
the code. An explicit null patch SHALL clear the code.

#### Scenario: Match leaves the lobby

- **GIVEN** a lobby with an invitation code
- **WHEN** its status becomes active or completed
- **THEN** metadata SHALL omit the code and lookup SHALL no longer resolve it
- **AND** a later match SHALL be able to reuse the code safely

### Requirement: Lobby invitation codes have one owner

Stores SHALL reject normalized duplicate lobby codes without partial mutation.
The creation service SHALL retry only RoomCodeCollisionError and SHALL attempt
creation at most five times, preserving match identity while regenerating codes.

#### Scenario: Generated invitation collides

- **GIVEN** a generated code already belongs to another lobby
- **WHEN** a match is created
- **THEN** creation SHALL retry with a fresh code
- **AND** unrelated failures SHALL propagate without retry

### Requirement: Existing match files repair invitation ownership before recovery

The durable store SHALL backfill its own SQLite file before exposing boot reads.
It SHALL clear stale non-lobby codes and normalize lobby codes. Duplicate codes
SHALL retain the earliest created_at row, breaking ties by match_id; other rows
SHALL lose only their codes. A partial UNIQUE index SHALL enforce lobby ownership.
Reapplication SHALL preserve rows and report zero additional cleared codes.

#### Scenario: Restart with legacy duplicate invitations

- **GIVEN** a match file containing duplicate lobby codes and stale active codes
- **WHEN** DurableMatchStore opens before match and campaign recovery reads
- **THEN** first reads SHALL show cleared active metadata and one duplicate owner
- **AND** seats, events and other row fields SHALL be preserved

### Requirement: DELETE closes matches without a live host

An authorized DELETE SHALL close the store through the registry even when no
host exists. Repeated deletion SHALL remain idempotent.

#### Scenario: Hostless lobby is deleted

- **GIVEN** a lobby persisted without a live host
- **WHEN** its host deletes it
- **THEN** it SHALL become completed with no metadata code or resolving invite
