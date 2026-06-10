## ADDED Requirements

### Requirement: Combat Projection Damage Envelope

The tactical map interface SHALL expose projected weapon damage envelope metadata from the shared combat projection for attackable weapon targets.

#### Scenario: Combat projection carries listed and expected damage

**GIVEN** a combat projection marks one or more weapons as available against an attackable target hex
**AND** the projection has a to-hit target number for that attack
**WHEN** the combat range hex is derived
**THEN** it SHALL include each available weapon's listed damage
**AND** it SHALL include aggregate listed damage for the available volley
**AND** it SHALL include per-weapon expected damage computed from that weapon's own target number and the 2d6 hit probability
**AND** it SHALL include aggregate expected damage as the sum of those per-weapon expected damage values.

#### Scenario: Mixed target-number volley expected damage

**GIVEN** a selected volley has one weapon at medium range and another weapon at extreme range against the same target hex
**AND** both weapons are available to fire
**WHEN** the combat range hex is derived
**THEN** each weapon option SHALL carry its own target number and expected damage
**AND** the target hex expected damage SHALL NOT multiply aggregate listed damage by the best aggregate target number.

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
