# campaign-persistence Specification

## Purpose

Defines Campaign Persistence requirements for Serialized Campaign Envelope, Campaign Serialization Round-Trip, Schema Version and Migration Ladder, and Server-Side Campaign Persistence Contract, preserving the source-of-truth scope introduced by archived change add-campaign-persistence.
## Requirements
### Requirement: Serialized Campaign Envelope

The system SHALL define a `SerializedCampaign` envelope that wraps a JSON-safe
campaign body with a schema version, campaign id, save timestamp, origin device
id, and a monotonic write version. The envelope MUST be fully JSON-serializable.

#### Scenario: Envelope carries required metadata

- **GIVEN** a live `ICampaign` is prepared for saving
- **WHEN** the persistence layer builds a `SerializedCampaign`
- **THEN** the envelope SHALL include `schemaVersion`, `campaignId`, `savedAt`, `originDeviceId`, `version`, and `body`
- **AND** the entire envelope SHALL pass `JSON.stringify` / `JSON.parse` without loss

#### Scenario: Body is JSON-safe

- **GIVEN** an `ICampaign` carrying `Map` fields and `Date` fields
- **WHEN** it is serialized into a `SerializedCampaignBody`
- **THEN** every `Map` field SHALL be represented as an array of `[key, value]` pairs
- **AND** every `Date` field SHALL be represented as an ISO 8601 string

### Requirement: Campaign Serialization Round-Trip

The system SHALL provide pure, total `serializeCampaign` and
`deserializeCampaignBody` functions that share a single field-map constant so
the two directions cannot drift, and a round-trip MUST reproduce the original
campaign. The battle-aftermath state — `repairQueue`, `salvageAllocations` (and
their reports), `pendingBattleOutcomes`, and `processedBattleIds` — SHALL be
included in the shared field-map so it survives a serialize/deserialize
round-trip on the server path and does not vanish on a server-fetch reload.

#### Scenario: Round-trip preserves the campaign

- **GIVEN** a fully-populated `ICampaign` with non-empty `missions`, `personnel`, and `forces` maps
- **WHEN** it is serialized and then deserialized
- **THEN** the result SHALL deep-equal the original `ICampaign`
- **AND** all `Map` fields SHALL be restored as `Map` instances
- **AND** all `Date` fields SHALL be restored as `Date` instances

#### Scenario: Field-map drift fails the build

- **GIVEN** an `ICampaign` field of type `Map` or `Date`
- **WHEN** that field is not listed in the shared field-map constant
- **THEN** a type-level test SHALL fail the build

#### Scenario: Battle-aftermath fields survive the round-trip

- **GIVEN** an `ICampaign` with a populated `repairQueue`, `salvageAllocations`,
  `pendingBattleOutcomes`, and `processedBattleIds`
- **WHEN** it is serialized and then deserialized
- **THEN** the deserialized campaign SHALL carry the same `repairQueue`,
  `salvageAllocations`, `pendingBattleOutcomes`, and `processedBattleIds`
- **AND** `processedBattleIds` SHALL be restored to its runtime dedup-guard shape from its
  serialized array form.

### Requirement: Schema Version and Migration Ladder

The system SHALL stamp every saved campaign with a schema version and SHALL run
an ordered migration ladder on every read so a snapshot saved under an older
version is upgraded to the current version before deserialization.

#### Scenario: Current-version snapshot passes through

- **GIVEN** a `SerializedCampaign` at the current schema version
- **WHEN** `migrateSerializedCampaign` runs on read
- **THEN** the snapshot SHALL be returned unchanged

#### Scenario: Ladder is idempotent

- **GIVEN** a snapshot already at the current schema version
- **WHEN** the migration ladder runs twice
- **THEN** both runs SHALL produce an identical snapshot

### Requirement: Server-Side Campaign Persistence Contract

The system SHALL persist campaigns server-side via `GET`, `PUT`, and `DELETE`
on `/api/campaigns/[id]`, storing the `SerializedCampaign` keyed by campaign id
through the shared server-store backend under a dedicated `campaigns:` keyspace.

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

