# Pilot-Mech Card Specification

## ADDED Requirements

### Requirement: Combined Character Sheet

The system SHALL display pilot and mech data together as a character sheet.

#### Scenario: Complete assignment

- **GIVEN** a pilot assigned to a mech
- **WHEN** rendering pilot-mech card
- **THEN** pilot section SHALL display pilot identity, skills, abilities
- **AND** mech section SHALL display unit card
- **AND** effective stats section SHALL show calculated modifiers
- **AND** action bar SHALL provide quick actions

#### Scenario: Unassigned pilot

- **GIVEN** a pilot with no mech assignment
- **WHEN** rendering pilot-mech card
- **THEN** pilot section SHALL display normally
- **AND** mech section SHALL show "No mech assigned"
- **AND** "Assign Mech" action SHALL be available

#### Scenario: Unassigned mech

- **GIVEN** a mech with no pilot assignment
- **WHEN** rendering pilot-mech card
- **THEN** mech section SHALL display unit card
- **AND** pilot section SHALL show "No pilot assigned"
- **AND** "Assign Pilot" action SHALL be available

### Requirement: Pilot Section Display

The system SHALL display pilot information in the character sheet.

#### Scenario: Pilot identity

- **GIVEN** pilot section rendering
- **WHEN** displaying identity
- **THEN** callsign SHALL be prominently displayed
- **AND** full name SHALL be shown
- **AND** affiliation SHALL be shown
- **AND** rank/experience level (Green/Regular/Veteran/Elite) SHALL be indicated

#### Scenario: Pilot skills

- **GIVEN** pilot section rendering
- **WHEN** displaying skills
- **THEN** gunnery skill (1-8) SHALL be shown
- **AND** piloting skill (1-8) SHALL be shown
- **AND** skill level indicator (color/icon) SHALL indicate quality

#### Scenario: Pilot career

- **GIVEN** pilot section rendering
- **WHEN** displaying career stats
- **THEN** mission count SHALL be shown
- **AND** kill count SHALL be shown
- **AND** current XP SHALL be shown
- **AND** XP to next skill improvement MAY be shown

#### Scenario: Pilot abilities

- **GIVEN** pilot with special abilities
- **WHEN** displaying abilities
- **THEN** all abilities SHALL be listed
- **AND** ability effects SHALL be summarized
- **AND** clicking ability MAY show full description

#### Scenario: Pilot wounds

- **GIVEN** pilot section rendering
- **WHEN** displaying wounds
- **THEN** current wounds (0-6) SHALL be shown
- **AND** wound tracker visualization SHALL indicate severity
- **AND** skill penalties from wounds SHALL be indicated

### Requirement: Effective Stats Calculation

The system SHALL calculate effective combat stats from pilot and mech.

#### Scenario: Base to-hit calculation

- **GIVEN** pilot with gunnery skill G
- **WHEN** calculating effective to-hit
- **THEN** base to-hit SHALL equal G
- **AND** ability modifiers SHALL be applied
- **AND** wound penalties SHALL be applied

#### Scenario: Ability modifier application

- **GIVEN** pilot with Weapon Specialist (type X)
- **WHEN** calculating to-hit for weapon type X
- **THEN** to-hit for type X weapons SHALL be G - 1
- **AND** other weapon types SHALL remain at G

#### Scenario: Consciousness check calculation

- **GIVEN** pilot with piloting skill P and abilities
- **WHEN** calculating consciousness check target
- **THEN** base target SHALL be 3 + wounds
- **AND** Iron Will ability reduces target by 2
- **AND** result SHALL be displayed

#### Scenario: Special rules display

- **GIVEN** pilot with abilities affecting gameplay
- **WHEN** displaying effective stats
- **THEN** special rules from abilities SHALL be summarized
- **AND** rules affecting movement, combat, or survival noted

### Requirement: Mech Section Integration

The system SHALL embed unit card in the character sheet.

#### Scenario: Unit card embedding

- **GIVEN** pilot assigned to mech
- **WHEN** rendering mech section
- **THEN** UnitCardStandard SHALL be embedded
- **AND** card SHALL show full mech capabilities
- **AND** visual styling SHALL integrate with pilot section

#### Scenario: Mech change action

- **GIVEN** mech section rendered
- **WHEN** user clicks "Change Mech"
- **THEN** mech selector dialog SHALL open
- **AND** user can select different mech
- **AND** assignment SHALL update

### Requirement: Card Variants

The system SHALL provide different card variants for different contexts.

#### Scenario: Compact variant

- **GIVEN** compact variant requested
- **WHEN** rendering card
- **THEN** pilot name, callsign, skills shown
- **AND** mech name, tonnage, BV shown
- **AND** fits in list view row

#### Scenario: Standard variant

- **GIVEN** standard variant requested
- **WHEN** rendering card
- **THEN** full pilot section displayed
- **AND** full unit card embedded
- **AND** effective stats shown
- **AND** action bar included

#### Scenario: Gameplay variant

- **GIVEN** gameplay variant during active game
- **WHEN** rendering card
- **THEN** current damage state SHALL be reflected
- **AND** current heat level SHALL be shown
- **AND** current ammo counts SHALL be shown
- **AND** current wounds SHALL be shown

### Requirement: Quick Actions

The system SHALL provide context-appropriate actions.

#### Scenario: Export combined

- **GIVEN** pilot-mech card with Export action
- **WHEN** user clicks Export
- **THEN** bundle containing pilot AND mech SHALL be created
- **AND** assignment relationship preserved

#### Scenario: Share combined

- **GIVEN** pilot-mech card with Share action
- **WHEN** user clicks Share
- **THEN** share dialog SHALL open
- **AND** can share pilot only, mech only, or both

#### Scenario: Add to encounter

- **GIVEN** pilot-mech card in force context
- **WHEN** user clicks "Add to Encounter"
- **THEN** pilot-mech pair SHALL be added to encounter setup
- **AND** user navigates to encounter configuration
