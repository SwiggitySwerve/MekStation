# Spec Delta: Combat Resolution

## ADDED Requirements

### Requirement: Vehicle Critical Stabilizer Mount Presence

Committed vehicle critical resolution SHALL distinguish represented weapon mount
presence from represented live weapon availability when selecting Tank / VTOL
location-sensitive critical results.

#### Scenario: Unavailable mounted weapon still allows stabilizer critical

- **GIVEN** a represented vehicle target has a weapon mounted at the struck
  location
- **AND** the same target has no represented jammable or destroyable weapon
  available at that location
- **WHEN** the vehicle critical table falls through from a weapon entry to a
  stabilizer entry for that location
- **THEN** committed vehicle critical resolution SHALL keep the stabilizer
  result available
- **AND** the weapon-jam and weapon-destroyed entries SHALL remain unavailable.

#### Scenario: No mounted weapon skips stabilizer critical

- **GIVEN** target metadata proves the struck vehicle location has no mounted
  weapon
- **WHEN** the vehicle critical table reaches a stabilizer entry for that
  location
- **THEN** committed vehicle critical resolution SHALL skip the stabilizer result
  and continue fallthrough to the next eligible critical result.
