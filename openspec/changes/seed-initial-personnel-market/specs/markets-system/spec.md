## ADDED Requirements

### Requirement: Initial Personnel Market

The system SHALL initialize an enabled personnel market in the shared campaign
store create action before publishing the campaign or its first save. It SHALL
reuse the personnel-market owner and campaign-seeded daily random stream.
Initialization SHALL preserve existing and explicitly empty pools, leave
disabled markets empty, and never invent offers for a guest mirror.

#### Scenario: Enabled local or co-op host creation

- **GIVEN** a new local or co-op host campaign with the personnel market enabled
- **WHEN** the shared create action returns, before page mount or day advance
- **THEN** its initial recruits are available and retained by both persistence paths
- **AND** authoritative HireOffer derives the recruit and price from that saved pool

#### Scenario: Disabled Standard and guest mirrors

- **GIVEN** a stock Standard campaign or a guest mirror without a host market
- **WHEN** creation completes
- **THEN** no personnel offers are invented
- **AND** the Standard preset remains disabled

#### Scenario: Enable a local market after creation

- **GIVEN** a local campaign created with its personnel market disabled
- **WHEN** the player enables that market before its first hiring-page open
- **THEN** the absent pool is initialized on first open
- **AND** creation has not marked the disabled market as an exhausted empty pool

#### Scenario: Local old-save first-open fallback

- **GIVEN** a local saved campaign whose personnel market is absent
- **WHEN** the hiring page first opens with the clock idle
- **THEN** the same domain initializer provides its enabled market
- **AND** existing and explicitly empty pools remain unchanged on later opens
- **AND** co-op campaigns never use this local fallback

### Requirement: Deterministic Personnel Offer Identity

The system SHALL derive generated personnel offer identities from campaign
identity, resolved seed, UTC calendar date and candidate ordinal. It SHALL NOT
consume additional attribute rolls or depend on ambient time or randomness.
It SHALL preserve stored offer identities and require no save migration.

#### Scenario: Repeated generation

- **GIVEN** the same campaign identity, seed, date and personnel random stream
- **WHEN** generation runs under different wall-clock times and ambient randomness
- **THEN** complete offers, including identities, are identical
- **AND** candidate attributes, costs and expiry retain their existing rolls

#### Scenario: Advancing from creation

- **GIVEN** a newly created enabled market
- **WHEN** the campaign advances its first day
- **THEN** the existing processor retains unexpired initial recruits and adds distinct next-day offers
- **AND** hiring and journal projection continue consuming offers by their stored identity
