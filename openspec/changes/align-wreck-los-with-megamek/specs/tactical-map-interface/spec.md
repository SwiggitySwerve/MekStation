# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Debris Cloud And Wreck Sprite

On unit destruction, the tactical map interface SHALL play a debris
cloud burst and transition the token to a wreck sprite variant.

#### Scenario: Wreck markers do not block LOS

- **GIVEN** a destroyed unit marker occupies an intervening hex between an attacker and target
- **WHEN** the tactical map derives combat projection and LOS highlights
- **THEN** the destroyed marker SHALL NOT create a LOS blocker reference, LOS blocker badge, or LOS hover context
- **AND** the target hex SHALL remain direct-fire attackable when terrain, elevation, range, and arc rules otherwise allow it
- **AND** committed attack validation SHALL use the same non-blocking LOS result as the preview
