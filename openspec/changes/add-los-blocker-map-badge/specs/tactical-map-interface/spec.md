# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Combat Projection Explanation Details

The tactical map interface SHALL expose rules-backed combat projection details for range, target legality, LOS, firing arc, visibility, cover, and weapon availability without recalculating combat legality in the renderer.

#### Scenario: LOS blocker hex is visibly marked

- **GIVEN** a combat projection reports blocked or partial LOS for a target hex
- **AND** the LOS classifier identifies the intervening hex responsible for the block or modifier
- **WHEN** the tactical map renders the battlefield
- **THEN** the map SHALL mark the intervening blocker hex with a compact LOS blocker badge
- **AND** the badge SHALL visibly distinguish blocked LOS from partial-cover LOS
- **AND** the badge SHALL expose the affected target hex, target unit ids, LOS state, blocker kind, blocker terrain metadata when known, and player-facing reason from the combat projection
- **AND** the renderer SHALL NOT recalculate LOS, cover, weapon legality, or attack legality
