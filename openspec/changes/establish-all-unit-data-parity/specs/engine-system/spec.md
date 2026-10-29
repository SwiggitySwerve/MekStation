## MODIFIED Requirements

### Requirement: Engine Weight Calculation

The system SHALL derive fusion engine base weight from the standard engine table and the authoritative engine-type modifier, rounding upward to half-ton increments. Family-specific installation allowances and minima SHALL be applied by the applicable construction owner after this base calculation.

#### Scenario: Engine weight table lookup

- **WHEN** calculating fusion engine base weight
- **THEN** Standard weight SHALL use the engine-rating table
- **AND** XL SHALL use one half of Standard weight
- **AND** Light SHALL use three quarters of Standard weight
- **AND** XXL SHALL use one third of Standard weight without truncating the modifier to 0.33
- **AND** Compact SHALL use one and a half times Standard weight
- **AND** the modified base weight SHALL round upward to the next half ton

#### Scenario: Preserve XXL half-ton increments at large ratings

- **GIVEN** an engine table weight of 190 tons at rating 465
- **WHEN** calculating its XXL base weight
- **THEN** the weight SHALL be 63.5 tons, rather than the 63 tons produced by a 0.33 modifier
- **AND** rating 500 with standard table weight 462.5 tons SHALL produce 154.5 tons

The modifier and rounding sequence are verified against MegaMek `48fcb2f64a1b3f2d575707ce5653dad64927b587`, `megamek/src/megamek/common/equipment/Engine.java` lines 409-442. These table examples do not assert that every unit family may legally install those ratings.
