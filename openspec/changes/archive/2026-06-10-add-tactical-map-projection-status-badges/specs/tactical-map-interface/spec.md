# Spec Delta: Tactical Map Interface

## ADDED Requirements

### Requirement: Projection Status Badges

The tactical map interface SHALL render compact non-color status badges for blocked or mixed per-hex tactical projections.

**Priority**: High

#### Scenario: Mixed movement and combat projection is visible

**GIVEN** a hex projection has reachable movement data and blocked combat data
**WHEN** the hex cell renders
**THEN** the cell SHALL expose projection intent `movement-combat`
**AND** the cell SHALL expose projection status `mixed`
**AND** the cell SHALL render a projection status badge for that hex
**AND** the badge SHALL expose the projection status, intent, blocked reasons, and explanation as stable metadata
**AND** existing movement, combat, terrain, elevation, and invalid badges SHALL remain available

#### Scenario: Blocked projection is visible

**GIVEN** a hex projection has blocked movement or blocked combat without a legal tactical surface
**WHEN** the hex cell renders
**THEN** the cell SHALL expose projection status `blocked`
**AND** the cell SHALL render a projection status badge for that blocked state
**AND** the badge SHALL use the projection blocked reasons instead of recalculating movement or combat legality
