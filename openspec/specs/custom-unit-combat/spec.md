# custom-unit-combat Specification

## Purpose

Defines authoritative admission of supported server-saved biped BattleMech designs, immutable recorded construction for replay and recovery, private construction projection, and campaign selection with distinct source and roster identities. Catalog-route or source presence SHALL NOT by itself constitute accepted custom combat.

## Requirements

### Requirement: Supported saved construction is resolved by authority

The combat adapter SHALL support an exact persisted `custom-*` reference only when the server library contains a matching biped BattleMech construction accepted by the shared strict snapshot projection. Exact customCombatRefs membership is a launch-admission gate and SHALL NOT by itself satisfy this construction-acceptance requirement. The server SHALL resolve its own persisted definition and SHALL NOT trust a client-supplied construction, infer a canonical replacement, or skip a missing selected custom unit. Canonical adaptation SHALL retain its existing behavior.

#### Scenario: Saved design seeds its actual construction

- **GIVEN** a server-saved biped BattleMech with modified armor and equipment
- **WHEN** the authoritative launch resolves its exact custom reference
- **THEN** adapted armor, movement, weapons, ammunition, heat, and critical locations SHALL derive from that saved construction
- **AND** its custom reference and separate game-unit identity SHALL be preserved

#### Scenario: Missing or unsupported design refuses launch

- **GIVEN** a missing, malformed, mismatched-id, or unsupported custom construction
- **WHEN** a launch attempts to adapt that reference
- **THEN** launch SHALL fail explicitly without a stock fallback or a silently omitted unit
- **AND** invalid source admission SHALL produce no encounter or session mutation

### Requirement: Recorded construction survives library changes

GameCreated SHALL contain a detached validated construction snapshot for each launched custom unit. Recovery and rewind SHALL prefer the recorded snapshot over the mutable library. A present invalid or mismatched snapshot SHALL refuse recovery rather than consult another source. Legacy canonical histories SHALL remain supported.

#### Scenario: Durable recovery after design edit and deletion

- **GIVEN** a persisted active session launched from a saved custom design
- **WHEN** the library design is changed or deleted and the durable store is closed and reopened
- **THEN** server recovery SHALL restore the original construction-dependent combat data from the recorded history
- **AND** subsequent deterministic replay SHALL preserve session identity and event order
- **AND** a new launch of the deleted reference SHALL fail

#### Scenario: Invalid recorded construction cannot fall back

- **GIVEN** a recorded custom snapshot with an invalid shape or mismatched source identity
- **WHEN** recovery or replay validation reads that history
- **THEN** it SHALL report refusal or corruption
- **AND** it SHALL NOT rewrite history or replace the snapshot with the current library design

### Requirement: Replay validates construction without external lookup

The GameCreated parser SHALL validate the optional custom construction with a strict concrete schema and deterministic parser identity. Replay validation SHALL require no library, network, clock, or random lookup. Existing canonical GameCreated histories SHALL remain valid. Changed parser fingerprints SHALL invalidate incompatible derived checkpoints without rewriting persisted events.

#### Scenario: Strict nested snapshot validation

- **GIVEN** a valid recorded custom construction
- **WHEN** replay gates GameCreated
- **THEN** the payload SHALL be accepted
- **AND** unknown construction, armor, or movement fields SHALL be rejected

### Requirement: Construction follows server visibility rules

Server event projection SHALL disclose a recorded custom construction only to a viewer entitled to that unit's private construction under the existing visibility contract. Live, reconnect, and replay projections SHALL use the same rule.

#### Scenario: Hidden construction remains private

- **GIVEN** an owning player, an opposing player, and a spectator observing a fogged match
- **WHEN** GameCreated and recovered history are projected for each viewer
- **THEN** the owner SHALL receive allowed construction for their unit
- **AND** opponents and spectators SHALL NOT receive the hidden construction payload

### Requirement: Campaign picker preserves durable saved identities

The campaign saved-design picker SHALL merge server-saved metadata with existing local saved-design metadata, prefer server metadata for an identical id, and preserve distinct source and roster-instance identities. Local-only visibility SHALL NOT imply server combat eligibility.

#### Scenario: Saved design survives the browser handoff

- **GIVEN** a custom design saved through the production API
- **WHEN** it is selected for a new campaign and the campaign is persisted and reloaded
- **THEN** server readback SHALL contain its exact custom reference and separate roster-instance identity
- **AND** launch readiness SHALL use authoritative combat-catalog membership

#### Scenario: Catalog failure preserves honest recovery

- **GIVEN** one picker source fails
- **WHEN** the remaining source provides usable metadata
- **THEN** available saved rows MAY remain visible without inventing combat eligibility
- **AND** if no source can establish usable data the picker SHALL expose a retryable failure
