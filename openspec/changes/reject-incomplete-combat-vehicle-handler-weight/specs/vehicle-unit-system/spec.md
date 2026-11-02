## ADDED Requirements

### Requirement: Explicit Incomplete Combat Handler Weight Failure

The Tank and VTOL handler calculateWeight APIs SHALL fail explicitly when a
complete weight is unavailable. They SHALL NOT return simplified subtotals,
invent mounted mass from equipment names, or use legacy turret compatibility
fields as mechanism mass. Parsing SHALL remain independent of this calculation.

#### Scenario: Parsed vehicle lacks resolved construction mass

- **GIVEN** a successfully parsed Tank or VTOL source
- **WHEN** calculateWeight is requested without a complete resolved construction
- **THEN** it throws a descriptive incomplete-weight error
- **AND** parsing remains successful

#### Scenario: Legacy turret fields cannot supply missing mass

- **GIVEN** a Tank whose turret has legacy currentWeight values
- **WHEN** calculateWeight is requested
- **THEN** it still fails explicitly rather than presenting a subtotal as a total
