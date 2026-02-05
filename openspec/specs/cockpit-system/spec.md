# cockpit-system Specification

## Purpose

TBD - created by archiving change implement-phase2-construction. Update Purpose after archive.

## Requirements

### Requirement: Cockpit Types

The system SHALL support 5 cockpit types.

#### Scenario: Standard cockpit

- **WHEN** using standard cockpit
- **THEN** cockpit SHALL weigh 3 tons
- **AND** cockpit SHALL occupy head slots

#### Scenario: Small cockpit

- **WHEN** using small cockpit
- **THEN** cockpit SHALL weigh 2 tons
- **AND** piloting modifier SHALL be +1

### Requirement: Head Slot Layout

Head location SHALL have fixed layout for cockpit components.

#### Scenario: Head slots

- **WHEN** allocating head slots
- **THEN** life support SHALL occupy slot 1
- **AND** sensors SHALL occupy slot 2
- **AND** cockpit SHALL occupy slots 3-4
- **AND** sensors SHALL occupy slot 5
- **AND** life support SHALL occupy slot 6

### Requirement: Cockpit Compatibility

Certain cockpit-gyro combinations SHALL be restricted.

#### Scenario: Torso-mounted cockpit

- **WHEN** using torso-mounted cockpit
- **THEN** cockpit SHALL be incompatible with XL Gyro
