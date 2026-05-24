# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Rules-Backed Hex Projection Contract

The tactical map interface SHALL compose terrain, elevation, movement, combat,
path, selected, and hover state into a single per-hex projection before
rendering hex cells or hover explanations.

#### Scenario: Legacy attack range fallback is not legal combat projection

**GIVEN** a projected hex is highlighted only by legacy raw `attackRange`
fallback data
**WHEN** the map builds the shared tactical hex projection
**THEN** the hex SHALL keep a combat status of `range-only`
**AND** the hex SHALL expose legacy attack-range source metadata
**AND** the hex SHALL NOT receive top-level `legal` status from the legacy
fallback alone
**AND** weapon-backed combat range projection SHALL remain eligible to mark an
empty in-range hex as legal range context