#### Scenario: Delete a server record

- **GIVEN** campaign C has a server record
- **WHEN** a client `DELETE`s `/api/campaigns/C`
- **THEN** the server record SHALL be removed
- **AND** the local IndexedDB copy SHALL be unaffected

### Requirement: Stale-Write Conflict Detection

The system SHALL detect a stale write by comparing the `baseVersion` of an
incoming `PUT` against the stored record's current `version`, and MUST reject a
mismatched write rather than silently overwriting.

#### Scenario: Clean write increments the version

- **GIVEN** a stored campaign record at `version` N
- **WHEN** a `PUT` arrives with `baseVersion` equal to N
- **THEN** the server SHALL store the record at `version` N+1

#### Scenario: Stale write is rejected

- **GIVEN** a stored campaign record at `version` N
- **WHEN** a `PUT` arrives with `baseVersion` less than N
- **THEN** the server SHALL respond `409 Conflict`
- **AND** the response SHALL include the current stored record

### Requirement: Campaign List Summaries

The system SHALL provide `GET /api/campaigns` returning lightweight campaign
summaries without the full campaign body.

#### Scenario: List returns summaries only

- **GIVEN** three campaigns are saved on the server
- **WHEN** a client `GET`s `/api/campaigns`
- **THEN** the response SHALL contain three `ICampaignSummary` entries
- **AND** each entry SHALL carry `id`, `name`, `factionId`, `currentDate`, `balance`, and `updatedAt`
- **AND** no entry SHALL include the full serialized body

### Requirement: Campaign Persistence Store

The system SHALL provide a `useCampaignPersistenceStore` that owns the save and
load lifecycle, dirty tracking, debounced auto-save, and a save-state machine,
while leaving live campaign content in the existing campaign store.

#### Scenario: Auto-save fires after mutations settle

- **GIVEN** a loaded campaign with `dirty` false
- **WHEN** the campaign is mutated and no further mutation occurs for the debounce interval
- **THEN** the store SHALL serialize an immutable campaign snapshot and `PUT` it to the server
- **AND** `saveState` SHALL transition through `saving` to `saved`

#### Scenario: Rapid mutations coalesce into one save

- **GIVEN** a loaded campaign
- **WHEN** several mutations occur within the debounce interval
- **THEN** the store SHALL issue exactly one `PUT` after the last mutation

#### Scenario: Load rehydrates the live campaign

- **GIVEN** campaign C exists on the server
- **WHEN** `loadCampaign("C")` is called
- **THEN** the store SHALL fetch, migrate, and deserialize the record
- **AND** the resulting `ICampaign` SHALL be written into the campaign store

#### Scenario: Conflict surfaces both versions

- **GIVEN** a save that receives a `409 Conflict`
- **WHEN** the store handles the response
- **THEN** `saveState` SHALL become `conflict`
- **AND** both the local and server campaign versions SHALL be exposed for the player to choose between

#### Scenario: Offline save failure is non-fatal

- **GIVEN** the server is unreachable
- **WHEN** an auto-save is attempted
- **THEN** `saveState` SHALL become `error`
- **AND** campaign play SHALL continue uninterrupted using the local IndexedDB copy

### Requirement: Campaign Save Metadata

The system SHALL expose campaign save metadata — last-saved time, schema
version, and origin device — and surface it on the campaign dashboard with a
manual save action.

#### Scenario: Dashboard shows last-saved time

- **GIVEN** a campaign that has been saved at least once
- **WHEN** the campaign dashboard renders
- **THEN** it SHALL display the last-saved timestamp

#### Scenario: Manual save forces an immediate write

- **GIVEN** a loaded campaign with pending changes
- **WHEN** the player triggers the manual "Save now" action
- **THEN** the store SHALL issue an immediate `PUT` without waiting for the debounce
- **AND** the save metadata SHALL update on success

