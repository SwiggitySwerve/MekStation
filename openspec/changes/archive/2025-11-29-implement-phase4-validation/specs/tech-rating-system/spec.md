## ADDED Requirements

### Requirement: Tech Rating Enumeration

The system SHALL define technology availability ratings A through F.

#### Scenario: Tech rating levels

- **WHEN** classifying technology
- **THEN** ratings SHALL be A (common), B, C, D, E, F (extremely rare)
- **AND** each component SHALL have assigned tech rating

### Requirement: Unit Tech Rating

Unit overall tech rating SHALL be the highest component rating.

#### Scenario: Unit rating calculation

- **WHEN** calculating unit tech rating
- **THEN** examine all component tech ratings
- **AND** unit rating = highest (most restricted) component rating

### Requirement: Era Availability

Tech rating SHALL affect era availability.

#### Scenario: Era restrictions

- **WHEN** filtering by era
- **THEN** tech rating SHALL determine manufacturing availability
- **AND** higher ratings indicate rarer technology
