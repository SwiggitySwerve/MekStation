## ADDED Requirements

### Requirement: Weapon Command Preview Uses Combat Projection Impact

The tactical command preview SHALL use shared combat projection weapon impact metadata for projected weapon attack heat and ammo usage.

#### Scenario: Attack preview heat and ammo come from combat projection

**GIVEN** a weapon attack command preview receives combat projection data for an attackable target
**AND** the projection contains available weapon impact metadata
**WHEN** the command preview is built
**THEN** preview heat SHALL equal the combat projection's available weapon heat
**AND** preview ammo usage SHALL be derived from the combat projection's available weapon impacts
**AND** preview weapon ids and names SHALL match the projected available weapon impacts.

#### Scenario: Blocked attack preview spends no heat or ammo

**GIVEN** a weapon attack command preview receives combat projection data for a blocked target
**WHEN** the command preview is built
**THEN** preview heat SHALL be zero
**AND** preview ammo usage SHALL be empty
**AND** the blocked reason SHALL remain the projection-derived attack invalid detail or blocked reason.

#### Scenario: Expected damage can still use weapon status data

**GIVEN** combat projection data provides weapon impact metadata
**AND** weapon status data is available for those projected weapons
**WHEN** the command preview is built
**THEN** expected damage MAY be computed from weapon status damage values until combat projection carries damage envelope metadata.
