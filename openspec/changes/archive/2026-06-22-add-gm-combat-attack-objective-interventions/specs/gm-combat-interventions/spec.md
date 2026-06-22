## ADDED Requirements

### Requirement: Attack Resolution Corrections
The combat intervention implementer SHALL preview and apply approved GM corrections to tactical attack-resolution outcomes through additive intervention records and reducer-compatible projected effects.

#### Scenario: GM corrects attack result
- **GIVEN** the GM has authority over an active game
- **WHEN** the GM approves an attack-resolution correction for an attacker, target, weapon, roll, to-hit number, hit state, location, damage, and related event references
- **THEN** the derived combat state SHALL expose the approved attack-resolution correction without resetting the encounter
- **AND** replaying the projected effect from the intervention record SHALL reconstruct the same corrected attack-resolution state
- **AND** the player-visible log SHALL show only the approved net effect

#### Scenario: GM correction references unknown combat units
- **GIVEN** the GM has authority over an active game
- **WHEN** the GM previews an attack-resolution correction that references an unknown attacker or target unit
- **THEN** the preview SHALL be blocked with a clear conflict reason
- **AND** no attack-resolution correction SHALL be applied

### Requirement: Objective State Corrections
The combat intervention implementer SHALL preview and apply approved GM corrections to scenario objective marker state through additive intervention records and reducer-compatible projected effects.

#### Scenario: GM corrects existing objective marker
- **GIVEN** the GM has authority over an active objective-based game
- **WHEN** the GM approves an objective correction for control side, hold progress, hold requirement, or objective metadata
- **THEN** the derived combat state SHALL reflect the approved objective marker state without resetting the encounter
- **AND** replaying the projected effect from the intervention record SHALL reconstruct the same corrected objective state
- **AND** the player-visible log SHALL show only the resulting objective-state change

#### Scenario: GM adds missing objective marker
- **GIVEN** the GM has authority over an active objective-based game
- **WHEN** the GM approves an objective correction with a complete replacement marker for a missing objective hex
- **THEN** the derived combat state SHALL include the approved objective marker
- **AND** the correction SHALL remain traceable as a GM intervention

#### Scenario: GM objective correction cannot identify a marker
- **GIVEN** the GM has authority over an active game
- **WHEN** the GM previews an objective correction without an existing objective id, existing hex key, or complete replacement marker
- **THEN** the preview SHALL be blocked with a clear conflict reason
- **AND** no objective marker SHALL be changed
