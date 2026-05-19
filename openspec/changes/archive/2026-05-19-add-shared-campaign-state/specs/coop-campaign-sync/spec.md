## ADDED Requirements

### Requirement: Campaign State Is Server-Authoritative, Not CRDT

Shared co-op campaign state SHALL be synchronized through a server-authoritative `intent → validate → commit → broadcast` loop, NOT through a CRDT. Campaign state is a transactional ledger; a single authoritative writer SHALL hold it and SHALL be the only party permitted to mutate it. The Yjs `useSyncedVaultStore` SHALL NOT be used for campaign state.

#### Scenario: Campaign mutation requires host commit

- **GIVEN** a shared co-op campaign with a host and a guest
- **WHEN** the guest takes an action that would mutate campaign state
- **THEN** the action SHALL be sent as a campaign intent to the host
- **AND** campaign state SHALL change only after the host validates and commits the resulting campaign event
- **AND** the guest SHALL NOT mutate campaign state directly

#### Scenario: Campaign state never enters the Yjs vault document

- **GIVEN** the P2P sync system's `SyncableItemType` enumeration
- **WHEN** the enumeration is inspected
- **THEN** it SHALL contain only `unit`, `pilot`, and `force`
- **AND** campaign state SHALL NOT be added as a syncable Yjs vault type

### Requirement: Campaign Event Log

The system SHALL maintain a campaign event log — an ordered, gap-free, typed record of every committed campaign mutation. Each `ICampaignEvent` SHALL carry `type`, an ascending host-assigned `sequence`, `campaignId`, `ts`, `authorPlayerId`, and a per-type `payload`. The log SHALL be persisted alongside the campaign save and SHALL be replayable to reconstruct campaign state exactly.

#### Scenario: Event log preserves order on read

- **GIVEN** a shared campaign with 20 committed campaign events
- **WHEN** the campaign event log is read
- **THEN** the returned events SHALL be ordered by ascending `sequence`
- **AND** there SHALL be no gaps in the sequence numbers

#### Scenario: Concurrent append is transactional

- **GIVEN** two concurrent appends to the campaign event log with the same `sequence`
- **WHEN** the log handles both
- **THEN** exactly one SHALL succeed
- **AND** the other SHALL be rejected with a sequence-collision error

#### Scenario: Replaying the log reconstructs campaign state

- **GIVEN** a campaign event log of committed events
- **WHEN** the log is replayed from sequence 0 into a fresh campaign state
- **THEN** the reconstructed state SHALL equal the host's authoritative campaign state

### Requirement: Campaign Event Payload Set

The system SHALL define typed campaign event payloads covering the ledger-mutating campaign decisions: `CampaignDayAdvanced`, `FundsChanged`, `PilotHired`, `ContractAccepted`, `RosterUnitChanged`, `SalvageAllocated`, and `CampaignSnapshotPublished`. Each event SHALL record the committed result, never a request. `FundsChanged` SHALL carry the resulting C-bill balance so a guest can detect a missed event. `CampaignSnapshotPublished` SHALL carry a whole-campaign state baseline.

#### Scenario: FundsChanged carries the resulting balance

- **GIVEN** a `FundsChanged` event committed by the host
- **WHEN** the event payload is inspected
- **THEN** it SHALL include the C-bill delta, a reason, and the resulting balance after the change

#### Scenario: Snapshot event carries a full baseline

- **GIVEN** a `CampaignSnapshotPublished` event
- **WHEN** the event payload is inspected
- **THEN** it SHALL contain a whole-campaign state object sufficient to initialize a guest mirror without any prior events

### Requirement: CampaignMatchHost Validates Intents Against Authoritative State

The system SHALL provide a `CampaignMatchHost` that owns one campaign's authoritative state and processes campaign intents through a closed-check, malformed-check, validate, commit, broadcast sequence. Validation SHALL test the intent against the host's current authoritative campaign state — balance for spend-type intents, faction standing for contract intents, the salvage pool for allocation intents. A rejected intent SHALL mutate nothing and SHALL return a typed `Error {code: 'INVALID_CAMPAIGN_INTENT', reason}`.

#### Scenario: Valid intent commits and broadcasts an event

- **GIVEN** a guest sends a `SpendFunds` campaign intent for an amount within the campaign balance
- **WHEN** the `CampaignMatchHost` processes it
- **THEN** the host SHALL apply the mutation to authoritative state
- **AND** the host SHALL append a `FundsChanged` event to the campaign event log
- **AND** the host SHALL broadcast the event to all connected clients

