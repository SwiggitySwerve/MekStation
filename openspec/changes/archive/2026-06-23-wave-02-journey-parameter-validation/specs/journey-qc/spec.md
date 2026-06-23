## ADDED Requirements

### Requirement: Catalog-valid journey parameter overrides
The journey runner SHALL validate every provided parameter override against the selected journey catalog definition before writing execution evidence. Validation MUST reject malformed integer, boolean, enum, and string-list values; MUST enforce declared numeric minimum and maximum bounds; and MUST name the journey ID, parameter name, offending value, and expected constraint in the failure message.

#### Scenario: Invalid integer override is rejected
- **WHEN** the user runs `npm.cmd run qc:journeys -- --journey=campaign-short --contracts=abc`
- **THEN** the command fails before claiming journey execution
- **AND** the failure message names `campaign-short`, `contracts`, `abc`, and the integer requirement

#### Scenario: Out-of-range integer override is rejected
- **WHEN** the user runs `npm.cmd run qc:journeys -- --journey=campaign-short --contracts=1`
- **THEN** the command fails before claiming journey execution
- **AND** the failure message names `campaign-short`, `contracts`, `1`, and the minimum allowed value

#### Scenario: Invalid enum override is rejected
- **WHEN** the user runs `npm.cmd run qc:journeys -- --journey=mek-build --unitTechBase=NOT_REAL`
- **THEN** the command fails before claiming journey execution
- **AND** the failure message names `mek-build`, `unitTechBase`, `NOT_REAL`, and the allowed enum values

#### Scenario: Unknown override is rejected
- **WHEN** the user runs `npm.cmd run qc:journeys -- --journey=mek-build --unitTechBaseTypo=CLAN`
- **THEN** the command fails before claiming journey execution
- **AND** the failure message names `unitTechBaseTypo` as an unknown journey parameter for `mek-build`

#### Scenario: Valid overrides remain evidence inputs
- **WHEN** the user runs `npm.cmd run qc:journeys -- --journey=mek-build --era=3050 --unitTechBase=CLAN --weight-class=Heavy`
- **THEN** the command succeeds
- **AND** the resolved run plan and generated artifacts record `era` as integer `3050`, `unitTechBase` as `CLAN`, and `weight-class` as `Heavy`
