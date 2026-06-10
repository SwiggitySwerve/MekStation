# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Combat Projection Explanation Details

The tactical map interface SHALL expose rules-backed combat projection details for range, target legality, LOS, firing arc, visibility, cover, and weapon availability without recalculating combat legality in the renderer.

#### Scenario: Fire volley command is gated by selected target projection

- **GIVEN** the tactical map has derived a combat projection for the selected attack target
- **AND** the projection says the target is blocked by range, arc, LOS, visibility, weapon readiness, or represented environment rules
- **WHEN** the player views the `Fire Volley` command in the dock or enemy token context menu
- **THEN** the command SHALL be disabled before confirmation or commit
- **AND** the disabled reason SHALL match the player-facing blocked detail from the combat projection
- **AND** the command surface SHALL consume the shared projection data rather than recalculating attack legality in the command renderer.
