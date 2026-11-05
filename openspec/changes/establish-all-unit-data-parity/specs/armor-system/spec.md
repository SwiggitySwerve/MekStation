## MODIFIED Requirements

### Requirement: Armor Types

The system SHALL support 14 armor types with distinct point-per-ton ratios.

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
