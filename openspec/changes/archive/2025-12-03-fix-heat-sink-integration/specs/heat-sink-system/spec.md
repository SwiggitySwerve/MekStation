# heat-sink-system Spec Delta

## MODIFIED Requirements

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

## ADDED Requirements

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
