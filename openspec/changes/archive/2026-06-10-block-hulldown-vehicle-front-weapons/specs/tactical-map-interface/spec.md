# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Combat Projection Explains Engine Rejections

The tactical map SHALL use shared engine-facing projection data to explain
vehicle attacker-side hull-down front-weapon restrictions before a player
commits a weapon attack.

#### Scenario: Hull-down vehicle front-weapon block appears on weapon option

- **GIVEN** the selected attacker is a represented hull-down vehicle
- **AND** the selected target is in range and arc
- **AND** one selected weapon is front-mounted and using direct fire
- **WHEN** the player inspects the target hex or weapon option list
- **THEN** the front-mounted weapon SHALL be shown as unavailable
- **AND** the blocked reason SHALL match the commit-path invalid reason.
