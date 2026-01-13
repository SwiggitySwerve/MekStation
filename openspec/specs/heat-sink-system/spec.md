# heat-sink-system Specification

## Purpose
TBD - created by archiving change implement-phase2-construction. Update Purpose after archive.
## Requirements
### Requirement: Heat Sink Types
The system SHALL support 5 heat sink types.

#### Scenario: Single heat sinks
- **WHEN** using single heat sinks
- **THEN** each sink dissipates 1 heat per turn
- **AND** external sinks require 1 critical slot each

#### Scenario: Double heat sinks
- **WHEN** using double heat sinks
- **THEN** each sink dissipates 2 heat per turn
- **AND** IS double sinks require 3 slots external
- **AND** Clan double sinks require 2 slots external

### Requirement: Engine Integration
Heat sinks up to engine capacity SHALL be integral.

#### Scenario: Integral heat sinks
- **WHEN** engine has integral capacity
- **THEN** integral heat sinks require 0 slots
- **AND** integral heat sinks add 0 weight
- **AND** capacity = floor(engineRating / 25) with no maximum cap

#### Scenario: High-rating engine integral capacity
- **WHEN** engine rating is 400
- **THEN** integral capacity SHALL be 16 (400 / 25)
- **AND** 16 heat sinks can be integrated without slots

#### Scenario: Mid-rating engine integral capacity
- **WHEN** engine rating is 300
- **THEN** integral capacity SHALL be 12 (300 / 25)
- **AND** 12 heat sinks can be integrated without slots

### Requirement: Minimum Heat Sinks
All mechs SHALL have at least 10 heat sinks.

#### Scenario: Minimum requirement
- **WHEN** validating heat sink count
- **THEN** total MUST be >= 10
- **AND** shortfall SHALL be calculated as external sinks needed

### Requirement: External Heat Sink Equipment
Heat sinks exceeding engine integral capacity SHALL appear as equipment items.

#### Scenario: External heat sinks in loadout
- **WHEN** total heat sinks exceed integral capacity
- **THEN** external heat sinks SHALL appear in equipment loadout tray
- **AND** each external heat sink SHALL be a separate equipment item
- **AND** items SHALL show in "Unallocated" section until placed

#### Scenario: External heat sink slot requirements
- **WHEN** external heat sinks exist
- **THEN** Single heat sinks SHALL require 1 slot each
- **AND** IS Double heat sinks SHALL require 3 slots each
- **AND** Clan Double heat sinks SHALL require 2 slots each

#### Scenario: Heat sink equipment synchronization
- **WHEN** heat sink count or type changes via Structure tab
- **THEN** equipment array SHALL be updated automatically
- **AND** old heat sink equipment items SHALL be removed
- **AND** new heat sink equipment items SHALL be added for external count

#### Scenario: Heat sink equipment non-removable
- **WHEN** external heat sink equipment is displayed in loadout tray
- **THEN** items SHALL have `isRemovable: false`
- **AND** items SHALL NOT show remove button
- **AND** heat sink management SHALL occur via Structure tab only

### Requirement: OmniMech Base Chassis Heat Sinks
OmniMechs SHALL track base chassis heat sinks separately from total heat sinks.

#### Scenario: Base chassis heat sink count
- **GIVEN** an OmniMech unit
- **WHEN** `baseChassisHeatSinks` is set to a positive value
- **THEN** that number of heat sinks SHALL be considered fixed to the chassis
- **AND** fixed heat sinks SHALL NOT count against pod space

#### Scenario: Auto-calculate mode
- **GIVEN** an OmniMech with `baseChassisHeatSinks: -1`
- **THEN** the system SHALL auto-calculate base chassis heat sinks
- **AND** typically this equals engine integral capacity

#### Scenario: Base chassis heat sinks validation
- **GIVEN** an OmniMech with `baseChassisHeatSinks` greater than total heat sinks
- **WHEN** validating configuration
- **THEN** validation error SHALL be raised
- **AND** message SHALL indicate base cannot exceed total

#### Scenario: Base chassis heat sinks UI
- **GIVEN** an OmniMech on the Structure tab
- **THEN** "Base Chassis Heat Sinks" spinner SHALL be displayed
- **AND** minimum value SHALL be -1 (auto)
- **AND** maximum value SHALL be total heat sink count

