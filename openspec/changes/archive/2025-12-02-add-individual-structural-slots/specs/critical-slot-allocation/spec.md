## MODIFIED Requirements

### Requirement: Distributed Slot Components

Endo Steel, Ferro-Fibrous, and similar structure/armor types SHALL distribute slots freely as individual 1-slot items.

#### Scenario: Distributed slot placement

- **WHEN** allocating Endo Steel or Ferro-Fibrous slots
- **THEN** slots MAY be placed in ANY location including Head
- **AND** slots MAY be split across multiple locations
- **AND** placement in Head SHOULD be avoided (pilot death risk on crit)

#### Scenario: Individual slot tracking

- **WHEN** Endo Steel or Ferro-Fibrous is selected
- **THEN** each required slot SHALL be a separate equipment item
- **AND** each item SHALL have unique `instanceId`
- **AND** unassigned items SHALL have `location: undefined`
- **AND** assigned items SHALL have `location` set to target location

#### Scenario: Stealth armor fixed placement

- **WHEN** Stealth armor is selected
- **THEN** 2-slot components SHALL be pre-assigned to LA, RA, LT, RT, LL, RL
- **AND** components SHALL NOT be movable to other locations
- **AND** each location SHALL receive exactly one 2-slot component