#### Scenario: Over-balance spend is rejected and mutates nothing

- **GIVEN** a campaign with a 600,000 C-bill balance
- **WHEN** a guest sends a `SpendFunds` intent for 700,000 C-bills
- **THEN** the host SHALL respond `Error {code: 'INVALID_CAMPAIGN_INTENT', reason: 'insufficient-funds'}`
- **AND** no campaign event SHALL be appended
- **AND** the campaign balance SHALL remain 600,000 C-bills

#### Scenario: Rejected intent keeps the connection open

- **GIVEN** a guest whose campaign intent was rejected by the host
- **WHEN** the rejection is delivered
- **THEN** the connection SHALL remain open
- **AND** the guest SHALL be able to send a corrected campaign intent

#### Scenario: Stale-mirror intent is validated against host state

- **GIVEN** a guest whose mirror shows a balance the host has since spent down
- **WHEN** the guest sends a `SpendFunds` intent that fits the stale balance but not the current one
- **THEN** the host SHALL validate against its current authoritative balance
- **AND** the host SHALL reject the intent with `reason: 'insufficient-funds'`

### Requirement: Guest Runs a Read-Only Campaign Mirror

In a shared co-op campaign, the guest's campaign store SHALL run as a read-only mirror, advanced solely by host-broadcast campaign events through a single `applyCampaignEvent` reducer. Any local campaign mutation path on the guest SHALL be hard-guarded and SHALL fail loudly. A solo campaign SHALL NOT be treated as a mirror.

#### Scenario: Host broadcast advances the guest mirror

- **GIVEN** a guest running a campaign mirror
- **WHEN** the host broadcasts a `CampaignDayAdvanced` event
- **THEN** the guest's mirror SHALL apply the event through `applyCampaignEvent`
- **AND** the guest's campaign day counter SHALL match the host's

#### Scenario: Guest-side local mutation is rejected

- **GIVEN** a guest running a campaign mirror
- **WHEN** a local code path attempts to mutate the guest's campaign state directly
- **THEN** the mutation SHALL be rejected by the mirror append guard
- **AND** a structured rejection reason SHALL be surfaced

#### Scenario: Solo campaign is not a mirror

- **GIVEN** a single-player campaign with no host peer recorded
- **WHEN** the mirror-identification check runs
- **THEN** the campaign SHALL NOT be treated as a mirror
- **AND** local campaign mutations SHALL proceed normally

### Requirement: Campaign Sync Session Lifecycle

The system SHALL support a campaign sync session lifecycle: a host opens a campaign for co-op and receives a room code; a guest joins with the room code, receives a `CampaignSnapshotPublished` baseline followed by the campaign event log and then live events; a guest may resync after a disconnect; and a host disconnect pauses the session. The room code SHALL use the same 6-character alphabet as the `multiplayer-server`, excluding I/O/0/1.

#### Scenario: Host opens a shared campaign

- **GIVEN** a host with an active campaign
- **WHEN** the host opens the campaign for co-op
- **THEN** the server SHALL register the campaign for sharing
- **AND** the server SHALL issue a 6-character room code excluding the characters I, O, 0, and 1

#### Scenario: Guest join receives a baseline then the log

- **GIVEN** a guest joining a shared campaign with a valid room code
- **WHEN** the join is accepted
- **THEN** the host SHALL send a `CampaignSnapshotPublished` baseline event
- **AND** the host SHALL then stream the campaign event log from sequence 0
- **AND** the host SHALL then deliver live campaign events as they are committed

#### Scenario: Guest resync streams only the missing tail

- **GIVEN** a guest that disconnected after receiving up to sequence 40
- **WHEN** the guest reconnects and requests events from sequence 41
- **THEN** the host SHALL stream only events with sequence greater than 40
- **AND** the guest mirror SHALL converge with no missing or duplicated events

#### Scenario: Large-gap resync receives a fresh snapshot

- **GIVEN** a guest whose last received sequence is far behind the current log
- **WHEN** the guest reconnects
- **THEN** the host SHALL send a fresh `CampaignSnapshotPublished` baseline
- **AND** the host SHALL resume live streaming from after that snapshot

#### Scenario: Host disconnect pauses the session

- **GIVEN** an active shared campaign session
- **WHEN** the host disconnects
- **THEN** the campaign session SHALL pause
- **AND** the guest mirror SHALL be frozen and remain read-only
