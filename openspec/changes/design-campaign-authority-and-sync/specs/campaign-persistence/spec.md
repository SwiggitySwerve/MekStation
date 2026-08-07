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
