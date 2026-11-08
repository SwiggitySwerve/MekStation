## ADDED Requirements

### Requirement: Local Offer Lifecycle

Local market actions SHALL reject missing, declined, expired or consumed offers.
Acceptance SHALL consume the offer and remove its decline marker. Enrollment
or payment evidence SHALL prevent a second payment or enrollment.

#### Scenario: Declined or consumed contract

- **GIVEN** an offer was declined or its mission already exists
- **WHEN** local acceptance is requested
- **THEN** no mission, payment or market mutation SHALL occur.

#### Scenario: Payment before enrollment

- **GIVEN** a live hire or unit offer and sufficient funds
- **WHEN** the offer is accepted locally
- **THEN** its transaction and consumption SHALL precede enrollment
- **AND** loan metadata SHALL survive
- **AND** enrollment failure SHALL restore the payment, offer and roster.

#### Scenario: Insufficient funds or expired offer

- **GIVEN** insufficient funds or an expired offer
- **WHEN** local hiring or purchase is requested
- **THEN** the balance, transactions, roster and offers SHALL remain unchanged.

### Requirement: Local Market Admission

Local market actions and page seeding SHALL refuse mutations while day advance
is in flight or the campaign has a co-op session. The same owner SHALL supply
the refusal to store actions and pages. Existing co-op proposals SHALL remain
unchanged.

#### Scenario: Co-op market controls

- **GIVEN** a host or guest campaign
- **WHEN** local hire, purchase, accept, decline or page seeding is attempted
- **THEN** state SHALL remain unchanged
- **AND** the UI SHALL explain "Use the co-op proposal controls for market changes."

#### Scenario: Day advance

- **GIVEN** day advance is in flight
- **WHEN** a market page renders or a local market action is requested
- **THEN** seeding and actions SHALL be blocked with a sentence-case reason
- **AND** controls SHALL become available when the flag clears.

### Requirement: Compatible Offer Recovery

Both campaign loaders SHALL use one idempotent local offer normalizer. Existing
missions, enrollment and payment evidence SHALL take precedence over stale
market entries. Recovery SHALL NOT charge retroactively or invent payments.
Day processors SHALL prune expired and consumed carry-over offers and obsolete
decline IDs without resurrecting declined offers.

#### Scenario: Inconsistent old save

- **GIVEN** accepted and declined contract state or paid/enrolled offers in a local save
- **WHEN** either loader restores it, including a second round trip
- **THEN** market projections SHALL agree and remain stable
- **AND** balances, transaction history and existing enrollment SHALL be preserved.

#### Scenario: Refresh and expiry

- **GIVEN** retained expired or consumed offers and obsolete decline IDs
- **WHEN** day processors run, including with market generation disabled
- **THEN** obsolete entries SHALL be pruned without reviving a declined offer.
