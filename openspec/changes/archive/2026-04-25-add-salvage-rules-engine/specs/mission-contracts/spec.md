# mission-contracts Specification Delta

## ADDED Requirements

### Requirement: Contract Salvage Rights Clause

Each contract SHALL carry a `salvageRights` field representing the
mercenary percentage of salvage value (0–100).

#### Scenario: Default salvage rights

- **GIVEN** a newly generated contract without an overriding negotiation
  result
- **WHEN** its `salvageRights` field is inspected
- **THEN** the field SHALL be a number in the range 0–100
- **AND** typical default SHALL be between 0 (garrison) and 50 (objective
  raid) per AtB defaults

#### Scenario: Negotiated salvage rights

- **GIVEN** a contract negotiation that succeeded on the salvage clause
- **WHEN** the contract is created
- **THEN** `salvageRights` SHALL reflect the negotiated percentage
- **AND** the value SHALL remain clamped to the 0–100 range

### Requirement: Contract Exchange Salvage Flag

Each contract SHALL carry a boolean `exchangeSalvage` field indicating
whether salvage uses the alternating-draft exchange rules instead of a
straight percentage split.

#### Scenario: Exchange salvage triggers auction split

- **GIVEN** a contract with `exchangeSalvage = true`
- **WHEN** `computeSalvage(outcome, contract, terrain)` is called
- **THEN** the salvage engine SHALL use the auction-style draft split
  instead of the contract-percentage split
- **AND** `allocation.splitMethod` SHALL equal `"auction"`

#### Scenario: Non-exchange contract uses percentage split

- **GIVEN** a contract with `exchangeSalvage = false`
- **WHEN** `computeSalvage` is called
- **THEN** the salvage engine SHALL use the percentage-based contract
  split
- **AND** `allocation.splitMethod` SHALL equal `"contract"`
