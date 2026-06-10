# Spec Delta: Tactical Map Interface

## ADDED Requirements

### Requirement: Isometric Terrain And Unit Visibility

The tactical map interface SHALL keep important units readable in isometric
mode through depth ordering, selected-unit foregrounding, terrain-occlusion
visibility halos, and target readability boosts. When weapon-backed combat
projection is active, valid-target foreground boosts SHALL be driven by shared
combat projection data instead of stale legacy token flags.

#### Scenario: Projection-active isometric target boost ignores stale token flag

**GIVEN** the map is in isometric mode
**AND** a selected friendly unit has configured weapon projection data
**AND** another token has a stale legacy `isValidTarget` flag
**WHEN** that token's unit id does not appear in the combat-projected valid
target ids
**THEN** the token SHALL NOT receive a valid-target foreground boost from the
legacy token flag
**AND** terrain-occlusion and selected-unit foreground boosts SHALL remain
unchanged

#### Scenario: Legacy target flag remains isometric fallback

**GIVEN** the map is in isometric mode
**AND** the selected unit does not have configured weapon projection data
**WHEN** a token has `IUnitToken.isValidTarget === true`
**THEN** the token SHALL continue to receive the legacy foreground readability
boost
