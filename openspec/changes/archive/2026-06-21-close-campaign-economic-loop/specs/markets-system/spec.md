# markets-system Delta — close-campaign-economic-loop

## MODIFIED Requirements

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

## ADDED Requirements

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
