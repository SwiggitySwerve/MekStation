## ADDED Requirements

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
