# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Combat Projection Damage Envelope

The tactical map interface SHALL expose projected weapon damage envelope metadata from the shared combat projection for attackable weapon targets.

#### Scenario: Attackable target shows compact impact badge

- **GIVEN** a combat projection marks a target hex attackable
- **AND** available weapon impacts include projected heat, listed damage, expected damage, and ammo use
- **WHEN** the target hex renders on the tactical map
- **THEN** the map SHALL show a compact combat impact badge for that target
- **AND** the badge SHALL visibly summarize projected heat, listed damage, expected damage when known, and ammo spent when nonzero
- **AND** the badge SHALL expose those same values as metadata from the combat projection
- **AND** the renderer SHALL NOT recalculate attack legality, weapon damage, heat, ammo, or expected damage
