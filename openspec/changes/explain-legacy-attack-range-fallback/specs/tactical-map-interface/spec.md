# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Rules-Backed Hex Projection Contract

The tactical map interface SHALL compose terrain, elevation, movement, combat,
path, selected, and hover state into a single per-hex projection before
rendering hex cells or hover explanations. Hex explanations SHALL distinguish
rules-backed combat projection from legacy range-envelope fallback data.

#### Scenario: Legacy attack range fallback explanation is explicit

**GIVEN** a projected hex is highlighted only by legacy raw `attackRange`
fallback data
**WHEN** the map builds the shared tactical hex projection
**THEN** the hex SHALL keep neutral top-level status
**AND** it SHALL keep `range-only` combat status
**AND** it SHALL expose legacy attack-range source metadata
**AND** its projection explanation SHALL state that the fallback is not
weapon-backed
