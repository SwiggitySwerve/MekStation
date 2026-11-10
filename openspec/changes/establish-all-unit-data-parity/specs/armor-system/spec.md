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

#### Scenario: Shared reactive armor density

- **WHEN** reactive armor is used by any unit family
- **THEN** its density SHALL be 16 points per ton from the shared armor owner
- **AND** the loader SHALL consume that owner while preserving its half-ton ceiling
- **AND** targeting-computer mass and reactive density SHALL keep Hadur LRM at Java's 50-ton total

Source: MegaMek `48fcb2f64a1b3f2d575707ce5653dad64927b587`,
ArmorType.java:61,226,301-302,788-826; MiscType.java:614-616.

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

## ADDED Requirements

### Requirement: Ferro-Fibrous Prototype armor keeps its identity

The system SHALL represent the pinned `FERRO_FIBROUS_PROTO` armor (MegaMek ArmorType.java:518-542) as its own armor identity, with 17.92 points per ton, 16 critical slots on ordinary mechs, Inner Sphere tech base, Experimental rules level and native BLK code 9, and SHALL preserve it through loading, the armor picker, JSON save/reopen and BLK export, without falling back to Standard armor density.

#### Scenario: Jenner JR7-K (Grace)
- **WHEN** the committed unit is loaded, saved and reopened
- **THEN** its armor SHALL remain Ferro-Fibrous Prototype with 4.5 t of armor
- **AND** the design SHALL remain a valid 35 t construction with BV 702

#### Scenario: MTF export round trip

- **WHEN** a mech with Ferro-Fibrous Prototype armor is exported to MTF and re-imported
- **THEN** it SHALL retain its armor identity and per-location armor allocation using the pinned `Ferro-Fibrous Prototype` name (native armor code 9)
- **AND** the MTF armor vocabulary SHALL exactly cover the mech identities in an explicit classification of every loader-accepted `standardArmorType`
- **AND** the classification SHALL identify BLK as the owning format for battle armor, aerospace, ProtoMech and support-vehicle BAR identities
- **AND** Patchwork without complete per-location points, types and tech bases SHALL fail with a named diagnostic and no content

Source: MegaMek `48fcb2f64a1b3f2d575707ce5653dad64927b587`,
`ArmorType.java:518-542`; `EquipmentType.java:94,1081-1089`;
`Mek.java:5385-5403`; `MtfFile.java:414-486`.
