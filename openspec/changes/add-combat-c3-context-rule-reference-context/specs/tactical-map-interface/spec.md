# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Combat Projection Explanation Details

The tactical map interface SHALL include rules-backed combat details in the
shared per-hex tactical projection explanation.

#### Scenario: Combat C3 context rows expose rule-reference evidence

- **GIVEN** a combat projection includes a C3 range benefit for a target hex
- **WHEN** the player hovers that combat hex and the C3 context row is shown
- **THEN** the C3 context row SHALL expose combat-channel source references and
  rule references from the shared per-hex tactical projection
- **AND** the row SHALL preserve its C3 spotter, spotter range, and effective
  range metadata
- **AND** C3 network membership, spotter choice, effective range, target number,
  modifier values, attack-command behavior, and committed attack resolution
  SHALL remain unchanged
