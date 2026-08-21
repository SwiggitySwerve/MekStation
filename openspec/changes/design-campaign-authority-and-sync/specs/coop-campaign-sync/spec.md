# Coop Campaign Sync (Delta)

## MODIFIED Requirements

### Requirement: Guest Runs a Read-Only Campaign Mirror

In a shared co-op campaign, the guest's campaign store SHALL run as a read-only mirror, advanced solely by host-broadcast campaign events through a single `applyCampaignEvent` reducer. Any local campaign mutation path on the guest SHALL be hard-guarded and SHALL fail loudly. A solo campaign SHALL NOT be treated as a mirror. The mirror SHALL be backed by a durable replica instance (per campaign-replication): it SHALL be persisted by the guest device's own server process keyed by the source campaign identity and grant, SHALL record replica authority metadata (source instance id, grant id, scope — a replica always knows it is not the source), and SHALL survive restart with offline read access to its already-received scoped history.

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

#### Scenario: Mirror survives guest restart as a durable replica

- **GIVEN** a guest whose mirror has applied scoped history up to per-grant sequence N
- **WHEN** the guest device restarts without connectivity to the host
- **THEN** the mirror SHALL reload its stored scoped history read-only
- **AND** it SHALL display its replica identity (shared campaign, not the source) and its disconnected status

### Requirement: Guest Join Hydrates From Host Snapshot Over Transport

When a guest joins a shared co-op campaign by room code, the system SHALL hydrate the guest's campaign mirror from the host's authoritative state delivered over the campaign-sync transport, NOT create a fresh empty local campaign. The guest-join flow SHALL open a `CampaignSyncSession`, receive the `CampaignSnapshotPublished` baseline followed by the campaign event log via `joinGuest`, and initialize `useCampaignMirrorStore` from that snapshot so the guest dashboard shows the host's funds, roster, and forces. Hydration SHALL be scope-filtered at the host per the guest's grant (per campaign-access-projection): the snapshot and the event log delivered to a guest SHALL contain only in-scope material, and a rejoining guest SHALL resume from its per-grant cursor instead of re-transferring the full history.

#### Scenario: Guest sees the host's campaign state, not an empty campaign

- **GIVEN** a host with an active co-op campaign holding a non-default C-bill balance and a roster
- **WHEN** a guest joins by the host's room code
- **THEN** the guest SHALL receive a `CampaignSnapshotPublished` baseline over the transport
- **AND** the guest's campaign mirror SHALL initialize from that snapshot
- **AND** the guest dashboard SHALL display the host's C-bill balance and roster, not a fresh empty campaign

#### Scenario: Guest mirror advances on live host events

- **GIVEN** a guest hydrated from the host snapshot
- **WHEN** the host commits a campaign mutation (for example advancing the day or a funds change)
- **THEN** the committed campaign event SHALL be delivered to the guest over the transport
- **AND** the guest mirror SHALL apply it through `applyCampaignEvent`
- **AND** the guest's displayed campaign state SHALL converge with the host's

#### Scenario: Guest join with an unknown room code fails cleanly

- **GIVEN** a guest entering a room code with no registered campaign host
- **WHEN** the join is attempted
- **THEN** the join SHALL surface a typed not-found error to the guest
- **AND** the guest SHALL NOT be dropped onto an empty mirror campaign as if the join succeeded

#### Scenario: Snapshot and log are scoped to the guest's grant

- **GIVEN** a host campaign containing GM-only events alongside campaign-wide events
- **WHEN** a guest with a player-scope grant joins
- **THEN** the snapshot baseline and event log delivered to that guest SHALL contain no GM-only material in any form
- **AND** the host GM surfaces SHALL continue to show the full history

#### Scenario: Rejoin resumes from the per-grant cursor

- **GIVEN** a guest that previously hydrated and applied scoped history to per-grant sequence N
- **WHEN** the guest rejoins the same campaign with the same grant
- **THEN** the transport SHALL resume delivery from sequence N+1 rather than re-sending the full snapshot and log
- **AND** applying the resumed stream SHALL be idempotent

### Requirement: Campaign Event Log
The system SHALL maintain an ordered, gap-free, typed journal of every committed campaign mutation. Each domain payload SHALL retain its `ICampaignEvent` type and committed result while the shared journal envelope supplies the store-assigned root-branch revision, campaign and command identities, timestamps, actor/authority identities, integrity chain, and affected-entity links. Callers SHALL provide an expected branch/revision and SHALL NOT assign the final revision. The journal SHALL be replayable to reconstruct campaign state exactly.

#### Scenario: Event log preserves order on read
- **GIVEN** a shared campaign with 20 committed campaign events
- **WHEN** the campaign root branch is read
- **THEN** events SHALL be ordered by ascending store-assigned stream revision
- **AND** there SHALL be no gaps or duplicates in that branch

#### Scenario: Concurrent append is transactional
- **GIVEN** two commands target the same expected campaign branch and revision
- **WHEN** the journal handles both
- **THEN** exactly one atomic command batch SHALL succeed
- **AND** the other SHALL receive a typed revision conflict without partial mutation

