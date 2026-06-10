# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Rules-Backed Hex Projection Contract

The tactical map interface SHALL compose terrain, elevation, movement, combat,
path, selected, and hover state into a single per-hex projection before
rendering hex cells or hover explanations. Hex explanations and visible
non-color-only markers SHALL distinguish rules-backed combat projection from
legacy range-envelope fallback data.

#### Scenario: Legacy range fallback does not use weapon-backed attack fill

**GIVEN** a projected hex is highlighted only by legacy raw `attackRange`
fallback data
**WHEN** the map renders the shared tactical hex projection
**THEN** the hex SHALL keep neutral top-level status
**AND** it SHALL keep `range-only` combat status
**AND** it SHALL expose legacy attack-range source metadata
**AND** its primary overlay SHALL NOT use the weapon-backed attack-range fill
**AND** its primary overlay SHALL identify the overlay kind as legacy range
**AND** it SHALL render a non-color-only range-envelope marker that does not
claim weapon-backed attack legality

#### Scenario: Weapon-backed attackable combat keeps attack fill

**GIVEN** a projected hex is attackable through weapon-backed combat projection
**WHEN** the map renders that combat projection
**THEN** the hex MAY use the weapon-backed attack-range fill
**AND** it SHALL identify the overlay kind as combat attackable
