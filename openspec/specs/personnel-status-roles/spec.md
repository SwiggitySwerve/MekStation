# personnel-status-roles Specification

## Purpose

TBD - created by archiving change add-personnel-status-roles. Update Purpose after archive.

## Requirements

### Requirement: Personnel Status Enum Expansion

The system SHALL provide 37 personnel status values grouped into 5 categories: Active/Employed (6), Absent (3), Departed (9), Dead (14 causes), and Other (1).

#### Scenario: All 37 statuses are defined

- **GIVEN** the PersonnelStatus enum
- **WHEN** querying all status values
- **THEN** 37 distinct status values are available

#### Scenario: Backward compatibility with existing 10 statuses

- **GIVEN** existing code using ACTIVE, WOUNDED, KIA, MIA, RETIRED, ON_LEAVE, POW, AWOL, DESERTED, STUDENT
- **WHEN** the enum is expanded to 37 values
- **THEN** all existing 10 status values remain valid and unchanged

### Requirement: Status Behavioral Rules

The system SHALL provide helper functions to determine status-based behaviors: isAbsent(), isSalaryEligible(), isDead(), isDepartedUnit(), getNotificationSeverity().

#### Scenario: Absent statuses are identified

- **GIVEN** a person with status ON_LEAVE
- **WHEN** isAbsent(status) is called
- **THEN** true is returned

#### Scenario: Salary eligible statuses are identified

- **GIVEN** a person with status ACTIVE
- **WHEN** isSalaryEligible(status) is called
- **THEN** true is returned

#### Scenario: Death statuses are identified

- **GIVEN** a person with status KIA
- **WHEN** isDead(status) is called
- **THEN** true is returned

### Requirement: Status Transition Validation

The system SHALL validate status transitions and provide side effects for valid transitions (clear assignments, set dates, trigger events).

#### Scenario: Valid transition is allowed

- **GIVEN** a person with status ACTIVE
- **WHEN** transitioning to WOUNDED
- **THEN** isValidTransition returns true

#### Scenario: Invalid transition is prevented

- **GIVEN** a person with status KIA
- **WHEN** attempting to transition to ACTIVE
- **THEN** isValidTransition returns false

#### Scenario: Death transition sets dateOfDeath

- **GIVEN** a person with status ACTIVE
- **WHEN** transitioning to KIA
- **THEN** side effects include setDateOfDeath

### Requirement: Personnel Role Enum Expansion

The system SHALL provide 45 personnel role values across 3 categories: Combat (14), Support (11), and Civilian (~20).

#### Scenario: All 45 roles are defined

- **GIVEN** the CampaignPersonnelRole enum
- **WHEN** querying all role values
- **THEN** 45 distinct role values are available

#### Scenario: Backward compatibility with existing 10 roles

- **GIVEN** existing code using PILOT, AEROSPACE_PILOT, VEHICLE_DRIVER, TECH, DOCTOR, MEDIC, ADMIN, SUPPORT, SOLDIER, UNASSIGNED
- **WHEN** the enum is expanded to 45 values
- **THEN** all existing 10 role values remain valid and unchanged

### Requirement: Role Category Helpers

The system SHALL provide helper functions to determine role categories: isCombatRole(), isSupportRole(), isCivilianRole().

#### Scenario: Combat roles are identified

- **GIVEN** a person with role PILOT
- **WHEN** isCombatRole(role) is called
- **THEN** true is returned

#### Scenario: Support roles are identified

- **GIVEN** a person with role TECH
- **WHEN** isSupportRole(role) is called
- **THEN** true is returned

#### Scenario: Civilian roles are identified

- **GIVEN** a person with role ADMINISTRATOR
- **WHEN** isCivilianRole(role) is called
- **THEN** true is returned

### Requirement: Role Base Salary Mapping

The system SHALL provide base salary values for all 45 roles for financial system integration.

#### Scenario: Each role has base salary

- **GIVEN** any valid CampaignPersonnelRole
- **WHEN** getBaseSalary(role) is called
- **THEN** a numeric base salary value is returned

#### Scenario: Combat roles have higher base salaries

- **GIVEN** combat role PILOT and civilian role LABORER
- **WHEN** comparing base salaries
- **THEN** PILOT base salary is higher than LABORER base salary
