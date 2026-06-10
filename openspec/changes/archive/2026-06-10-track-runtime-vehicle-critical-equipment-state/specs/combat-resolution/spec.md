# Spec Delta: Combat Resolution

## ADDED Requirements

### Requirement: Runtime Vehicle Critical Equipment State

Committed vehicle critical resolution SHALL use represented runtime target
equipment state from prior vehicle critical events when selecting later
availability-sensitive vehicle critical results.

#### Scenario: Prior weapon destruction reduces live weapon availability

- **GIVEN** a represented vehicle target has one known live weapon at the struck
  location
- **AND** a prior committed vehicle critical destroyed a weapon at that location
- **WHEN** a later vehicle critical roll reaches a weapon-jam or
  weapon-destroyed entry for the same location
- **THEN** committed vehicle critical resolution SHALL treat that live weapon as
  unavailable for weapon-jam and weapon-destroyed selection
- **AND** mounted weapon presence SHALL remain available for stabilizer
  selection at that location.

#### Scenario: Prior stabilizer hit falls through later stabilizer entries

- **GIVEN** a represented vehicle target has already resolved a stabilizer
  critical at a struck location
- **WHEN** a later vehicle critical roll reaches a stabilizer entry for that
  same location
- **THEN** committed vehicle critical resolution SHALL skip the stabilizer entry
  and continue through the struck-location fallthrough table.

#### Scenario: Unknown weapon counts remain optimistic

- **GIVEN** a represented vehicle target has location-level weapon availability
  but no represented count of live weapons at that location
- **WHEN** a prior vehicle weapon critical exists at the same location
- **THEN** committed vehicle critical resolution SHALL NOT infer that all live
  weapons at that location are unavailable.
