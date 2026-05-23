## ADDED Requirements

### Requirement: Movement Tooltip Path Summary

The tactical map interface SHALL summarize projected movement path length in hover explanations when movement projection includes a path.

#### Scenario: Movement-only hover shows path length

**GIVEN** a movement destination has movement projection data with a path containing multiple hexes
**WHEN** the player hovers the destination and no combat projection is active for that hex
**THEN** the movement tooltip SHALL show the number of path steps
**AND** it SHALL preserve MP, terrain, elevation, heat, stand-up, and blocked-reason rows when present.

#### Scenario: Combined movement and combat hover shows path length

**GIVEN** a destination has both movement projection data and combat projection data
**AND** the movement projection includes a path containing multiple hexes
**WHEN** the player hovers the destination
**THEN** the combined tactical tooltip SHALL show the number of path steps
**AND** it SHALL preserve the combined movement, combat, terrain, stand-up, and projection-reason rows.
