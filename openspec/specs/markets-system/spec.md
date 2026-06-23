# markets-system Specification

## Purpose

Defines Markets System requirements for Unit Market System, Personnel Market System, Market Purchase Functions, and Faction Standing Integration, preserving the source-of-truth scope introduced by archived change add-markets-system.
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

The system SHALL provide purchase and hire functions with transaction
integration. A unit purchase SHALL validate available funds before any mutation,
debit the offer's cost from campaign finances, and add the purchased unit to the
force as a single atomic operation; on insufficient funds it SHALL return a
failure with a reason and SHALL NOT mutate finances or the force. A purchase
SHALL NOT report success while leaving the balance and force unchanged.

#### Scenario: Purchase unit deducts cost

- **GIVEN** a campaign with balance 1,000,000 and a unit offer costing 500,000
- **WHEN** purchaseUnit is called
- **THEN** campaign balance is 500,000 and unit is added to force

#### Scenario: Hire person deducts cost

- **GIVEN** a campaign with balance 100,000 and a personnel offer costing 10,000
- **WHEN** hirePerson is called
- **THEN** campaign balance is 90,000 and person is added to roster

#### Scenario: Insufficient funds rejects the purchase without mutation

- **GIVEN** a campaign with balance 100,000 and a unit offer costing 500,000
- **WHEN** purchaseUnit is called
- **THEN** the call SHALL return a failure with a reason
- **AND** the campaign balance SHALL remain 100,000 and no unit SHALL be added.

#### Scenario: A successful purchase never no-ops

- **GIVEN** a unit offer that exists in the provided offers list and sufficient funds
- **WHEN** purchaseUnit returns success
- **THEN** the campaign balance SHALL be reduced by the offer cost
- **AND** the force SHALL contain the purchased unit.

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

### Requirement: Parts Inventory

The campaign SHALL carry a single parts inventory (warehouse) pool on
`ICampaign`. Both salvage award and acquisition delivery SHALL materialize parts
into this single pool, and the repair-ticket completion processor SHALL read its
required parts from this same pool. The system SHALL NOT maintain separate
per-source parts pools that a reader must reconcile.

#### Scenario: Salvage and acquisition feed the same pool

- **GIVEN** a campaign that accepts a salvage part and later takes delivery of an
  acquired part of the same kind
- **WHEN** the parts inventory is inspected
- **THEN** both parts SHALL be present in the single `partsInventory` pool
- **AND** the repair processor SHALL be able to consume either to satisfy a matching
  ticket.

#### Scenario: A new campaign starts with an empty inventory

- **GIVEN** a newly created campaign
- **WHEN** the campaign is initialized
- **THEN** `partsInventory` SHALL be present and empty.

### Requirement: GM Inventory Lot Correction Proof

Market and base inventory state SHALL remain covered by the Wave 8 campaign ledger QC proof for GM inventory lot corrections that repair merchant or acquisition mistakes.

#### Scenario: Inventory correction proof covers replacement, patch, quantity delta, and removal roots

- **GIVEN** a GM corrects a base inventory lot after a merchant or acquisition mistake
- **WHEN** the campaign ledger QC validator runs
- **THEN** it SHALL validate source and test anchors proving inventory lots can be replaced, patched, quantity-adjusted, or removed through approved projected effects
