# personnel-management Specification Delta

## MODIFIED Requirements

### Requirement: Personnel Status Management

The system SHALL track personnel status with 37 status values grouped into Active/Employed (6), Absent (3), Departed (9), Dead (14 causes), and Other (1), with behavioral rules for salary eligibility, absence tracking, and death handling.

#### Scenario: Active personnel are available for duty

- **GIVEN** a person with status ACTIVE
- **WHEN** isActive helper is called
- **THEN** true is returned

#### Scenario: Absent statuses are tracked

- **GIVEN** a person with status ON_LEAVE
- **WHEN** isAbsent helper is called
- **THEN** true is returned

#### Scenario: Salary eligibility is determined by status

- **GIVEN** a person with status ACTIVE
- **WHEN** isSalaryEligible helper is called
- **THEN** true is returned

#### Scenario: Death statuses are identified

- **GIVEN** a person with status KIA
- **WHEN** isDead helper is called
- **THEN** true is returned

### Requirement: Personnel Roles

The system SHALL support 45 campaign personnel roles across 3 categories: Combat (14), Support (11), and Civilian (~20), with role category helpers and base salary mapping.

#### Scenario: Person has primary role

- **GIVEN** a person is created with primaryRole PILOT
- **WHEN** the person is inspected
- **THEN** primaryRole is PILOT

#### Scenario: Combat roles are identified

- **GIVEN** a person with primaryRole PILOT
- **WHEN** isCombatRole helper is called
- **THEN** true is returned

#### Scenario: Role has base salary

- **GIVEN** a person with primaryRole PILOT
- **WHEN** getBaseSalary helper is called
- **THEN** the base salary for PILOT role is returned
