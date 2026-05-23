# Spec Delta: Tactical Map Interface

## ADDED Requirements

### Requirement: Rules-Backed Hex Projection Contract

The tactical map interface SHALL compose terrain, elevation, movement, combat, path, selected, and hover state into a single per-hex projection before rendering hex cells or hover explanations.

**Priority**: Critical

#### Scenario: Projection composes existing rules outputs

**GIVEN** `HexMapDisplay` has terrain, movement range, combat range, selected hex, hovered hex, and highlighted path inputs
**WHEN** the map derives cell render state
**THEN** each rendered hex SHALL have one projection containing its terrain/elevation data
**AND** any matching `IMovementRangeHex` SHALL be attached without recalculating movement rules
**AND** any matching `ICombatRangeHex` SHALL be attached without recalculating combat, LOS, cover, range, or firing-arc rules
**AND** selected, hovered, path-index, and attack-range state SHALL be represented on the same projection

#### Scenario: Projection explains legal and blocked states

**GIVEN** a projected hex has reachable movement, blocked movement, attackable combat, blocked combat, or both movement and combat data
**WHEN** the projection is built
**THEN** it SHALL expose a stable `status` of `neutral`, `legal`, `blocked`, or `mixed`
**AND** it SHALL expose an `intent` describing whether the hex is currently terrain-only, selected, path, movement, combat, or movement+combat
**AND** it SHALL preserve player-facing movement and combat blocked reasons from the underlying rules projection

#### Scenario: Top-down and isometric consume the same projection

**GIVEN** a map can switch between `topDown` and an isometric projection mode
**WHEN** the projection mode changes
**THEN** the same per-hex projection facts SHALL remain attached to the rendered hex
**AND** projection mode SHALL NOT recalculate or mutate movement, combat, LOS, terrain, or path legality
