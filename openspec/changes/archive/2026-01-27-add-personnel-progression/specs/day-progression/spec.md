## ADDED Requirements

### Requirement: Vocational Training Processing
The system SHALL include a vocational training processor that runs monthly to award XP based on 2d6 rolls.

#### Scenario: Vocational check runs monthly
- **GIVEN** a person with vocationalXPTimer at 30 days
- **WHEN** the vocational processor runs
- **THEN** a 2d6 roll is made against vocationalXPTargetNumber (default 7)
- **AND** on success, vocationalXP (default 1) is awarded
- **AND** the timer resets to 0

#### Scenario: Failed roll resets timer
- **GIVEN** a person rolls below the target number
- **WHEN** processing vocational training
- **THEN** no XP is awarded
- **AND** the timer still resets to 0

#### Scenario: Timer increments daily
- **GIVEN** a person with vocationalXPTimer at 15
- **WHEN** a day advances
- **THEN** the timer increments to 16

### Requirement: Aging Day Processing
The system SHALL include an aging processor that applies milestone effects on birthdays.

#### Scenario: Aging processor runs on birthday
- **GIVEN** a person's birthday is today
- **WHEN** the aging processor runs
- **THEN** the person's age is calculated
- **AND** if crossing a milestone boundary, attribute modifiers are applied
- **AND** aging events are emitted

#### Scenario: Non-birthday skips processing
- **GIVEN** today is not a person's birthday
- **WHEN** the aging processor runs
- **THEN** no modifiers are applied
- **AND** no events are emitted
