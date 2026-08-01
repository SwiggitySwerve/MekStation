## ADDED Requirements

### Requirement: Tactical Turn Rail Force and Status Semantics

The accessibility system SHALL expose each tactical force roster as a named
region containing a named list, SHALL give every unit control a human-readable
name and persistent status text, and SHALL expose current semantics only for the
live active unit.

#### Scenario: Assistive technology distinguishes force ownership
- **GIVEN** allied and opposing units are present in the combat-mode tactical turn rail
- **WHEN** assistive technology traverses the rail
- **THEN** it SHALL encounter separately named Allied Force and Opposing Force regions and lists
- **AND** each unit control SHALL include the unit name and status in its accessible name

#### Scenario: Observer modes use stable force names
- **GIVEN** the tactical turn rail renders in GM, replay, or spectator mode
- **WHEN** assistive technology traverses the rail
- **THEN** it SHALL encounter separately named Player Force and Opponent Force regions and lists
- **AND** each unit control SHALL include the unit name and status in its accessible name

#### Scenario: Terminal state is not color-only
- **GIVEN** a unit is destroyed or withdrawn
- **WHEN** its rail control renders
- **THEN** visible and accessible text SHALL identify it as Eliminated or Withdrawn
- **AND** color SHALL NOT be the only status indicator

#### Scenario: Current semantics exclude terminal units
- **GIVEN** the projected active id references a destroyed or withdrawn unit
- **WHEN** the rail derives unit status
- **THEN** the terminal control SHALL NOT expose `aria-current`
- **AND** at most one non-terminal active unit SHALL expose `aria-current`
