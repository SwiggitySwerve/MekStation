# campaign-management Specification Delta

## MODIFIED Requirements

### Requirement: Campaign Options

The system SHALL support 65 configurable campaign options organized by category (personnel, financial, combat, force, general), including 11 new faction standing options.

#### Scenario: Default options are sensible

- **GIVEN** createDefaultCampaignOptions is called
- **WHEN** the options are inspected
- **THEN** healingRateMultiplier is 1.0, salaryMultiplier is 1.0, startingFunds is 0, useAutoResolve is false, maxUnitsPerLance is 4, trackFactionStanding is true, factionStandingDecayEnabled is true, and all 65 options have valid default values

#### Scenario: Options can be partially overridden

- **GIVEN** a user provides partial options {startingFunds: 5000000, salaryMultiplier: 2.0, trackFactionStanding: false}
- **WHEN** createCampaign is called with these options
- **THEN** the campaign has startingFunds 5000000, salaryMultiplier 2.0, trackFactionStanding false, with all other options set to defaults

#### Scenario: Options affect campaign behavior

- **GIVEN** a campaign with payForSalaries set to false
- **WHEN** day advancement processes daily costs
- **THEN** no salary transactions are recorded

#### Scenario: Faction standing options control effects

- **GIVEN** a campaign with trackFactionStanding set to true and factionStandingNegotiationEnabled set to true
- **WHEN** faction standing effects are calculated
- **THEN** negotiation modifiers are applied based on standing level

#### Scenario: Faction standing effects can be toggled individually

- **GIVEN** a campaign with factionStandingContractPayEnabled set to false
- **WHEN** contract pay is calculated
- **THEN** faction standing contract pay multiplier is not applied (defaults to 1.0)

#### Scenario: Faction standing decay can be disabled

- **GIVEN** a campaign with factionStandingDecayEnabled set to false
- **WHEN** daily faction standing processing occurs
- **THEN** regard does not decay toward neutral
