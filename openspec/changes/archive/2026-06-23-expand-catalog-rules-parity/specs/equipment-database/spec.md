## ADDED Requirements

### Requirement: Official Combat Equipment Catalog Coverage

The equipment database SHALL load official BattleMech ranged weapon, ammunition, and physical weapon entries needed by combat validation. Each loaded entry SHALL expose stable identifiers, display names, tech base, rules level, temporal availability, damage or effect fields, heat, ranges, ammunition compatibility, and source-backed category metadata where applicable.

#### Scenario: Official ranged weapon row is loadable
- **WHEN** a catalog-backed combat validation test requests an official ranged weapon
- **THEN** the equipment database returns a source-backed row with damage, heat, range brackets, minimum range when applicable, ammunition behavior when applicable, tech base, rules level, and temporal availability

#### Scenario: Official ammunition row is loadable
- **WHEN** a catalog-backed combat validation test requests an official ammunition entry
- **THEN** the equipment database returns a source-backed row with compatible weapon mapping or an explicit unsupported compatibility gap

#### Scenario: Official physical weapon row is loadable
- **WHEN** a catalog-backed combat validation test requests an official physical weapon
- **THEN** the equipment database returns a source-backed row with construction fields and combat classification metadata

### Requirement: Official Catalog No-Fallback Failure

The equipment database SHALL fail loudly or report an explicit gap when official combat validation requires a missing official row. Synthetic fallback rows SHALL NOT be used to satisfy official coverage.

#### Scenario: Missing official row becomes gap
- **WHEN** official catalog validation requests a row absent from the loaded equipment database
- **THEN** validation records a named catalog gap
- **AND** no static fallback row is counted as official support
