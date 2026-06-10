# Spec Delta: Tactical Map Interface

## ADDED Requirements

### Requirement: Combat Projection Explains Engine Rejections

The tactical map SHALL use shared engine-facing projection data to explain
attacker-side hull-down weapon restrictions before a player commits a weapon
attack.

#### Scenario: Hull-down leg-weapon block appears on weapon option

- **GIVEN** the selected attacker is hull-down
- **AND** the selected target is in range and arc
- **AND** one selected weapon is leg-mounted
- **WHEN** the player inspects the target hex or weapon option list
- **THEN** the leg-mounted weapon SHALL be shown as unavailable
- **AND** the blocked reason SHALL match the commit-path invalid reason.

### Requirement: Physical Attack Projection Explains Engine Rejections

The tactical map SHALL show hull-down kick restrictions in the physical attack
panel, command preview, and token action surfaces through the existing physical
attack option restriction data.

#### Scenario: Hull-down kick is disabled before command

- **GIVEN** the selected attacker is hull-down
- **AND** a valid adjacent target is selected
- **WHEN** physical attack actions are shown
- **THEN** kick commands SHALL be disabled
- **AND** the tooltip or preview reason SHALL identify hull-down as the block.
