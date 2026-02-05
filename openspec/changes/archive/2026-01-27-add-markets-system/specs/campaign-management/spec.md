# campaign-management Specification Delta

## ADDED Requirements

### Requirement: Market Configuration Options

The system SHALL provide 3 campaign options for market configuration.

#### Scenario: Unit market method option

- **GIVEN** a campaign with unitMarketMethod='atb_monthly'
- **WHEN** the unit market processor runs
- **THEN** unit offers are generated monthly

#### Scenario: Personnel market style option

- **GIVEN** a campaign with personnelMarketStyle='mekhq'
- **WHEN** the personnel market processor runs
- **THEN** personnel offers are generated daily

#### Scenario: Contract market method option

- **GIVEN** a campaign with contractMarketMethod='atb_monthly'
- **WHEN** the contract market processor runs
- **THEN** contract offers are generated monthly

### Requirement: Market Offer Storage

The system SHALL store market offers on the campaign state.

#### Scenario: Unit market offers stored

- **GIVEN** a campaign with unit market enabled
- **WHEN** unit offers are generated
- **THEN** campaign.unitMarketOffers contains the generated offers

#### Scenario: Personnel market offers stored

- **GIVEN** a campaign with personnel market enabled
- **WHEN** personnel offers are generated
- **THEN** campaign.personnelMarketOffers contains the generated offers

#### Scenario: Market offers persist across days

- **GIVEN** a campaign with market offers
- **WHEN** the campaign is saved and loaded
- **THEN** market offers are restored
