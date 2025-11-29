## ADDED Requirements

### Requirement: Unit Tech Base Declaration
Units SHALL declare their technology base.

#### Scenario: Tech base types
- **WHEN** declaring unit tech base
- **THEN** unit MAY be INNER_SPHERE
- **OR** unit MAY be CLAN
- **OR** unit MAY be MIXED

### Requirement: Structural Component Validation
Structural components SHALL match unit tech base unless mixed.

#### Scenario: Pure tech base
- **WHEN** unit is not MIXED
- **THEN** all structural components MUST match unit tech base
- **AND** equipment MAY have different tech base

### Requirement: Mixed Tech Toggle
Mixed tech mode SHALL enable cross-tech-base components.

#### Scenario: Mixed tech enabled
- **WHEN** unit is MIXED tech base
- **THEN** both IS and Clan structural components allowed
- **AND** tech rating SHALL reflect highest complexity

