# tactical-map-interface Specification Delta

## MODIFIED Requirements

### Requirement: Attack Effects Layer

The tactical map interface SHALL include an attack effects layer that
renders above the unit token layer and subscribes to
`AttackResolved` events.

#### Scenario: Effects layer renders above tokens

- **GIVEN** an attack animation plays
- **WHEN** the effect primitive renders
- **THEN** it SHALL render above unit tokens so beams are not
  occluded
- **AND** it SHALL render beneath modal overlays (HUD, minimap,
  action panel)

#### Scenario: Effects coordinate with damage feedback

- **GIVEN** an attack resolves as a hit causing 5 damage
- **WHEN** the primary effect plays
- **THEN** the impact flash SHALL fire at the tail of the effect
- **AND** damage-pip decay animations SHALL begin synchronized with
  the impact flash
