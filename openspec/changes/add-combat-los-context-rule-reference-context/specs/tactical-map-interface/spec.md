# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Combat Projection Explanation Details

The tactical map interface SHALL include rules-backed combat details in the
shared per-hex tactical projection explanation.

#### Scenario: Combat LOS context rows expose rule-reference evidence

- **GIVEN** a combat projection marks a target hex as blocked or partially
  obstructed by line of sight
- **WHEN** the player hovers that combat hex and the LOS context row is shown
- **THEN** the LOS context row SHALL expose source references and rule
  references from the shared per-hex tactical projection
- **AND** the row SHALL identify itself as a line-of-sight rules surface
- **AND** LOS state, blocker hex, blocker kind, blocker terrain, blocker reason,
  target legality, attack-command behavior, and committed attack resolution
  SHALL remain unchanged
