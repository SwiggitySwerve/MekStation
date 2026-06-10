# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Rules-Backed Hex Projection Contract

The tactical map interface SHALL compose terrain, elevation, movement, combat, path, selected, and hover state into a single per-hex projection before rendering hex cells or hover explanations.

#### Scenario: Projection explains legal and blocked states

**GIVEN** a projected hex has reachable movement, blocked movement, attackable combat, blocked combat, or both movement and combat data
**WHEN** the projection is built
**THEN** it SHALL expose a stable `status` of `neutral`, `legal`, `blocked`, or `mixed`
**AND** it SHALL expose an `intent` describing whether the hex is currently terrain-only, selected, path, movement, combat, or movement+combat
**AND** it SHALL expose a movement-channel status of `none`, `legal`, `blocked`, or `mixed`
**AND** it SHALL expose a combat-channel status of `none`, `range-only`, `attackable`, `blocked`, or `mixed`
**AND** it SHALL preserve player-facing movement and combat blocked reasons from the underlying rules projection
**AND** rendered hex metadata, projection badges, and combined tactical hover tooltips SHALL expose the channel statuses without recalculating movement or combat rules
