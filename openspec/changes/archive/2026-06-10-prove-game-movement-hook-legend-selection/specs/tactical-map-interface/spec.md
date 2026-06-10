# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Rules-Backed Hex Projection Contract

The tactical map interface SHALL compose terrain, elevation, movement, combat, path, selected, and hover state into a single per-hex projection before rendering hex cells or hover explanations.

#### Scenario: Live movement hook seeds legend-selected projection

**GIVEN** the live game-session movement hook has a selected player-controlled unit in Movement phase
**AND** the interactive session reports the selected unit's movement capability
**WHEN** the map MP legend selection callback receives Walk, Run, or Jump
**THEN** the hook SHALL seed planned movement for the selected unit using the selected movement type
**AND** the seed plan SHALL use the selected unit's current position and facing until the player selects a destination
**AND** the hook SHALL expose legend state matching the newly selected projection mode

#### Scenario: Live movement hook ignores disabled jump legend selection

**GIVEN** the live game-session movement hook has a selected player-controlled unit in Movement phase
**AND** the interactive session reports zero effective Jump MP for that unit
**WHEN** the map MP legend selection callback receives Jump
**THEN** the hook SHALL leave planned movement unchanged
**AND** the hook SHALL expose Jump as unavailable in the MP legend state
