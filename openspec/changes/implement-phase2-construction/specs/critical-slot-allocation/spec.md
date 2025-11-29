## ADDED Requirements

### Requirement: Location Slot Counts
Each location SHALL have a fixed number of critical slots.

#### Scenario: Slot definitions
- **WHEN** defining location capacity
- **THEN** Head = 6 slots
- **AND** Center Torso = 12 slots
- **AND** Side Torsos = 12 slots each
- **AND** Arms = 12 slots each
- **AND** Legs = 6 slots each
- **AND** Total = 78 slots

### Requirement: Fixed Component Placement
Structural components SHALL be placed in fixed order.

#### Scenario: Placement order
- **WHEN** allocating fixed components
- **THEN** engine SHALL be placed first in CT
- **AND** gyro SHALL follow engine
- **AND** heat sinks SHALL follow gyro

### Requirement: Distributed Slot Components
Endo Steel, Ferro-Fibrous, and similar structure/armor types SHALL distribute slots freely.

#### Scenario: Distributed slot placement
- **WHEN** allocating Endo Steel or Ferro-Fibrous slots
- **THEN** slots MAY be placed in ANY location including Head
- **AND** slots MAY be split across multiple locations
- **AND** placement in Head SHOULD be avoided (pilot death risk on crit)

### Requirement: Actuator Requirements
Limbs SHALL have required actuator slots.

#### Scenario: Arm actuators
- **WHEN** arm has full actuators
- **THEN** shoulder = 1 slot
- **AND** upper arm = 1 slot
- **AND** lower arm = 1 slot (optional)
- **AND** hand = 1 slot (optional)

