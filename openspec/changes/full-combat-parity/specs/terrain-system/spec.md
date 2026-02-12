## ADDED Requirements

### Requirement: Wire Terrain To-Hit Modifiers into calculateToHit()

The existing terrain to-hit modifiers defined in the terrain-system spec SHALL be wired into the `calculateToHit()` function in the combat pipeline.

#### Scenario: Woods modifier applied in calculateToHit

- **WHEN** calculating to-hit for an attack where the target is in light woods
- **THEN** `calculateToHit()` SHALL include a +1 terrain modifier for light woods
- **AND** the modifier SHALL appear in the to-hit modifier breakdown

#### Scenario: Heavy woods modifier applied

- **WHEN** calculating to-hit for an attack where the target is in heavy woods
- **THEN** `calculateToHit()` SHALL include a +2 terrain modifier for heavy woods

#### Scenario: Partial cover modifier applied

- **WHEN** calculating to-hit for an attack where the target has partial cover
- **THEN** `calculateToHit()` SHALL include a +1 partial cover modifier
- **AND** partial cover SHALL also affect hit location (legs more likely)

### Requirement: Terrain Modifiers for Target-In-Terrain

The to-hit calculation SHALL apply modifiers based on the terrain the target occupies.

#### Scenario: Target in water depth 1

- **WHEN** a target is standing in water depth 1
- **THEN** the to-hit calculation SHALL include the water depth 1 modifier per the terrain properties table

#### Scenario: Target in building

- **WHEN** a target is standing in a building hex
- **THEN** the to-hit calculation SHALL include the building's to-hit-target-in modifier

### Requirement: Intervening Terrain Modifiers

The to-hit calculation SHALL apply cumulative modifiers for terrain hexes along the line of fire between attacker and target.

#### Scenario: Intervening light woods

- **WHEN** the line of fire passes through one light woods hex
- **THEN** `calculateToHit()` SHALL include a +1 intervening terrain modifier

#### Scenario: Multiple intervening terrain hexes

- **WHEN** the line of fire passes through two light woods hexes
- **THEN** `calculateToHit()` SHALL include a +2 intervening terrain modifier (cumulative)

#### Scenario: Intervening heavy woods

- **WHEN** the line of fire passes through a heavy woods hex
- **THEN** `calculateToHit()` SHALL include a +2 intervening terrain modifier per heavy woods hex

### Requirement: Water Partial Cover for Standing Units

Units standing in water depth 1 SHALL receive partial cover benefits.

#### Scenario: Water depth 1 partial cover

- **WHEN** a unit is standing in water depth 1
- **THEN** the unit SHALL be treated as having partial cover
- **AND** the to-hit calculation SHALL include the partial cover modifier
- **AND** hit location results targeting legs SHALL be more probable (shifted to lower body)

### Requirement: Terrain Modifier Integration Does Not Duplicate

The terrain modifier integration SHALL ensure modifiers are not applied twice (once by terrain system and once by to-hit system).

#### Scenario: No duplicate terrain modifiers

- **WHEN** calculating to-hit with terrain modifiers
- **THEN** each terrain effect SHALL be applied exactly once
- **AND** the modifier list SHALL clearly identify terrain-sourced modifiers
