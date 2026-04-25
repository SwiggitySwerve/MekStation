## ADDED Requirements

### Requirement: TSM Walk-MP Combined With Heat Penalty

The system SHALL preserve canonical Total Warfare walk-MP arithmetic when Triple Strength Myomer (TSM) is active and the unit is at or above heat 9. The TSM bonus (+2 walk MP) and the heat-based movement penalty (−1 walk MP at heat 5+, −2 at heat 7+, etc.) SHALL be combined additively against the unit's base walk MP.

This requirement closes the verifier PARTIAL on archived `wire-heat-generation-and-effects` task 7.2.

#### Scenario: TSM-active mech at heat 9 walks base + 2 − heat penalty

- **WHEN** a BattleMech with TSM equipment installed has current heat = 9 (TSM activation threshold)
- **AND** the mech's base walk MP is 4
- **THEN** `getEffectiveWalkMP(unit)` returns `4 + 2 (TSM bonus) − 1 (heat 5+ penalty) = 5`
- **AND** the run MP derived from walk MP reflects the same composition

#### Scenario: TSM-active mech at heat 0 receives only TSM bonus

- **WHEN** a BattleMech with TSM equipment installed has current heat = 0 (TSM dormant)
- **THEN** `getEffectiveWalkMP(unit)` returns base walk MP unchanged (TSM bonus does not apply below heat 9)

#### Scenario: Non-TSM mech at heat 9 receives only heat penalty

- **WHEN** a BattleMech without TSM has current heat = 9
- **AND** base walk MP is 4
- **THEN** `getEffectiveWalkMP(unit)` returns `4 − 2 (heat 7+ penalty) = 2`
