# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Combat Projection Explanation Details

The tactical map interface SHALL include rules-backed combat details in the
shared per-hex tactical projection explanation.

#### Scenario: Combat environment context rows expose rule-reference evidence

- **GIVEN** a combat projection includes weapon options blocked by represented
  environment rules
- **WHEN** the player hovers that combat hex and the environment context row is
  shown
- **THEN** the environment context row SHALL expose environment-specific source
  references and rule references from the shared per-hex tactical projection
- **AND** the row SHALL preserve blocked weapon ids and blocked environment
  reasons from `ICombatRangeHex.weaponRangeOptions`
- **AND** represented MekStation helper provenance SHALL be labeled as
  represented behavior and SHALL NOT imply a narrower MegaMek or official
  source pin before that source is explicitly linked
- **AND** underwater legality, torpedo path legality, target legality,
  attack-command behavior, and committed attack resolution SHALL remain
  unchanged
