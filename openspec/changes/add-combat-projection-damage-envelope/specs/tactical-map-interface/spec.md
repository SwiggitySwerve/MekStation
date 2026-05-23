## ADDED Requirements

### Requirement: Combat Projection Damage Envelope

The tactical map interface SHALL expose projected weapon damage envelope metadata from the shared combat projection for attackable weapon targets.

#### Scenario: Combat projection carries listed and expected damage

**GIVEN** a combat projection marks one or more weapons as available against an attackable target hex
**AND** the projection has a to-hit target number for that attack
**WHEN** the combat range hex is derived
**THEN** it SHALL include each available weapon's listed damage
**AND** it SHALL include aggregate listed damage for the available volley
**AND** it SHALL include expected damage computed from aggregate listed damage and the 2d6 hit probability for the projected to-hit number.

#### Scenario: Combat hover shows projected damage

**GIVEN** a combat projection contains available weapon damage metadata for a target hex
**WHEN** the player hovers that target hex
**THEN** the combat tooltip SHALL show projected listed damage
**AND** it SHALL show expected damage when the projection has a to-hit target number
**AND** it SHALL continue to show heat, ammo, range, LOS, arc, cover, visibility, to-hit, indirect-fire, and blocked-reason rows when present.

#### Scenario: Weapon command preview uses projection expected damage

**GIVEN** a weapon attack command preview receives combat projection data for an attackable target
**AND** the projection contains expected damage
**WHEN** the command preview is built
**THEN** preview expected damage SHALL equal the combat projection expected damage
**AND** blocked attack previews SHALL show zero expected damage.
