## ADDED Requirements

### Requirement: Pipeline-Owned Preview Freshness

The cascade pipeline SHALL bind every preview kind to the state used to compute its projection. Approval SHALL reject a ready preview with missing freshness or changed source state before applying its domain effects or appending either ledger. Campaign freshness SHALL compare campaign identity, version and date. Tactical freshness SHALL compare a state fingerprint built through existing hashing utilities.

#### Scenario: Campaign changes after any correction preview

- **GIVEN** a ready repair, salvage, funds, inventory, base-unit, unit reload or time preview
- **WHEN** campaign identity, version or date changes before approval
- **THEN** approval SHALL return blocked and preserve the current state
- **AND** neither ledger SHALL gain a record
- **AND** the campaign page SHALL send no co-op host intent for that approval

#### Scenario: Tactical state changes after preview

- **GIVEN** a ready combat or unit-reload preview
- **WHEN** the current tactical state fingerprint differs at approval
- **THEN** approval SHALL return blocked before engine application
- **AND** neither ledger SHALL gain a record

#### Scenario: Regenerated preview may be approved

- **GIVEN** a stale preview was blocked
- **WHEN** the GM generates a new ready preview against current state and approves without an intervening change
- **THEN** the registered domain implementer SHALL apply the projection
- **AND** the successful approval SHALL append one intervention record

### Requirement: Transient Preview Lifecycle Metadata

Freshness metadata SHALL remain on transient previews and SHALL NOT appear in approved records, campaign saves, projected event payloads or co-op wire payloads. Canonical intervention record statuses SHALL be approved or manual only. Previewed and cancelled SHALL remain transient lifecycle states rather than canonical ledger statuses.

#### Scenario: Approval preserves existing persistence shapes

- **GIVEN** a fresh ready preview carrying pipeline freshness
- **WHEN** approval succeeds and campaign state is serialized or a co-op funds intent is built
- **THEN** freshness SHALL be absent from both ledgers, the save and the intent

#### Scenario: Preview and cancellation append nothing

- **GIVEN** a GM generates a preview and then cancels it
- **WHEN** the canonical intervention and action ledgers are read
- **THEN** neither SHALL contain a previewed or cancelled record
