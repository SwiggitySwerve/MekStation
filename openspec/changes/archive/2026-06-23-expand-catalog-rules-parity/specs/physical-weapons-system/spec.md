## ADDED Requirements

### Requirement: Official Physical Weapon Catalog Classification

The physical weapon catalog SHALL classify every official BattleMech physical weapon entry as a standalone runtime attack, modifier-only equipment, construction-only/out-of-scope entry, partial support, or unsupported gap.

#### Scenario: Standalone physical attack is runtime-backed
- **WHEN** an official physical weapon is classified as a standalone attack
- **THEN** runtime legality, to-hit, damage, hit location, and miss consequence behavior are validated with source-backed evidence

#### Scenario: Modifier-only physical equipment is not selectable attack
- **WHEN** an official physical weapon entry is modifier-only equipment such as a kick or punch modifier
- **THEN** it is not counted as a selectable standalone attack
- **AND** the modifier behavior is validated or listed as a precise gap

#### Scenario: Unsupported physical entry remains explicit
- **WHEN** an official physical weapon entry has no runtime support
- **THEN** the combat validation gap inventory includes the entry with evidence and source references
- **AND** the row is not hidden by physical-combat known limitation suppression
