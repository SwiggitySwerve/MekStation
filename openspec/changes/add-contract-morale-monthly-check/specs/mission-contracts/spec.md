## ADDED Requirements

### Requirement: Monthly Contract Enemy Morale Check

The system SHALL, on the 1st of each month, run the enemy-morale check for every ACTIVE contract when the AtB scenarios option is on, and SHALL write the resulting level to the contract's `moraleLevel` only when it changed. This ports MekHQ e7adc2c: the check runs on the 1st for every active contract (CampaignNewDayManager.java:1264-1271), inside the AtB new-day processing that runs only when StratCon is enabled (CampaignNewDayManager.java:475-477); MekStation's analogue of that gate is the AtB scenarios option. The roll SHALL be 2d6 drawn from the campaign's seeded random stream, with a separate stream per contract, and SHALL NOT use an unseeded random source. The check SHALL run after the day's battle outcomes are applied and the contract expiry pass, and before scenario generation. Contracts without an AtB contract type SHALL be checked. Reaching ROUTED SHALL set only the level.

#### Scenario: The check runs only on the 1st

- **GIVEN** an ACTIVE contract and the AtB scenarios option on
- **WHEN** the day pipeline processes any day that is not the 1st
- **THEN** the contract SHALL be unchanged
- **AND WHEN** it processes the 1st the level SHALL change exactly as the pinned rules give for that day's roll

#### Scenario: The level changes by the pinned table

- **GIVEN** a roll of 6 or less, 7, or 8 or more after modifiers
- **WHEN** the check is evaluated
- **THEN** the level SHALL rise one step, hold, or fall one step, with no field written when it holds

#### Scenario: This contract's battles in the previous month move the roll

- **GIVEN** battles applied to the contract in the previous calendar month
- **WHEN** the check is evaluated
- **THEN** a victory SHALL push the roll toward the enemy wavering and a defeat toward rallying, a draw SHALL not move it, and another contract's battle SHALL not count
- **AND** a battle applied before the window SHALL not count, and one applied on the day of the check SHALL count

#### Scenario: Only eligible contracts are checked

- **GIVEN** a campaign with the AtB scenarios option off, or a contract that is PENDING, settled or past its end date
- **WHEN** the 1st is processed
- **THEN** no level SHALL change

#### Scenario: Each contract has its own stream and a replay repeats

- **GIVEN** two ACTIVE contracts and a saved state
- **WHEN** the same day is processed twice from that state
- **THEN** each contract SHALL get the same roll both times, independent of the other contract and of contract order

#### Scenario: ROUTED sets only the level

- **GIVEN** a contract that wavers to ROUTED
- **WHEN** the check completes
- **THEN** its status, end date, payment terms and the campaign's transactions SHALL be unchanged

#### Scenario: The new level is the one scenario generation sees that day

- **GIVEN** a contract that becomes ROUTED on the 1st
- **WHEN** scenario generation runs the same day
- **THEN** it SHALL generate no scenario for that contract
- **AND** a contract that becomes OVERWHELMING SHALL generate the same scenario as one at STALEMATE would for the same rolls
