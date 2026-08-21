# Campaign Persistence (Delta)

## MODIFIED Requirements

### Requirement: Server-Side Campaign Persistence Contract

The system SHALL persist campaigns server-side via `GET`, `PUT`, and `DELETE`
on `/api/campaigns/[id]`, storing the `SerializedCampaign` keyed by campaign id
through the shared server-store backend under a dedicated `campaigns:` keyspace.
The server-side store SHALL be the authoritative home of every campaign owned by
this server (per campaign-authority): a source campaign SHALL exist in the server
store from creation, `PUT` SHALL operate as the write-through of the source
instance's projection (not an optional export), and a campaign absent from the
server store SHALL NOT be presented as owned by this server even if a browser
cache holds a copy.

#### Scenario: Save a campaign

- **GIVEN** a `SerializedCampaign` for campaign C
- **WHEN** a client `PUT`s it to `/api/campaigns/C`
- **THEN** the server SHALL store the record
- **AND** the response SHALL carry the stored record with its incremented `version`

#### Scenario: Load a saved campaign

- **GIVEN** campaign C has been saved to the server
- **WHEN** a client `GET`s `/api/campaigns/C`
- **THEN** the server SHALL return the stored `SerializedCampaign`

#### Scenario: Load a missing campaign

- **GIVEN** no server record exists for campaign id `X`
- **WHEN** a client `GET`s `/api/campaigns/X`
- **THEN** the server SHALL respond `404`

#### Scenario: Creation lands in the server store immediately

- **GIVEN** a client completes the new-campaign wizard against this server
- **WHEN** creation is acknowledged
- **THEN** the campaign SHALL already exist in the server store
- **AND** a different browser context on the same server SHALL load it by deep link without any client-side handoff

#### Scenario: Delete a server record

- **GIVEN** campaign C has a server record
- **WHEN** a client `DELETE`s `/api/campaigns/C`
- **THEN** the server record SHALL be removed
- **AND** any client cache of C SHALL be treated as stale and SHALL NOT resurrect the campaign as server-owned

## ADDED Requirements

### Requirement: Campaign Snapshots Are Materialized Journal Projections
After campaign cutover, persisted campaign snapshots SHALL be rebuildable materializations of committed journal history rather than an independent write authority. Snapshot writes SHALL record the source branch, revision, projector version, deterministic schema/upcaster-pipeline fingerprint, and digest. A durable migration state and cutover marker SHALL identify the source snapshot revision/digest, imported baseline, compatible schema-pipeline fingerprint, and whether any journal-authority command has committed.

#### Scenario: Snapshot is stale
- **WHEN** a persisted snapshot trails the journal head
- **THEN** recovery SHALL apply the contiguous committed tail or rebuild from an earlier base
- **AND** it SHALL not overwrite newer journal history with the stale snapshot

#### Scenario: Replay pipeline changed without a projector-version change
- **WHEN** a snapshot's schema-pipeline fingerprint differs from the registered deterministic upcaster/target-schema pipeline
- **THEN** recovery SHALL discard the snapshot and rebuild from compatible journal history before fan-out
- **AND** a matching projector version or stored digest SHALL NOT make the stale materialization admissible

#### Scenario: Rollback reader is required
- **WHEN** application rollback occurs after journal rows exist
- **THEN** the rollback SHALL use a schema-compatible reader and stop unsafe new admission
- **AND** it SHALL not delete or rewrite journal history

#### Scenario: Snapshot rollback is requested before first journal command
- **WHEN** the journal head still equals its imported baseline
- **THEN** an audited rollback MAY restore the compatible legacy reader
- **AND** the migration marker and journal rows SHALL remain intact

#### Scenario: Snapshot rollback is requested after journal authority wrote
- **WHEN** any journal-authority command committed after the imported baseline
- **THEN** snapshot-authority fallback SHALL be prohibited
- **AND** the campaign SHALL use a compatible journal reader or enter a truthful blocked state
