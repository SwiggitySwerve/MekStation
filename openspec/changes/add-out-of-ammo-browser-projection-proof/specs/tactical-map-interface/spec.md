# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Rules-Backed Hex Projection Contract

The tactical map interface SHALL compose terrain, elevation, movement, combat,
path, selected, and hover state into a single per-hex projection before
rendering hex cells or hover explanations. Rendered map highlights and the
controls that reveal those highlights SHALL expose the projection context needed
to explain why a highlight exists.

#### Scenario: Dry selected weapons expose out-of-ammo combat rejection

**GIVEN** a selected unit has only ammo-fed selected weapons with no remaining ammunition
**AND** a visible enemy target is in the tactical map projection
**WHEN** the target hex is rendered
**THEN** the hex SHALL expose that it is not a valid combat target
**AND** the hex SHALL expose `OutOfAmmo` as the combat invalid reason
**AND** the hex SHALL expose the no-ammunition details used by attack resolution
**AND** the dry selected weapon SHALL remain visible as a blocked per-weapon
range option
**AND** the rendered combat invalid badge SHALL expose a non-color out-of-ammo label
**AND** the hover explanation SHALL state that no ammunition is available
