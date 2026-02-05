# markets-system Specification

## Purpose

TBD - created by archiving change add-markets-system. Update Purpose after archive.

## Requirements

### Requirement: Unit Market System

The system SHALL provide a unit market with 7 rarity levels, 6 market types, and monthly refresh.

#### Scenario: Generate unit offers monthly

- **GIVEN** a campaign on the 1st of the month with unitMarketMethod='atb_monthly'
- **WHEN** the unit market processor runs
- **THEN** unit offers are generated for all market type/rarity combinations

#### Scenario: Calculate item count by rarity

- **GIVEN** a COMMON rarity (value=3)
- **WHEN** calculateItemCount is called with d6 roll of 4
- **THEN** item count is 4 (roll 4 + rarity 3 - 3 = 4)

#### Scenario: Price varies by 2d6 roll

- **GIVEN** a 2d6 roll of 7
- **WHEN** calculatePricePercent is called
- **THEN** price percent is 100 (no modifier)

### Requirement: Personnel Market System

The system SHALL provide a personnel market with daily generation and experience-based expiration.

#### Scenario: Generate personnel daily

- **GIVEN** a campaign with personnelMarketStyle='mekhq'
- **WHEN** the personnel market processor runs daily
- **THEN** new personnel offers are generated based on market style

#### Scenario: Elite personnel expire faster

- **GIVEN** an Elite personnel offer
- **WHEN** getExpirationDays is called
- **THEN** expiration is 3 days

#### Scenario: Remove expired offers

- **GIVEN** personnel offers with expiration dates in the past
- **WHEN** removeExpiredOffers is called
- **THEN** expired offers are removed from the market

### Requirement: Market Purchase Functions

The system SHALL provide purchase and hire functions with transaction integration.

#### Scenario: Purchase unit deducts cost

- **GIVEN** a campaign with balance 1,000,000 and a unit offer costing 500,000
- **WHEN** purchaseUnit is called
- **THEN** campaign balance is 500,000 and unit is added to force

#### Scenario: Hire person deducts cost

- **GIVEN** a campaign with balance 100,000 and a personnel offer costing 10,000
- **WHEN** hirePerson is called
- **THEN** campaign balance is 90,000 and person is added to roster

### Requirement: Faction Standing Integration

The system SHALL integrate faction standing modifiers for all markets via stub functions.

#### Scenario: Unit market rarity modifier stub

- **GIVEN** a campaign with any faction standing
- **WHEN** getUnitMarketRarityModifier is called
- **THEN** modifier is 0 (neutral default until Plan 5 built)

#### Scenario: Contract negotiation modifier stub

- **GIVEN** a campaign with any faction standing
- **WHEN** getContractNegotiationModifier is called
- **THEN** modifier is 0 (neutral default until Plan 5 built)

### Requirement: Market Day Processors

The system SHALL process markets via day processors with appropriate frequencies.

#### Scenario: Unit market refreshes monthly

- **GIVEN** a campaign on the 1st of the month
- **WHEN** the unit market processor runs
- **THEN** all unit offers are regenerated

#### Scenario: Personnel market refreshes daily

- **GIVEN** a campaign on any day
- **WHEN** the personnel market processor runs
- **THEN** expired offers are removed and new offers are added

#### Scenario: Contract market refreshes monthly

- **GIVEN** a campaign on the 1st of the month
- **WHEN** the contract market processor runs
- **THEN** contract offers are regenerated

### Requirement: Market Configuration Options

The system SHALL provide 3 campaign options for market configuration.

#### Scenario: Unit market disabled by default

- **GIVEN** a new campaign with default options
- **WHEN** the campaign is created
- **THEN** unitMarketMethod is 'none' (opt-in)

#### Scenario: Personnel market disabled by default

- **GIVEN** a new campaign with default options
- **WHEN** the campaign is created
- **THEN** personnelMarketStyle is 'disabled' (opt-in)

#### Scenario: Contract market enabled by default

- **GIVEN** a new campaign with default options
- **WHEN** the campaign is created
- **THEN** contractMarketMethod is 'atb_monthly' (existing behavior)
