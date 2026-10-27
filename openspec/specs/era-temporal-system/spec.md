# era-temporal-system Specification

## Purpose

Defines Era Temporal System requirements for Canonical Era Definitions, Temporal Availability Tracking, and Era Determination, preserving the source-of-truth scope introduced by archived change implement-phase1-foundation.
## Requirements
### Requirement: Canonical Era Definitions

The system SHALL define all 8 canonical BattleTech eras with year boundaries.

#### Scenario: Era enumeration

- **WHEN** defining historical eras
- **THEN** system SHALL include: AGE_OF_WAR, STAR_LEAGUE, EARLY_SUCCESSION_WARS, LATE_SUCCESSION_WARS, RENAISSANCE, CLAN_INVASION, CIVIL_WAR, JIHAD, DARK_AGE
- **AND** each era SHALL have start and end years

### Requirement: Temporal Availability Tracking

Components SHALL track introduction and extinction years for era filtering.

#### Scenario: Component availability

- **WHEN** a component has temporal properties
- **THEN** introductionYear MUST be provided
- **AND** extinctionYear MAY be provided
- **AND** extinctionYear MUST be >= introductionYear if present

### Requirement: Era Determination

The system SHALL determine era from year value.

#### Scenario: Year to era mapping

- **WHEN** given a year value
- **THEN** system SHALL return the correct Era
- **AND** boundary years SHALL be consistently handled

### Requirement: Equipment Availability Across Extinction

Equipment year filters SHALL use a shared availability predicate. An item SHALL be available in year Y only when introductionYear <= Y and Y is outside the interval extinctionYear <= Y < reintroductionYear. An absent reintroduction year SHALL mean indefinite extinction. An absent extinction year SHALL mean continued availability after introduction. Invalid non-finite query or introduction years SHALL be unavailable.

#### Scenario: Extinction boundaries

- **WHEN** an item was introduced in 2751, extinct in 2860, and reintroduced in 3037
- **THEN** it is available in 2751 and 2859, unavailable in 2860 and 3028, and available again in 3037

#### Scenario: Catalog conversion

- **WHEN** source equipment provides extinction and reintroduction years
- **THEN** conversion and aggregation preserve those years for browser and service filters
- **AND** missing source dates are not inferred from a weapon name

#### Scenario: Era overlap after reintroduction

- **WHEN** an item is reintroduced during an era
- **THEN** it is available in that era even if extinct at the era's start

