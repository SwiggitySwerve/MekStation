# tactical-map-interface Delta — fix-tactical-projection-agreement-gaps

## MODIFIED Requirements

### Requirement: Rules-Backed Movement Projection

Movement overlays SHALL be derived from shared movement projection data and
SHALL explain legal, blocked, and consequential movement outcomes before the
player commits them.

#### Scenario: Encoded cliff movement appears in map projection

- **GIVEN** a selected represented unit previews movement across an encoded
  directional cliff edge
- **WHEN** the movement mode is WiGE, tracked, wheeled, or hover
- **THEN** the destination projection SHALL expose the same added cost or
  terrain-blocked reason that committed movement validation would apply
- **AND** ordinary elevation changes without cliff metadata SHALL continue to
  display as non-cliff movement.

#### Scenario: Turning charges appear in the movement overlay cost

- **GIVEN** a selected represented ground unit previews a destination whose
  derived path includes facing changes that committed movement validation
  charges as MP
- **WHEN** the movement overlay renders that destination's MP cost
- **THEN** the displayed MP cost SHALL include the turning charges
- **AND** the per-hex movement explanation SHALL list the turning contribution
  so the player can see why the destination costs more than its hex distance.

### Requirement: Weapon Command Preview Uses Combat Projection Impact

The tactical command preview SHALL use shared combat projection weapon impact metadata for projected weapon attack heat and ammo usage, and combat planning surfaces SHALL derive displayed range and range bracket values from the shared combat projection rather than independent distance computation.

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

#### Scenario: Combat planning range display traces to the combat projection

**GIVEN** the combat planning surface displays a range or range bracket for a
selected target
**WHEN** the displayed value is computed
**THEN** it SHALL be read from the combat projection's distance and range
bracket for that target hex
**AND** when the target hex is absent from the current projection lookup the
value SHALL be computed by the same exported helper the projection uses
**AND** no combat planning surface SHALL compute range or bracket from
independent inline distance math.
