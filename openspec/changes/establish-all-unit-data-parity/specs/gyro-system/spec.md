## MODIFIED Requirements

### Requirement: Gyro Weight Calculation

The system SHALL calculate gyro weight from engine rating.

#### Scenario: Gyro weight formula

- **WHEN** calculating gyro weight
- **THEN** base weight = ceil(engineRating / 100)
- **AND** multiplier applied based on gyro type

#### Scenario: Superheavy gyro doubles the base weight

- **GIVEN** a BattleMech with a Superheavy gyro and engine rating 300
- **WHEN** calculating gyro weight
- **THEN** the weight SHALL be 6 tons, the same doubling Heavy-Duty uses
- **AND** a Superheavy gyro at engine rating 400 SHALL weigh 8 tons
- **AND** Standard, XL, Compact and Heavy-Duty gyro weights SHALL be unchanged

The doubling is verified against MegaMek `48fcb2f64`, `megamek/src/megamek/common/verifier/TestMek.java` lines 249-264 (`GYRO_HEAVY_DUTY` and `GYRO_SUPERHEAVY` multiply by 2). It closes the `getWeightControls` difference on 11 superheavy BattleMechs in the CW1 census.
