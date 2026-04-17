# heat-management-system (delta)

## ADDED Requirements

### Requirement: Real Weapon Heat Accumulation

The heat-management system SHALL accumulate heat from fired weapons using each weapon's catalog `heat` value. The `weapons.length * 10` approximation SHALL be removed.

#### Scenario: Firing multiple weapons sums real heats

- **GIVEN** a unit that fires 1 PPC (heat 10) and 2 Medium Lasers (heat 3 each)
- **WHEN** the firing heat is computed
- **THEN** the firing heat SHALL be 10 + 3 + 3 = 16

#### Scenario: No firing produces no heat

- **GIVEN** a unit that fires no weapons this turn
- **WHEN** the firing heat is computed
- **THEN** the firing heat contribution SHALL be 0

#### Scenario: Legacy approximation removed

- **GIVEN** the heat generation code path
- **WHEN** the path is statically searched for `weapons.length * 10`
- **THEN** no occurrences SHALL remain in production code
