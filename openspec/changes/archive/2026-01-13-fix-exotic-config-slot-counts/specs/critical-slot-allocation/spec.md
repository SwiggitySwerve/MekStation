# critical-slot-allocation Spec Delta

## MODIFIED Requirements

### Requirement: Location Slot Counts
Each location SHALL have a fixed number of critical slots based on configuration type.

#### Scenario: Biped slot definitions
- **WHEN** defining location capacity for Biped mechs
- **THEN** Head = 6 slots
- **AND** Center Torso = 12 slots
- **AND** Side Torsos = 12 slots each
- **AND** Arms = 12 slots each
- **AND** Legs = 6 slots each
- **AND** Total = 78 slots

#### Scenario: Quad slot definitions
- **WHEN** defining location capacity for Quad mechs
- **THEN** Head = 6 slots
- **AND** Center Torso = 12 slots
- **AND** Side Torsos = 12 slots each
- **AND** Quad Legs (Front Left, Front Right, Rear Left, Rear Right) = 12 slots each
- **AND** Total = 90 slots
- **AND** Quad legs replace arms and have same slot capacity as arms

#### Scenario: Tripod slot definitions
- **WHEN** defining location capacity for Tripod mechs
- **THEN** Head = 6 slots
- **AND** Center Torso = 12 slots
- **AND** Side Torsos = 12 slots each
- **AND** Arms = 12 slots each
- **AND** Legs (Left, Right, Center) = 6 slots each
- **AND** Total = 84 slots

#### Scenario: QuadVee slot definitions
- **WHEN** defining location capacity for QuadVee mechs
- **THEN** Head = 6 slots
- **AND** Center Torso = 12 slots
- **AND** Side Torsos = 12 slots each
- **AND** Quad Legs (Front Left, Front Right, Rear Left, Rear Right) = 12 slots each
- **AND** Total = 90 slots
- **AND** Conversion equipment occupies 1 slot per leg

#### Scenario: LAM mech mode slot definitions
- **WHEN** defining location capacity for LAM mechs in Mech mode
- **THEN** slot definitions SHALL match Biped (78 total)
- **AND** Landing Gear occupies slots in Center Torso
- **AND** Avionics occupies slot in Head

## ADDED Requirements

### Requirement: Configuration Slot Count Constants
Slot counts SHALL be defined in a canonical source and imported by validation code.

#### Scenario: Canonical slot count source
- **WHEN** determining slot counts for validation
- **THEN** validation code SHALL import from `CriticalSlotAllocation.ts`
- **AND** validation code SHALL NOT hardcode slot counts
- **AND** slot counts SHALL be calculated dynamically per configuration type
