# tactical-map-interface Specification Delta

## ADDED Requirements

### Requirement: Unit Token Rendering Uses Sprite System

The tactical map interface SHALL render unit tokens via the sprite
system, replacing the abstract marker used in the Phase 1 MVP.

#### Scenario: Token uses MechSprite component

- **GIVEN** a unit is placed on the hex map
- **WHEN** the token renders
- **THEN** a `MechSprite` component SHALL render the silhouette
- **AND** an `ArmorPipRing` SHALL render the damage overlay
- **AND** the outer `<g>` element SHALL remain the click target for
  selection hit-testing

#### Scenario: Selection binding preserved

- **GIVEN** a user clicks a token
- **WHEN** the click fires
- **THEN** `useGameplayStore.setSelectedUnitId` SHALL be called with
  the clicked unit's ID exactly as before the sprite swap

#### Scenario: Side color preserved

- **GIVEN** the Phase 1 MVP applied a side-color tint
- **WHEN** the sprite renders
- **THEN** the same side color SHALL drive the sprite's tint
- **AND** existing accessibility overlays SHALL continue to apply
