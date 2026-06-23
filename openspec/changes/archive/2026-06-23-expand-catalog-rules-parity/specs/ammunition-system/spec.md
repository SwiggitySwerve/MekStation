## ADDED Requirements

### Requirement: Official Ammunition Compatibility Mapping

Ammunition validation SHALL map official BattleMech ammunition entries to compatible weapon rows, special ammunition behavior, tech base constraints, and runtime consumption behavior. Rows without compatible runtime weapons SHALL remain explicit gaps or out-of-scope classifications.

#### Scenario: Compatible ammo maps to runtime weapon
- **WHEN** official ammunition declares a compatible BattleMech weapon
- **THEN** validation confirms the compatible weapon row exists and can consume that ammunition
- **AND** the ammo entry is not satisfied by name-only or static-BV fallback matching

#### Scenario: Special ammo behavior is explicit
- **WHEN** ammunition carries Artemis-capable, NARC-capable, Streak, LB-X cluster, RAC, UAC, AMS, or MML-style behavior
- **THEN** validation maps the behavior to runtime support or records an explicit unresolved gap

#### Scenario: Non-consumable or unsupported ammo remains visible
- **WHEN** official ammunition has no supported runtime consumer in the BattleMech matrix
- **THEN** the gap inventory classifies it as unsupported, helper-only, or out-of-scope
- **AND** validation does not silently drop the row
