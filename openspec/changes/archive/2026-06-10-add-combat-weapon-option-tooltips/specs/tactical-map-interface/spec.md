# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Combat Projection Explanation Details

The tactical map interface SHALL include rules-backed combat details in the
shared per-hex tactical projection explanation.

#### Scenario: Hover tooltip summarizes per-weapon combat options

- **GIVEN** a combat projection includes per-weapon range option rows
- **WHEN** the player hovers a combat hex or a combined movement/combat hex
- **THEN** the hover tooltip SHALL show each weapon's range band, arc state,
  environment state when blocked, availability state, and blocked reason when
  blocked
- **AND** the tooltip SHALL read those values from
  `ICombatRangeHex.weaponRangeOptions` rather than recalculating weapon legality
