## ADDED Requirements

### Requirement: Weight Property Standard

All weight values SHALL use "weight" property name and be in tons.

#### Scenario: Weight property naming

- **WHEN** defining a component with mass
- **THEN** property name MUST be "weight"
- **AND** value MUST be in tons
- **AND** value MUST be >= 0 and finite

### Requirement: Critical Slots Property Standard

All critical slot values SHALL use "criticalSlots" property name.

#### Scenario: Critical slots property naming

- **WHEN** defining a component requiring critical slots
- **THEN** property name MUST be "criticalSlots"
- **AND** value MUST be an integer >= 0

### Requirement: Weight Rounding

Weight calculations SHALL round to nearest 0.5 ton.

#### Scenario: Weight rounding

- **WHEN** calculating component weight
- **THEN** result SHALL be rounded to nearest 0.5 ton
- **AND** rounding rules SHALL be consistent across all components
