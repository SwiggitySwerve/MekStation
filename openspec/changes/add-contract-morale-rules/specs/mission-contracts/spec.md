## ADDED Requirements

### Requirement: Contract Enemy Morale Check Rules

The system SHALL provide the contract (enemy) morale check as pure functions
that port MekHQ `e7adc2c` `MHQMorale`: the level table, the reliability
modifier, the recent-performance modifier and the modified-roll comparison.
The level is the ENEMY's morale on the contract, so a higher level is a
stronger enemy. The functions SHALL take the roll, the date, the scenarios,
the reliability inputs and the campaign modifiers as arguments and SHALL NOT
read a clock, a random source or any store.

#### Scenario: A low roll rallies the enemy and a high roll wavers it

- **GIVEN** a contract at any morale level
- **WHEN** the modified roll is 6 or lower
- **THEN** the level SHALL rise one step (Overwhelming stays Overwhelming)
- **AND WHEN** the modified roll is 8 or higher the level SHALL fall one step (Routed stays Routed, and Critical falls to Routed)
- **AND WHEN** the modified roll is 7 the level SHALL hold

#### Scenario: The modified roll adds reliability and recent performance

- **GIVEN** a 2d6 roll, a reliability modifier and a set of contract scenarios
- **WHEN** the check is evaluated
- **THEN** the modified roll SHALL be the roll plus the reliability modifier plus the performance modifier
- **AND** the performance modifier SHALL count only scenarios dated on or after one calendar month before the check date, with the day clamped to the length of that month
- **AND** a scenario with no date SHALL be ignored

#### Scenario: Victories are counted against defeats

- **GIVEN** the scenarios in the window
- **WHEN** the performance modifier is computed
- **THEN** a decisive victory SHALL count as two victories, a decisive defeat or a refused engagement as two defeats, a Pyrrhic victory as one of each, and fleet-in-being as one defeat
- **AND** the larger side SHALL give its decisive modifier when it has at least twice the other side and its plain modifier otherwise
- **AND** a tie SHALL give zero
- **AND** the default modifiers SHALL be decisive victory +2, victory +1, defeat -2, decisive defeat -3

#### Scenario: Reliability follows the enemy's skill and faction

- **GIVEN** an enemy skill level and faction traits
- **WHEN** reliability is computed
- **THEN** a Green or worse enemy SHALL give +1 and an Elite or better enemy -1
- **AND** a Clan enemy SHALL count one skill level higher (capped at Legendary) and then take a further -1
- **AND** a rebel, minor-power, mercenary or pirate enemy SHALL take +1 instead of the Clan penalty

#### Scenario: The rules do not start a morale check

- **GIVEN** this requirement alone
- **WHEN** the day pipeline runs
- **THEN** no contract's morale level SHALL change, because scheduling the monthly check is not part of this requirement
