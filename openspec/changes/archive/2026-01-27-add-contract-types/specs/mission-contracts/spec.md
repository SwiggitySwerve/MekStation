# mission-contracts Specification Delta

## MODIFIED Requirements

### Requirement: Contract Entity
The system SHALL extend IContract with AtB-specific fields including contract type, ops tempo, and parts availability modifier.

#### Scenario: Contract has AtB type
- **GIVEN** a new AtB contract
- **WHEN** the contract is created
- **THEN** atbContractType field contains one of 19 AtB types

#### Scenario: Legacy contracts remain compatible
- **GIVEN** an existing contract without atbContractType
- **WHEN** the contract is loaded
- **THEN** contract functions correctly with default values

### Requirement: Contract Market Generation
The system SHALL generate contracts using all 19 AtB types with type-specific properties.

#### Scenario: Market offers all 19 types
- **GIVEN** contract market generation
- **WHEN** contracts are generated
- **THEN** all 19 AtB types are available in the pool

#### Scenario: Contract has type-specific length
- **GIVEN** a PLANETARY_ASSAULT contract
- **WHEN** the contract is generated
- **THEN** length is calculated using variable length formula
