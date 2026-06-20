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
