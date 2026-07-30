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

## MODIFIED Requirements

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
