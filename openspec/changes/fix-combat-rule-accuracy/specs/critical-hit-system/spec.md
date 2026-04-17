# critical-hit-system (delta)

## MODIFIED Requirements

### Requirement: Critical Hit Effects

Components SHALL have defined critical hit effects. The life-support component SHALL require 2 hits to destroy (`hitsToDestroy: 2`), not 1.

#### Scenario: Single life-support hit does not destroy

- **GIVEN** a BattleMech with intact life support
- **WHEN** life support takes 1 critical hit
- **THEN** the life support hit counter SHALL become 1
- **AND** life support SHALL NOT be marked destroyed
- **AND** environmental protection SHALL remain active

#### Scenario: Two life-support hits destroy

- **GIVEN** a BattleMech with life support hit counter = 1
- **WHEN** life support takes a second critical hit
- **THEN** the life support hit counter SHALL become 2
- **AND** life support SHALL be marked destroyed
- **AND** environmental damage SHALL begin applying to the pilot

#### Scenario: Weapon critical still destroys on first hit

- **GIVEN** an intact weapon component
- **WHEN** the weapon takes a critical hit
- **THEN** the weapon SHALL be destroyed on the first hit (unchanged, `hitsToDestroy: 1`)
