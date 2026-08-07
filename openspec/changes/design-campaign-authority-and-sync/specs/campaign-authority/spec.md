# Campaign Authority

## ADDED Requirements

### Requirement: Every campaign has exactly one source instance, owned by a server
A campaign SHALL be owned by exactly one source instance, hosted by the server process on the device that created it (or a device the source has been explicitly migrated to). The source instance SHALL be the only place campaign commands execute and the only authority for campaign state. Browser storage SHALL NOT be an authoritative home for any campaign state.

#### Scenario: Deep link resolves from the server, not browser storage
- **WHEN** any client (including a browser context that has never seen the campaign) navigates to a campaign route on the owning server
- **THEN** the campaign SHALL load from the server-side store, and the "Campaign not found" outcome SHALL occur only when the server genuinely does not own and does not replicate that campaign id

#### Scenario: A replica can never silently become a source
- **WHEN** an instance whose authority metadata says `replica` attempts to execute a campaign command locally
- **THEN** the command SHALL be rejected (or forwarded to the source) and the replica SHALL NOT append to the authoritative stream

### Requirement: All campaign mutations are commands appended to a durable event stream
Every campaign mutation SHALL be expressed as a command that the source validates and converts into one or more events appended to the campaign's event stream in the server-side event journal (stream type `campaign`, stream id = campaign id). The append SHALL be durable (fsynced by the journal) before the command is acknowledged to its submitter and before any broadcast occurs. Campaign state SHALL be a projection of the stream; the stream, not the projection, is the source of truth.

#### Scenario: Durable-before-acknowledge ordering
- **WHEN** a client submits a campaign command (advance day, accept contract, hire pilot, commit travel) and the process crashes immediately after acknowledgement
- **THEN** on restart the acknowledged events SHALL be present in the journal and reflected in the reprojected campaign state

#### Scenario: Command validation happens at the source only
- **WHEN** a command referencing state the submitter cannot see, or violating campaign rules, is submitted
- **THEN** the source SHALL reject it with a typed error and SHALL NOT append any event

### Requirement: The event stream is hash-chained and tamper-evident
Campaign events SHALL be appended through the existing canonical event journal so that each event carries the digest of its predecessor and a digest of its own canonical bytes. Any consumer SHALL be able to verify the chain of the stream (or of its scope-filtered projection, per campaign-access-projection) without trusting the transport.

#### Scenario: Chain verification detects a mutated historical event
- **WHEN** any stored event's payload is altered after append
- **THEN** chain verification SHALL fail at that event and the instance SHALL surface a corruption error rather than serving the altered history

### Requirement: Client storage is a cache, never a source
Clients (browser stores and packaged-app local stores for replicas' UI) MAY cache campaign projections keyed by instance id and stream revision for fast load and offline reading. On load, a cached projection SHALL be validated against the owning instance's stream head; a stale or divergent cache SHALL be replaced by replay/refetch, never merged by field.

#### Scenario: Stale cache is refreshed, not trusted
- **WHEN** a client with a cached projection at revision N connects to an instance whose stream head is revision M > N
- **THEN** the client SHALL apply events N+1..M (or refetch the projection) before rendering authoritative state

### Requirement: Existing browser-local campaigns are adopted, not stranded
The implementation SHALL provide a one-time adoption path that imports a browser-persisted campaign into the server store as the source instance, preserving its observable state, and thereafter demotes the browser copy to cache.

#### Scenario: Legacy campaign adoption
- **WHEN** a device with a pre-existing browser-persisted campaign loads the campaigns index after this capability ships
- **THEN** the campaign SHALL be offered for adoption into the local server store and, once adopted, SHALL deep-link correctly from any client of that server
