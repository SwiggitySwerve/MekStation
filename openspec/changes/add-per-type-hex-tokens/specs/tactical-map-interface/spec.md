# tactical-map-interface (delta)

## ADDED Requirements

### Requirement: Per-Type Token Rendering

The `HexMapDisplay` SHALL render a unit token whose shape, indicators, and overlays are determined by `unit.type`. A central dispatcher component SHALL route to the correct per-type token renderer.

**Rationale**: Phase 1's mech-only rendering cannot represent vehicles, aerospace, BA, infantry, or ProtoMechs correctly. Different unit types have different silhouettes, facing rules, and stacking.

**Priority**: Critical

#### Scenario: Mech unit renders mech token

- **GIVEN** a BattleMech placed on the map
- **WHEN** the hex renders
- **THEN** `MechToken` SHALL render at the hex position with the mech silhouette and 6-hex facing indicator

#### Scenario: Vehicle renders vehicle token

- **GIVEN** a tracked vehicle placed on the map
- **WHEN** the hex renders
- **THEN** `VehicleToken` SHALL render with a rectangular base and a Tracked motion-type icon

#### Scenario: Aerospace renders aerospace token

- **GIVEN** an aerospace fighter airborne at altitude 3, velocity 5
- **WHEN** the hex renders
- **THEN** `AerospaceToken` SHALL render with a wedge silhouette, an altitude badge reading "3", and a velocity vector arrow whose length is proportional to 5

#### Scenario: BattleArmor mounted renders as badge

- **GIVEN** a BA point mounted on a mech (via `mountedOn`)
- **WHEN** the hex renders
- **THEN** the BA token SHALL render as a small badge overlaid on the host mech token, NOT as a separate token

#### Scenario: Infantry renders stack icon with count

- **GIVEN** a 28-trooper platoon
- **WHEN** the hex renders
- **THEN** `InfantryToken` SHALL render with a stack icon and a "28" label

#### Scenario: ProtoMech point clusters in one hex

- **GIVEN** a 5-proto point placed on one hex
- **WHEN** the hex renders
- **THEN** all 5 ProtoMech silhouettes SHALL appear in a tight cluster within the single hex

---

### Requirement: Per-Type Facing Rules

The map SHALL apply per-type facing conventions when displaying and rotating units.

**Priority**: Critical

#### Scenario: Mech uses 6-hex facing

- **GIVEN** a mech
- **WHEN** the facing arrow is rendered
- **THEN** it SHALL point to one of the 6 hex edges

#### Scenario: Vehicle uses 8-direction facing

- **GIVEN** a ground vehicle
- **WHEN** the facing arrow is rendered
- **THEN** it SHALL point to one of 8 directions (N/NE/E/SE/S/SW/W/NW)

#### Scenario: Aerospace uses velocity vector

- **GIVEN** an aerospace unit
- **WHEN** its heading is rendered
- **THEN** the token SHALL display a velocity vector arrow instead of a fixed facing arrow

#### Scenario: Infantry has no facing

- **GIVEN** an infantry platoon
- **WHEN** the token renders
- **THEN** no facing indicator SHALL appear (infantry do not have facing in Total Warfare)

---

### Requirement: Per-Type Stacking Rules

Multiple units SHARING a hex SHALL obey type-specific stacking rules. Attempts to violate stacking SHALL be rejected or aggregated visually.

**Priority**: Critical

#### Scenario: Mechs cannot share hex

- **GIVEN** a hex already occupied by one mech
- **WHEN** another mech is placed on the same hex
- **THEN** placement SHALL fail with an error message

#### Scenario: Infantry platoons stack to 4

- **GIVEN** a hex with 3 infantry platoons
- **WHEN** a 4th platoon is placed on the same hex
- **THEN** placement SHALL succeed
- **AND** the hex SHALL display a stack indicator "×4"

#### Scenario: BA mounts on mech

- **GIVEN** a mech occupying a hex
- **WHEN** a BA point is placed on the same hex with the "Mount" action
- **THEN** the BA's `mountedOn` SHALL be set to the mech's ID
- **AND** only the mech+BA-badge SHALL render on the hex, not two separate tokens

---

### Requirement: Aerospace Velocity + Altitude Indicators

Aerospace tokens SHALL display current velocity (as a vector arrow) and altitude (as a badge) alongside the token.

**Priority**: High

#### Scenario: Velocity vector length

- **GIVEN** an aerospace unit at velocity 8
- **WHEN** the token renders
- **THEN** the velocity vector length SHALL be proportional to 8 (e.g., 8 × pixel-per-velocity-unit) and oriented along the unit's heading

#### Scenario: Altitude badge

- **GIVEN** an aerospace unit at altitude 5
- **WHEN** the token renders
- **THEN** an altitude badge reading "5" SHALL render in a stable corner of the token

#### Scenario: Landed aerospace visual distinction

- **GIVEN** an aerospace unit at altitude 0 (landed)
- **WHEN** the token renders
- **THEN** the velocity vector SHALL be omitted and the token SHALL render in a "landed" visual state

---

### Requirement: Selection + Range Scaling

The selection ring around a unit and the range-bracket overlays SHALL scale proportionally to the token size so small tokens (BA, ProtoMech) remain legible.

**Priority**: Medium

#### Scenario: BA selection ring scales down

- **GIVEN** a BA point selected on the map
- **WHEN** the selection ring renders
- **THEN** the ring radius SHALL be proportional to the BA token size (smaller than the mech ring)

#### Scenario: Aerospace range brackets use aerospace ranges

- **GIVEN** an aerospace unit with a weapon whose aerospace ranges are 6/12/18/24
- **WHEN** the range-bracket overlay renders
- **THEN** the brackets SHALL use aerospace range bands, NOT ground-unit range bands
