# Spec Delta: Combat Resolution

## ADDED Requirements

### Requirement: Vehicle Critical Target Equipment Availability

Committed vehicle critical resolution SHALL use represented target vehicle
equipment availability when selecting availability-sensitive critical effects.
When target equipment availability is unknown, the resolver SHALL preserve the
existing optimistic table behavior rather than inventing absence.

#### Scenario: Adapted vehicle weapons seed critical availability

- **GIVEN** a represented vehicle enters a session with adapted weapons carrying
  vehicle mount locations
- **WHEN** the session unit bindings are created
- **THEN** the vehicle unit SHALL carry critical availability metadata listing
  the locations with represented weapon mounts
- **AND** the metadata SHALL separately list represented locations with live
  weapons available for weapon-jam and weapon-destroyed critical entries.

#### Scenario: Missing target weapon location falls through weapon criticals

- **GIVEN** a represented vehicle is critically hit in the front
- **AND** target availability metadata proves there is no mounted weapon at the
  front location
- **WHEN** the vehicle critical roll total selects a front weapon critical
- **THEN** the resolver SHALL skip weapon-jam, weapon-destroyed, and stabilizer
  outcomes that require a weapon at that location
- **AND** the committed event stream SHALL emit the next available critical
  effect selected by the struck-location fallthrough table.

#### Scenario: Explicit cargo absence falls through cargo criticals

- **GIVEN** a represented vehicle is critically hit in a location whose table can
  select `cargo_hit`
- **AND** target availability metadata explicitly says no cargo is loaded
- **WHEN** the vehicle critical roll total selects `cargo_hit`
- **THEN** the resolver SHALL skip `cargo_hit`
- **AND** the resolver SHALL continue through the same struck-location
  fallthrough table.

#### Scenario: Unknown equipment state remains optimistic

- **GIVEN** a represented vehicle has no target equipment availability metadata
- **WHEN** a vehicle critical entry depends on weapon, cargo, or stabilizer
  availability
- **THEN** the resolver SHALL preserve legacy optimistic behavior for that entry.
