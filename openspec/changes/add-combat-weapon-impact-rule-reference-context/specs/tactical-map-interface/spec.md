# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Combat Projection Explanation Details

The tactical map interface SHALL include rules-backed combat details in the
shared per-hex tactical projection explanation.

#### Scenario: Combat weapon impact rows expose rule-reference evidence

- **GIVEN** a combat projection includes available weapon impact details for a
  target hex
- **WHEN** the player hovers that combat hex and per-weapon impact rows are
  shown
- **THEN** the weapon-impact row group SHALL expose the combat-channel source
  references and rule references from the shared per-hex tactical projection
- **AND** each individual weapon impact row SHALL expose the same
  combat-channel rule references
- **AND** weapon heat, damage, ammo consumption, ammo-remaining values,
  expected-damage display, target numbers, and attack-command behavior SHALL
  remain unchanged
