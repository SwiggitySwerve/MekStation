## ADDED Requirements

### Requirement: Range Brackets Column

The Equipment Browser SHALL display weapon range brackets in the equipment table.

#### Scenario: Range column display for weapons

- **WHEN** equipment is a weapon (energy, ballistic, missile, artillery, physical)
- **THEN** Range column displays Short/Medium/Long values in "S/M/L" format
- **AND** values are separated by forward slashes (e.g., "3/6/9")

#### Scenario: Range column display for non-weapons

- **WHEN** equipment is not a weapon (ammo, electronics, misc)
- **THEN** Range column displays dash (-)

#### Scenario: Partial range data

- **WHEN** weapon has only long range defined (e.g., minimum range weapons)
- **THEN** Range column displays only the long range value

#### Scenario: Mobile range display

- **WHEN** viewport is mobile width
- **THEN** Range column appears after Damage column
- **AND** column header shows "RNG"
- **AND** column content aligns with header