#### Scenario: Replaying the log reconstructs campaign state
- **GIVEN** a supported campaign journal and compatible imported baseline
- **WHEN** the registered campaign projector replays it into a fresh state
- **THEN** the reconstructed state and digest SHALL equal the host's authoritative campaign projection

### Requirement: Campaign Event Payload Set
The system SHALL retain typed committed-result payloads for `CampaignDayAdvanced`, `FundsChanged`, `PilotHired`, `ContractAccepted`, `RosterUnitChanged`, `SalvageAllocated`, and legacy `CampaignSnapshotPublished`. `FundsChanged` SHALL carry the resulting C-bill balance. After journal cutover, whole-campaign snapshots SHALL be derived checkpoint/materialization records and SHALL NOT be appended as competing mutation authority; legacy snapshot events SHALL remain readable only for import and compatible legacy history.

#### Scenario: FundsChanged carries the resulting balance
- **GIVEN** a `FundsChanged` event committed by the host
- **WHEN** the event payload is inspected
- **THEN** it SHALL include the C-bill delta, reason, and resulting balance

#### Scenario: Legacy snapshot becomes an honest baseline
- **GIVEN** a snapshot-only campaign or legacy `CampaignSnapshotPublished` event
- **WHEN** the campaign becomes eligible for journal shadowing
- **THEN** migration SHALL record one imported baseline with source revision and digest
- **AND** subsequent snapshots SHALL be derived materializations rather than domain mutations

### Requirement: CampaignMatchHost Validates Intents Against Authoritative State
The system SHALL provide a `CampaignMatchHost` that owns one campaign's authoritative state and processes intents through closed, malformed, active-membership, validation, decision, atomic journal append, committed projection apply, and authorized broadcast stages. Validation SHALL test against the current authoritative projection. A rejected intent SHALL mutate no campaign state or gameplay journal and SHALL return a typed error; its separate private action-audit behavior is governed by the authority-audit/privacy change.

#### Scenario: Valid intent commits before apply and broadcast
- **GIVEN** an authorized player submits a `SpendFunds` intent within the current campaign balance
- **WHEN** the host processes it
- **THEN** the host SHALL derive and atomically append the entire committed event batch and expected post-state digest at the expected revision
- **AND** only after committed apply produces that digest SHALL it broadcast authorized projections

#### Scenario: Over-balance spend is rejected and mutates nothing
- **GIVEN** a campaign with a 600,000 C-bill balance
- **WHEN** an authorized player submits a `SpendFunds` intent for 700,000 C-bills
- **THEN** the host SHALL return `Error {code: 'INVALID_CAMPAIGN_INTENT', reason: 'insufficient-funds'}`
- **AND** no campaign event, outbox row, or projection mutation SHALL occur

#### Scenario: Rejected intent keeps the connection open
- **GIVEN** an authorized player whose campaign intent was rejected
- **WHEN** the rejection is delivered
- **THEN** the connection SHALL remain open
- **AND** the player SHALL be able to submit a corrected intent with a new or policy-approved retry identity

#### Scenario: Stale-mirror intent is validated against committed state
- **GIVEN** a player's mirror shows a balance the host has since spent down
- **WHEN** the player submits a spend that fits the stale mirror but not the current projection
- **THEN** the host SHALL validate against the committed authoritative projection
- **AND** it SHALL reject without appending or overwriting the intervening fact

## ADDED Requirements

### Requirement: Campaign Commands Commit as Durable Atomic Batches
The campaign authority SHALL validate a stable command identity and expected campaign revision, derive the complete event batch plus expected post-state digest, and atomically append both. It SHALL update the process-local projection from the committed batch, verify the applied digest, and only then fan out authorized results.

#### Scenario: Pilot hire changes funds and roster
- **WHEN** a valid hire command derives both a funds event and a personnel event
- **THEN** both events SHALL commit in one batch or neither SHALL commit
- **AND** clients SHALL not observe an intermediate partial campaign state

#### Scenario: Committed campaign batch produces an unexpected projection
- **WHEN** the applied campaign digest differs from the expected digest retained by the commit receipt
- **THEN** the host SHALL publish no success and SHALL quarantine the process-local projection
- **AND** it SHALL rebuild from the durable journal without deleting or compensating the committed batch

### Requirement: Customized Units Preserve Durable Instance Lineage
A customized unit adopted into a campaign SHALL receive or retain a durable instance identity distinct from its canonical source design. Authorized customization, force, mission, readiness, combat-reference, and later-session events SHALL link to that instance.

#### Scenario: Customized unit survives reload and mission handoff
- **WHEN** a player customizes a canonical unit, saves and reloads it, adopts it into a force, and reaches mission readiness
- **THEN** journal links and campaign projection SHALL identify the same durable unit instance
- **AND** its accepted weight, tech base, engine, gyro, armor, equipment, critical slots, and temporal metadata SHALL remain consistent

### Requirement: Campaign History Survives Authority Restart
Campaign history, participant cursors, and projection head SHALL be durable across process restart.

#### Scenario: Two players reconnect after restart
- **WHEN** the campaign host restarts with both players behind
- **THEN** each player SHALL resume from its durable authorized cursor
- **AND** both SHALL converge without creating a fresh empty campaign log
