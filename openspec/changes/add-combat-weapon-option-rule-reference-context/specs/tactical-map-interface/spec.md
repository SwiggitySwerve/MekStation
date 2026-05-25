# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Combat Projection Explanation Details

The tactical map interface SHALL include rules-backed combat details in the
shared per-hex tactical projection explanation.

#### Scenario: Combat weapon option rows expose rule-reference evidence

- **GIVEN** a combat projection evaluates selected weapons against a target hex
- **WHEN** the player hovers that combat hex and per-weapon option rows are
  shown
- **THEN** the weapon-option row group SHALL expose the combat-channel source
  references and rule references from the shared per-hex tactical projection
- **AND** each individual weapon option row SHALL expose the same
  combat-channel rule references
- **AND** range, arc, environment, availability, blocked-reason, to-hit, and
  attack-command behavior SHALL remain unchanged
