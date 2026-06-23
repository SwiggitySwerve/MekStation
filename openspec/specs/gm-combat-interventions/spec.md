# gm-combat-interventions Specification

## Purpose

Defines the first supported runtime GM intervention implementer for tactical combat corrections across position, damage, heat, ammo, turn order, and lifecycle state.
## Requirements
### Requirement: Tactical Combat Intervention Implementer

The system SHALL provide a combat-domain intervention implementer for the reusable intervention ledger. The implementer SHALL support first-slice GM corrections for reposition/facing, damage and criticals, heat/ammo, phase/initiative, turn ownership, and lifecycle state.

#### Scenario: Combat implementer registers with ledger
- **GIVEN** the GM intervention ledger initializes
- **WHEN** the combat intervention implementer is registered
- **THEN** commands targeting the combat domain SHALL route through the combat implementer
- **AND** commands targeting unregistered domains SHALL NOT route through the combat implementer

### Requirement: Combat State Corrections

The combat intervention implementer SHALL preview and apply approved corrections to derived combat state through additive intervention records and reducer-compatible projected effects.

#### Scenario: GM repositions unit
- **GIVEN** the GM has authority over an active game
- **WHEN** the GM approves a reposition intervention for a unit
- **THEN** the derived game state SHALL show the unit at the approved coordinate and facing
- **AND** the player-visible log SHALL show only the resulting position/facing change

#### Scenario: GM corrects damage and critical state
- **GIVEN** the GM has authority over an active game
- **WHEN** the GM approves a damage and critical correction
- **THEN** the derived game state SHALL reflect the approved armor, structure, and critical state
- **AND** the intervention SHALL remain traceable as a GM correction

#### Scenario: GM corrects heat and ammo
- **GIVEN** the GM has authority over an active game
- **WHEN** the GM approves a heat or ammo correction
- **THEN** the derived game state SHALL reflect the approved heat or ammunition values
- **AND** the player-visible net effect SHALL NOT reveal hidden GM reasoning

### Requirement: Turn and Lifecycle Corrections

The combat intervention implementer SHALL preview and apply approved corrections to phase, initiative, turn ownership, ejection, withdrawal, disabled, destroyed, and rescued states.

#### Scenario: GM corrects phase or initiative
- **GIVEN** the GM has authority over an active game
- **WHEN** the GM approves a phase, initiative, or turn ownership correction
- **THEN** the derived game state SHALL reflect the approved phase or initiative order
- **AND** normal player actions SHALL continue to be validated against the corrected state

#### Scenario: GM corrects lifecycle state
- **GIVEN** the GM has authority over an active game
- **WHEN** the GM approves an ejection, withdrawal, disabled, destroyed, or rescued-state correction
- **THEN** the derived game state SHALL reflect the approved lifecycle state
- **AND** player-facing logs SHALL show only the resulting state change

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

### Requirement: Incomplete Combat Correction Rejection
The combat intervention implementer SHALL reject incomplete or no-op correction payloads with clear conflict reasons before approval.

#### Scenario: Empty unit correction is blocked
- **WHEN** the GM previews a reposition/facing, damage/critical, or heat/ammo correction that identifies a unit but contains no fields to change
- **THEN** the preview SHALL be blocked with a reason naming the missing correction detail
- **AND** no combat projected effect SHALL be produced

#### Scenario: Empty turn-order correction is blocked
- **WHEN** the GM previews a turn-order correction without phase, initiative, activation, order, or active-unit data
- **THEN** the preview SHALL be blocked with a reason naming the missing turn-order detail
- **AND** no combat projected effect SHALL be produced
