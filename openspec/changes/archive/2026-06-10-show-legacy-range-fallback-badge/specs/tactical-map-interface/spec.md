# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Rules-Backed Hex Projection Contract

The tactical map interface SHALL compose terrain, elevation, movement, combat,
path, selected, and hover state into a single per-hex projection before
rendering hex cells or hover explanations. Hex explanations and visible
non-color-only markers SHALL distinguish rules-backed combat projection from
legacy range-envelope fallback data.

#### Scenario: Legacy range fallback has a visible non-color marker

**GIVEN** a projected hex is highlighted only by legacy raw `attackRange`
fallback data
**WHEN** the map renders the shared tactical hex projection
**THEN** the hex SHALL keep neutral top-level status
**AND** it SHALL keep `range-only` combat status
**AND** it SHALL expose legacy attack-range source metadata
**AND** it SHALL render a compact visible range-only badge that does not claim
weapon-backed attack legality
**AND** the badge metadata SHALL expose the same projection status,
combat-channel status, source metadata, and explanation as the hex projection
