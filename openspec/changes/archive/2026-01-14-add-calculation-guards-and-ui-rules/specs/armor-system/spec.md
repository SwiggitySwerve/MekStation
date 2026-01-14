## ADDED Requirements

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
- **WHEN** switching to Heavy Ferro-Fibrous (24 pts/ton)
- **THEN** tonnage cap SHALL be significantly lower than Standard
- **AND** for 75-ton mech: ~13 tons vs ~19.5 tons for Standard
