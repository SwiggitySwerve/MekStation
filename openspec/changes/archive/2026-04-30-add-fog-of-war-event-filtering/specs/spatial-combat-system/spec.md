# spatial-combat-system Specification Delta

## ADDED Requirements

### Requirement: Per-Player Visibility Helper

The spatial combat system SHALL expose a helper that determines whether
any unit owned by a player can see a given target unit, enabling the
fog-of-war filter to run in O(own-units) per query.

#### Scenario: Helper signature

- **GIVEN** the spatial combat module's public API
- **WHEN** inspected
- **THEN** it SHALL export `canPlayerSeeUnit(playerId: string,
unitId: string, state: IGameState): boolean`
- **AND** it SHALL export `visibleUnitsForPlayer(playerId: string,
state: IGameState): string[]`

#### Scenario: Returns true for own units

- **GIVEN** `playerId = 'pid_a'` and a unit `U` owned by `pid_a`
- **WHEN** `canPlayerSeeUnit('pid_a', U.id, state)` is called
- **THEN** the result SHALL be `true`
- **AND** no LOS computation SHALL be performed

#### Scenario: Returns true when any owned unit has LOS

- **GIVEN** three units owned by `pid_a` and one enemy unit `E`
- **AND** exactly one of the owned units has clear LOS to `E`
- **WHEN** `canPlayerSeeUnit('pid_a', E.id, state)` is called
- **THEN** the result SHALL be `true`

#### Scenario: Returns false when no owned unit can see

- **GIVEN** all units owned by `pid_a` have LOS to `E` blocked or `E`
  is outside every owned unit's sensor range
- **WHEN** `canPlayerSeeUnit('pid_a', E.id, state)` is called
- **THEN** the result SHALL be `false`

### Requirement: Visible Units Aggregate Helper

The system SHALL provide a per-player aggregate that lists every unit
the player can currently see, for UI rendering and broadcast
optimization.

#### Scenario: Aggregate includes own units

- **GIVEN** a player owns 3 units
- **WHEN** `visibleUnitsForPlayer(playerId, state)` is called
- **THEN** the result SHALL include all 3 owned unit ids

#### Scenario: Aggregate includes seen enemies

- **GIVEN** a player owns 3 units and can see 2 enemies
- **WHEN** the helper is called
- **THEN** the result SHALL contain exactly 5 ids (3 own + 2 seen)

#### Scenario: Aggregate sorted and unique

- **GIVEN** any state
- **WHEN** the helper returns its result
- **THEN** ids SHALL be unique
- **AND** ids SHALL be sorted lexicographically so the output is
  deterministic for cache hashing
