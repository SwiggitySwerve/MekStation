# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Combat Projection Explanation Details

The tactical map interface SHALL include rules-backed combat details in the
shared per-hex tactical projection explanation.

#### Scenario: Combat to-hit modifier rows expose rule-reference evidence

- **GIVEN** a combat projection includes an engine-style to-hit number and
  modifier stack
- **WHEN** the player hovers that combat hex and per-modifier to-hit rows are
  shown
- **THEN** the to-hit modifier row group SHALL expose the combat-channel source
  references and rule references from the shared per-hex tactical projection
- **AND** each individual modifier row SHALL expose the same combat-channel rule
  references
- **AND** modifier names, signed values, modifier sources, descriptions, target
  numbers, and attack-command behavior SHALL remain unchanged
