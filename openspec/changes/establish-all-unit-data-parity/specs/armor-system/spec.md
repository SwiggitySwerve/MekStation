## MODIFIED Requirements

### Requirement: Armor Types

The system SHALL support 14 armor types with distinct point-per-ton ratios.
Construction calculations and unit loading SHALL use the same owning armor
definitions rather than maintaining separate density tables.

#### Scenario: Standard armor

- **WHEN** using standard armor
- **THEN** ratio SHALL be 16 points per ton
- **AND** armor SHALL require 0 critical slots

#### Scenario: Ferro-Fibrous armor

- **WHEN** using Ferro-Fibrous
- **THEN** IS ratio SHALL be 17.92 points per ton (14 slots)
- **AND** Clan ratio SHALL be 19.2 points per ton (7 slots)

#### Scenario: Light and heavy ferro density

- **WHEN** computing construction mass or loading armor allocation
- **THEN** Light Ferro-Fibrous SHALL provide 16.96 points per ton
- **AND** Heavy Ferro-Fibrous SHALL provide 19.84 points per ton
- **AND** required mass SHALL retain the caller's upward half-ton rounding

Source: MegaMek `48fcb2f64a1b3f2d575707ce5653dad64927b587`,
`ArmorType.java:61,226,302,482,513,788-826`.

### Requirement: Armor Type Change Guard

The system SHALL automatically adjust armor tonnage when changing armor types to prevent wasted tonnage.

#### Scenario: Switching to more efficient armor type

- **WHEN** user changes armor type to one with higher points-per-ton
- **THEN** armor tonnage SHALL be capped at maxUsefulTonnage for the new type
- **AND** maxUsefulTonnage = ceilToHalfTon(maxStructuralArmor / newPointsPerTon)
- **AND** existing tonnage below maxUsefulTonnage SHALL be preserved

#### Scenario: Switching to less efficient armor type

- **WHEN** user changes armor type to one with lower points-per-ton
- **THEN** armor tonnage SHALL also be capped at maxUsefulTonnage
- **AND** this prevents wasted tonnage even when switching to less efficient armor

#### Scenario: Standard to Ferro-Fibrous switch

- **WHEN** 75-ton mech has 19.5 tons of Standard armor (312 points)
- **AND** user switches to Ferro-Fibrous IS (17.92 pts/ton)
- **THEN** tonnage SHALL be capped to ~17.5 tons
- **AND** this provides ~313 points (just over structural max of 307)

#### Scenario: Heavy Ferro maximum efficiency

- **WHEN** switching to Heavy Ferro-Fibrous (19.84 pts/ton)
- **THEN** tonnage cap SHALL be lower than Standard
- **AND** for a 100-ton mech with 307 maximum points: 15.5 tons vs 19.5 tons for Standard

