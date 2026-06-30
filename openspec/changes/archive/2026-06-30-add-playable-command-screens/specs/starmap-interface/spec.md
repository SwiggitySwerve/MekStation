## ADDED Requirements

### Requirement: Starmap logistics preview
The starmap SHALL preview travel as a logistics command with route legs, jump distance legality, elapsed time, arrival date, travel costs, upkeep costs, and warnings before committing the destination change.

#### Scenario: Destination preview shows route consequences
- **WHEN** a player selects a destination system
- **THEN** the starmap SHALL show the current system, destination, legal route or illegal leg reason, expected arrival date, cost summary, deadline warnings, and affected campaign systems before enabling travel commit

#### Scenario: Illegal route is blocked before commit
- **WHEN** a selected destination cannot be reached under the configured jump rules
- **THEN** the travel command SHALL be disabled and SHALL show which route leg or missing logistics condition blocks travel

### Requirement: Starmap lenses support strategic choice
The starmap SHALL provide lenses or filters that help players compare destinations by travel range, faction or employer context, contract availability, market/supply quality, deadlines, and campaign risk.

#### Scenario: Player compares destination reasons
- **WHEN** the player toggles a strategic starmap lens
- **THEN** systems SHALL expose relevant labels or indicators without hiding the current route preview
