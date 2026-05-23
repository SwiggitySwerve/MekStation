# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Combat Projection Explanation Details

The tactical map interface SHALL include rules-backed combat details in the shared per-hex tactical projection explanation.

#### Scenario: Combat tooltip lists to-hit modifiers

- **GIVEN** a combat projection includes an engine-style to-hit number and modifier stack
- **WHEN** the player hovers a combat hex
- **THEN** the combat tooltip SHALL list each to-hit modifier as its own row with name, signed value, and source metadata
- **AND** the tooltip SHALL expose stable metadata for modifier count, names, values, and sources
- **AND** the tooltip SHALL read modifier rows from `ICombatRangeHex.toHitModifiers` rather than recalculating the to-hit number

#### Scenario: Combined tactical tooltip lists combat to-hit modifiers

- **GIVEN** a hex has both movement projection data and combat projection data
- **AND** the combat projection includes a to-hit modifier stack
- **WHEN** the player hovers the combined tactical hex
- **THEN** the combined tactical tooltip SHALL include the same per-modifier combat rows without replacing movement context
