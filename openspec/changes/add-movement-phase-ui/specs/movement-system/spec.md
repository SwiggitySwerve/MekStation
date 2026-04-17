# movement-system Specification Delta

## ADDED Requirements

### Requirement: Planned Movement UI Projection

The movement system SHALL expose a `plannedMovement` projection shape on the
gameplay store that represents the player's in-progress (uncommitted)
movement plan for a selected unit, so UI surfaces can render path previews
and facing pickers without mutating session state.

#### Scenario: Planned movement records destination, path, and facing

- **GIVEN** a selected Player-side unit during Movement phase
- **WHEN** the player hovers a reachable hex and commits it as destination
- **THEN** `plannedMovement` SHALL contain `unitId`, `destination`, `path`,
  `mpType`, and `facing`
- **AND** `facing` SHALL default to the travel direction of the final path
  segment

#### Scenario: Planned movement cleared on phase exit

- **GIVEN** `plannedMovement` is set for the current Movement phase
- **WHEN** the phase transitions to Weapon Attack
- **THEN** `plannedMovement` SHALL be cleared to `null`

#### Scenario: Planned movement cleared on deselection

- **GIVEN** `plannedMovement` is set for unit A
- **WHEN** the player selects unit B
- **THEN** `plannedMovement` for A SHALL be cleared
- **AND** the store SHALL hold at most one `plannedMovement` at a time

### Requirement: Reachable Hex Derivation by MP Type

The movement system SHALL provide a `deriveReachableHexes(unit, mpType)`
function that returns every hex reachable with the given movement type
(Walk, Run, Jump), including the MP cost to each hex, using the existing A\*
pathfinder.

#### Scenario: Walk reachable hexes

- **GIVEN** a BattleMech with 5 walk MP at hex {0,0}
- **WHEN** `deriveReachableHexes(unit, MpType.Walk)` is called
- **THEN** the result SHALL contain every hex whose cheapest path cost is
  <= 5 MP
- **AND** each entry SHALL contain `{hex, mpCost, mpType: MpType.Walk,
reachable: true}`

#### Scenario: Run reachable hexes extend walk reach

- **GIVEN** a BattleMech with 5 walk MP, 8 run MP
- **WHEN** `deriveReachableHexes(unit, MpType.Run)` is called
- **THEN** the result SHALL contain every hex whose cheapest path cost is
  <= 8 MP

#### Scenario: Jump reachable hexes skip blocked terrain

- **GIVEN** a BattleMech with 4 jump MP and a woods hex 3 hexes away
- **WHEN** `deriveReachableHexes(unit, MpType.Jump)` is called
- **THEN** the woods hex SHALL be marked reachable with `mpCost = 3`
- **AND** intermediate hexes between origin and landing SHALL NOT be in
  the result

### Requirement: Movement Commit Event Emission

The movement system SHALL, on player-confirmed movement commit, append a
`MovementLocked` event to the session event stream whose payload contains
the committed path, final facing, and declared MP type.

#### Scenario: Commit path emits MovementLocked event

- **GIVEN** a valid `plannedMovement` for a Player-side unit
- **WHEN** the player clicks "Commit Move"
- **THEN** a `MovementLocked` event SHALL be appended with
  `{unitId, path, facing, mpType}`
- **AND** the unit's position SHALL update to the path's terminal hex
- **AND** the unit's facing SHALL update to the planned facing

#### Scenario: Commit with invalid destination rejected

- **GIVEN** a `plannedMovement` whose destination is now unreachable
  because an intervening event blocked the path
- **WHEN** the player clicks "Commit Move"
- **THEN** the commit SHALL be rejected
- **AND** no `MovementLocked` event SHALL be appended
- **AND** an error toast `"Destination no longer reachable"` SHALL
  display
