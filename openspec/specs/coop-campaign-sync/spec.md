# coop-campaign-sync Specification

## Purpose

Defines Coop Campaign Sync requirements for Campaign State Is Server-Authoritative, Not CRDT, Campaign Event Log, Campaign Event Payload Set, and CampaignMatchHost Validates Intents Against Authoritative State, preserving the source-of-truth scope introduced by archived change add-shared-campaign-state.
## Requirements
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

### Requirement: Co-op Mission Launch With Both Forces

The system SHALL launch a co-op campaign mission as one encounter composed from both players' selected forces, assigned to a shared `GameSide` against the encounter's OpFor. The composed encounter SHALL be run through the existing `ServerMatchHost` server-authoritative combat loop. Each deploying player SHALL own and command only their own units; an intent for a unit a player does not own SHALL be rejected.

#### Scenario: Co-op encounter contains both rosters

- **GIVEN** a co-op campaign mission with two players, each contributing a force
- **WHEN** the mission is launched
- **THEN** the resulting encounter SHALL contain the units of both forces
- **AND** both forces SHALL be assigned to the same side against the encounter OpFor

#### Scenario: Co-op encounter runs through the existing combat host

- **GIVEN** a composed co-op encounter
- **WHEN** the encounter starts
- **THEN** it SHALL be run by `ServerMatchHost`
- **AND** no new combat transport SHALL be introduced for co-op play

#### Scenario: Cross-player unit intent is rejected

- **GIVEN** a co-op encounter with two deploying players
- **WHEN** one player sends a combat intent for a unit owned by the other player
- **THEN** the host SHALL reject the intent as unauthorized
- **AND** no event SHALL be appended for that intent

### Requirement: Per-Mission Participation Choice

The system SHALL allow each player, before a co-op mission launches, to choose a `CoopParticipationChoice` of `deploy` or `command-hq`. A `deploy` player's force enters the encounter and the player plays it on the tactical map. A `command-hq` player does not take the map and retains access to campaign-management surfaces while the battle runs. A co-op mission launch where no player chose `deploy` SHALL be blocked.

#### Scenario: Player deploys onto the map

- **GIVEN** a player who chose `deploy` for a co-op mission
- **WHEN** the mission launches
- **THEN** the player's force SHALL enter the encounter
- **AND** the player SHALL command that force on the tactical map

#### Scenario: Command-HQ player keeps campaign access

- **GIVEN** a player who chose `command-hq` for a co-op mission
- **WHEN** the mission's encounter is running
- **THEN** the player SHALL NOT be placed on the tactical map
- **AND** the player SHALL retain access to campaign-management surfaces

#### Scenario: Mission with no deploying player is blocked

- **GIVEN** a co-op mission where both players chose `command-hq`
- **WHEN** a launch is attempted
- **THEN** the launch SHALL be blocked with a clear error
- **AND** no encounter SHALL be created

### Requirement: Host-as-GM Authority Model

The host of a shared campaign SHALL be the campaign Game Master and SHALL be the single campaign-write authority. The guest SHALL be a co-op player with no campaign-write authority. A guest campaign action SHALL be submitted as an `IGuestProposal` wrapping a CO1 `ICampaignIntent`, and SHALL NOT commit a campaign event until the GM resolves the proposal with an `approve` decision.

#### Scenario: Guest action is a proposal, not a commit

- **GIVEN** a guest in a shared campaign taking a campaign action
- **WHEN** the action is submitted
- **THEN** it SHALL be sent as an `IGuestProposal` to the host
- **AND** no campaign event SHALL be committed until the GM approves the proposal

#### Scenario: Approved proposal commits and broadcasts

- **GIVEN** a guest proposal the GM resolves with `approve`
- **WHEN** the decision is applied
- **THEN** the underlying CO1 campaign intent SHALL be committed and broadcast as a campaign event
- **AND** both the host and the guest mirror SHALL converge on the resulting state

#### Scenario: Guest holds no campaign-write authority

- **GIVEN** a shared campaign with a host and a guest
- **WHEN** the guest attempts to commit a campaign change without a GM-approved proposal
- **THEN** the change SHALL NOT be applied
- **AND** the host SHALL remain the single campaign-write authority

### Requirement: GM Arbitration Modes

The campaign SHALL carry a `GmArbitrationMode` of `auto-approve` or `host-review`. In `auto-approve` mode, a guest proposal that passes CO1 mechanical validation SHALL be committed immediately with no host interaction. In `host-review` mode, a guest proposal that passes CO1 mechanical validation SHALL be surfaced to the host for an explicit `approve` or `veto`. In both modes CO1 mechanical validation SHALL run first, and a proposal that fails it SHALL be rejected before the host reviews it.

#### Scenario: Auto-approve commits without a host step

- **GIVEN** a campaign in `auto-approve` mode
- **WHEN** a guest submits a proposal that passes CO1 mechanical validation
- **THEN** the proposal SHALL be committed immediately
- **AND** the host SHALL NOT be asked to review it

#### Scenario: Host-review waits for the host

- **GIVEN** a campaign in `host-review` mode
- **WHEN** a guest submits a proposal that passes CO1 mechanical validation
- **THEN** the proposal SHALL be surfaced to the host as pending
- **AND** it SHALL NOT commit until the host issues an `approve` decision

#### Scenario: Mechanical validation precedes host review

- **GIVEN** a campaign in `host-review` mode
- **WHEN** a guest submits a `SpendFunds` proposal for an amount over the campaign balance
- **THEN** the proposal SHALL be rejected by CO1 mechanical validation with `INVALID_CAMPAIGN_INTENT`
- **AND** the proposal SHALL NOT appear in the host's review surface

### Requirement: GM Veto Is a Typed Non-Committing Result

The GM SHALL be able to resolve a guest proposal with a `veto` decision. A veto SHALL commit no campaign event and SHALL return a typed rejection `Error {code: 'PROPOSAL_VETOED'}`, distinct from CO1's mechanical `INVALID_CAMPAIGN_INTENT`. The connection SHALL remain open and the guest SHALL be able to submit a different proposal.

#### Scenario: Veto commits nothing

- **GIVEN** a guest proposal the GM resolves with `veto`
- **WHEN** the decision is applied
- **THEN** no campaign event SHALL be committed
- **AND** the guest SHALL receive `Error {code: 'PROPOSAL_VETOED'}`

#### Scenario: Veto is distinct from a mechanical rejection

- **GIVEN** a guest that received a `veto` and another that received an `INVALID_CAMPAIGN_INTENT`
- **WHEN** the guest UI classifies each result
- **THEN** the `veto` SHALL be presented as a GM decision
- **AND** the `INVALID_CAMPAIGN_INTENT` SHALL be presented as an impossible action

#### Scenario: Connection survives a veto

- **GIVEN** a guest whose proposal was vetoed
- **WHEN** the veto is delivered
- **THEN** the connection SHALL remain open
- **AND** the guest SHALL be able to submit a different proposal

### Requirement: Guest Proposal Feedback Surface

A guest submitting an `IGuestProposal` SHALL see a pending indicator on that action until the proposal resolves, and a duplicate submission of the same action SHALL be disabled while it is pending. On resolution the guest SHALL be shown whether the proposal committed a campaign event, was vetoed, or failed mechanical validation.

#### Scenario: Pending indicator while a proposal is unresolved

- **GIVEN** a guest who submitted a campaign proposal
- **WHEN** the proposal has not yet resolved
- **THEN** the action SHALL show a pending indicator
- **AND** a duplicate submission of that action SHALL be disabled

#### Scenario: Indicator clears on resolution

- **GIVEN** a guest with a pending proposal
- **WHEN** the proposal resolves with a committed event, a veto, or a mechanical rejection
- **THEN** the pending indicator SHALL clear
- **AND** the resolution outcome SHALL be surfaced to the guest

### Requirement: Host GM Review Surface

In `host-review` mode the host SHALL be presented with a review surface listing pending guest proposals. Each pending proposal SHALL be shown with the campaign context needed to decide — the current C-bill balance, the relevant faction standing, and the roster effect. The host SHALL be able to `approve` or `veto` each proposal from this surface.

#### Scenario: Review surface lists pending proposals with context

- **GIVEN** a campaign in `host-review` mode with two pending guest proposals
- **WHEN** the host opens the GM review surface
- **THEN** both proposals SHALL be listed
- **AND** each SHALL show the current balance, the relevant standing, and the roster effect

#### Scenario: Host decides from the review surface

- **GIVEN** a pending proposal on the host's review surface
- **WHEN** the host selects `approve`
- **THEN** the proposal's CO1 campaign intent SHALL be committed and broadcast
- **WHEN** the host selects `veto` on another proposal
- **THEN** that proposal SHALL commit nothing and the guest SHALL receive `PROPOSAL_VETOED`

### Requirement: Co-op Post-Battle Reconciliation

When a co-op encounter resolves, its campaign-level consequences — salvage, funds change, roster change, and pilot XP — SHALL be reconciled into the shared campaign by emitting CO1 campaign events through the `CampaignMatchHost`. Both a deploying player and a `command-hq` player SHALL receive these events through their CO1 campaign mirror and SHALL converge on the same post-battle campaign state. The co-op combat event log and the campaign event log SHALL remain separate, linked by id.

#### Scenario: Post-battle consequences become campaign events

- **GIVEN** a resolved co-op encounter that produced salvage and a funds change
- **WHEN** the encounter is reconciled into the campaign
- **THEN** the consequences SHALL be emitted as CO1 campaign events through the `CampaignMatchHost`
- **AND** the events SHALL be appended to the campaign event log

#### Scenario: Both players converge on the post-battle state

- **GIVEN** a co-op mission with one deploying player and one `command-hq` player
- **WHEN** the encounter resolves and is reconciled
- **THEN** both players' CO1 campaign mirrors SHALL receive the same post-battle campaign events
- **AND** both players SHALL converge on the same post-battle campaign state

#### Scenario: Combat and campaign logs stay separate

- **GIVEN** a resolved co-op encounter
- **WHEN** the combat event log and the campaign event log are inspected
- **THEN** they SHALL be distinct logs linked by id
- **AND** combat events SHALL NOT be merged into the campaign event log

### Requirement: Co-op Campaign Route Surface

The system SHALL surface co-op campaign creation, joining, and host-as-GM review through routable URLs in the campaign page tree, so a player can reach every co-op authority surface defined by `add-coop-campaign-play` from the normal application navigation.
Co-op create SHALL register a server-side match and stamp the returned match id onto the host `coopSession`; route surfaces SHALL be mounted with a runtime-backed `proposalTransport`; and guest proposals SHALL resolve to committed, vetoed, or mechanically-rejected rather than remaining pending forever.

**Priority**: High

#### Scenario: Host creates a co-op campaign from the campaign list

**GIVEN** a user on `/gameplay/campaigns` with an unlocked vault identity
**WHEN** they click "Create Co-op Campaign", enter a name, and submit
**THEN** the system SHALL register a server-side match and mint a campaign with `coopSession = { mode: 'host', roomCode: <generated>, matchId: <server match id> }`
**AND** the user SHALL be navigated to `/gameplay/campaigns/[id]` with the `Co-op session: Host` badge visible
**AND** the host campaign SHALL open a CO1 runtime session using that server match id and room code

#### Scenario: Guest joins a co-op campaign via room code

**GIVEN** a host has created a co-op campaign and shared its room code
**WHEN** a second user on `/gameplay/campaigns` clicks "Join Co-op Campaign" and enters the host's room code
**THEN** the system SHALL resolve the invite via the existing multiplayer invite endpoint to `{matchId, status: 'lobby'}`
**AND** the guest SHALL receive the host's current campaign snapshot via CO1's session-lifecycle protocol
**AND** the guest SHALL be navigated to `/gameplay/campaigns/[id]` with `coopSession = { mode: 'guest', hostMatchId }` and the `Co-op session: Guest` badge visible
**AND** every campaign-mutating control on the page tree SHALL submit `IGuestProposal` instead of mutating campaign state directly

#### Scenario: Host-review surface mounts on the campaign dashboard

**GIVEN** a host-mode co-op campaign with arbitration mode `'host-review'`
**WHEN** the host loads `/gameplay/campaigns/[id]`
**THEN** the campaign dashboard SHALL render `<HostGmReviewSurface>` with the current pending-proposal queue
**AND** the surface SHALL update in real-time as guest proposals arrive via the CO1 runtime bridge
**AND** clicking `approve` or `veto` on a proposal SHALL invoke the existing `CampaignMatchHost` arbitration path

#### Scenario: Guest mission launch shows the participation picker

**GIVEN** a guest-mode co-op campaign with an active contract and a launchable mission
**WHEN** either player navigates to `/gameplay/campaigns/[id]/missions/[missionId]/launch`
**THEN** the system SHALL mount `<CoopParticipationPicker>` requiring each player to choose `deploy` or `command-hq` before the launch button enables
**AND** the existing zero-`deploy` block rule from `add-coop-campaign-play` SHALL fire if neither player chose deploy
**AND** a non-co-op campaign SHALL skip the picker and launch directly (existing behavior preserved)

#### Scenario: Guest proposal reaches the host through the runtime transport

**GIVEN** a guest-mode co-op campaign on a mutation route
**WHEN** the guest submits an `IGuestProposal`
**THEN** the proposal SHALL be delivered through the runtime-backed `CampaignSyncSession` / `CampaignGmArbiter` bridge
**AND** the proposal SHALL resolve to committed, vetoed, or mechanically-rejected through that real transport rather than the default unavailable transport's `session-closed` rejection

#### Scenario: Co-op launch syncs participation and uses the composed encounter

**GIVEN** both co-op players have chosen their `CoopParticipationChoice`
**WHEN** the host launches a co-op mission
**THEN** `otherChoice` SHALL reflect the other player's pick so the launch gate can enable
**AND** the launch SHALL route through the composed both-forces encounter entry point (`src/lib/campaign/coop/launchCoopMission.ts`) rather than the single-player `/gameplay/encounters/[id]` route

#### Scenario: Single-player campaign mounts neither co-op surface

**GIVEN** a campaign with `coopSession === undefined`
**WHEN** any user navigates the campaign page tree
**THEN** the system SHALL NOT render `<HostGmReviewSurface>`, `<GuestProposalSurface>` overlays, or `<CoopParticipationPicker>`
**AND** every campaign-mutating control SHALL behave as it did before this change (direct store action, no proposal submission)

### Requirement: Co-op Runtime Transport Wiring

The system SHALL wire co-op campaign create, guest join, guest proposal transport, participation sync, and mission launch onto the existing co-op core (`CampaignMatchHost`, `CampaignGmArbiter`, `CampaignSyncSession`) through a **real cross-process transport** — the authenticated multiplayer WebSocket server (`server.js`), NOT a per-browser in-memory map. The authoritative CO1 campaign host SHALL run in the server process behind a matchId-keyed registry, so that a host browser and a guest browser in two separate processes converge on the same campaign state. Co-op create SHALL register the campaign host server-side; the route surface SHALL be mounted with a proposal transport backed by that server host; and co-op mission launch SHALL synchronize both players' participation choices across the transport and route the launch through the composed both-forces encounter entry point rather than the single-player route.

#### Scenario: Co-op create registers the server-resident campaign host

- **GIVEN** a host creates a co-op campaign via `handleCreateCoopCampaign`
- **WHEN** the create flow completes
- **THEN** the create flow SHALL register the match server-side (for example via `POST /api/multiplayer/matches`) and stamp the returned match id onto `coopSession`
- **AND** the server SHALL hold the authoritative `CampaignMatchHost` for that match id in its campaign-host registry
- **AND** a guest's `/api/multiplayer/invites/:roomCode` lookup SHALL resolve to `{matchId, status: 'lobby'}` rather than 404

#### Scenario: Guest proposal reaches the host through the real WebSocket transport

- **GIVEN** a guest-mode co-op campaign in a separate browser process from the host
- **WHEN** the guest submits an `IGuestProposal`
- **THEN** the proposal SHALL be delivered to the server-resident `CampaignGmArbiter` over the WebSocket transport
- **AND** the proposal SHALL resolve to committed, vetoed, or mechanically-rejected — in `host-review` mode the host's `approve`/`veto` decision SHALL round-trip to the host browser and back
- **AND** the proposal SHALL NOT resolve to the in-memory transport's `session-closed` rejection

#### Scenario: Co-op launch syncs participation across browsers and uses the composed encounter

- **GIVEN** both players have chosen their `CoopParticipationChoice` in separate browser processes
- **WHEN** each player publishes their choice
- **THEN** the other player's `otherChoice` SHALL reflect that pick over the transport so the launch gate can enable
- **AND** the launch SHALL route through the composed both-forces encounter entry point (`src/lib/campaign/coop/launchCoopMission.ts`) rather than the single-player `/gameplay/encounters/[id]` route

### Requirement: Host-Review Proposal Timeout

The host-as-GM arbiter SHALL auto-veto a `pending` guest proposal that sits unanswered for longer than a configurable timeout, so the guest's pending-proposal indicator resolves even if the host disconnects or simply forgets to decide.

**Priority**: Medium

#### Scenario: Unanswered proposal auto-vetoes after timeout

**GIVEN** a host-mode co-op campaign with `arbitrationMode: 'host-review'`
**AND** a guest has submitted a proposal that has been `pending` for longer than the configured `proposalTimeoutMs` (default 5 minutes)
**WHEN** the arbiter's timeout watchdog fires
**THEN** the system SHALL resolve the proposal with `{ decision: 'veto', reason: 'host-review-timeout' }`
**AND** the guest's `<GuestProposalSurface>` SHALL transition from pending to vetoed with the timeout reason surfaced
**AND** the auto-veto SHALL be visually distinct from a host-driven veto (different reason badge)

#### Scenario: Timeout is configurable per arbiter instance

**GIVEN** an integrator constructs `new CampaignGmArbiter({ proposalTimeoutMs: 30_000 })`
**WHEN** a proposal sits pending for 35 seconds
**THEN** the arbiter SHALL auto-veto with `reason: 'host-review-timeout'`
**AND** the same proposal under the default 5-minute timeout SHALL still be pending

#### Scenario: A host decision before the timeout fires prevents the auto-veto

**GIVEN** a proposal is pending
**WHEN** the host clicks `approve` or `veto` before the timeout fires
**THEN** the arbiter SHALL emit the host's decision normally
**AND** the timeout watchdog SHALL NOT fire (the proposal is no longer pending)

### Requirement: Campaign GM Ledger Respects Host Authority

The co-op campaign route surface SHALL treat the host as the campaign GM and the guest as a player mirror for GM ledger controls. Guest mirrors SHALL NOT expose controls that preview, approve, manually take over, or reveal GM-private campaign correction context.

#### Scenario: Host sees campaign GM ledger controls

- **GIVEN** a co-op campaign with `coopSession.mode === 'host'`
- **WHEN** the campaign command navigation renders
- **THEN** the GM Ledger route SHALL be visible
- **AND** the GM Ledger page SHALL render preview, approval, and manual-takeover controls

#### Scenario: Guest sees only player-safe ledger projection

- **GIVEN** a co-op campaign with `coopSession.mode === 'guest'`
- **WHEN** the guest deep-links to `/gameplay/campaigns/[id]/gm-ledger`
- **THEN** the page SHALL omit GM preview, approval, and manual-takeover controls
- **AND** it SHALL omit GM-private ledger projection
- **AND** it SHALL show only player-public ledger summaries and an authority explanation

### Requirement: Co-op campaign command authority projection
Co-op campaign command screens SHALL map host and guest roles into the shared command-screen authority model. Hosts SHALL see authoritative campaign and GM controls for owned campaigns, while guests SHALL see proposal, normal player action, and public-result views only.

#### Scenario: Host sees authoritative campaign commands
- **WHEN** a host opens a co-op campaign command screen
- **THEN** the screen SHALL expose host-authorized preview, approve, veto, manual takeover, and GM correction controls for commands that affect campaign state

#### Scenario: Guest sees proposal or public command path
- **WHEN** a guest opens the same co-op campaign command screen
- **THEN** the screen SHALL hide host-only and GM-private controls and SHALL route mutating actions through proposal or validated player command paths

### Requirement: Co-op player-safe GM result projection
Co-op campaign GM interventions SHALL project public net effects to guests while preserving private rationale and full correction details for authorized host or owner GM views.

#### Scenario: Guest receives redacted intervention result
- **WHEN** the host commits a GM campaign intervention in a co-op campaign
- **THEN** the guest SHALL receive a public command result that explains the net effect and SHALL NOT receive private GM rationale or hidden correction context

### Requirement: Guest Join Hydrates From Host Snapshot Over Transport

When a guest joins a shared co-op campaign by room code, the system SHALL hydrate the guest's campaign mirror from the host's authoritative state delivered over the campaign-sync transport, NOT create a fresh empty local campaign. The guest-join flow SHALL open a `CampaignSyncSession`, receive the `CampaignSnapshotPublished` baseline followed by the campaign event log via `joinGuest`, and initialize `useCampaignMirrorStore` from that snapshot so the guest dashboard shows the host's funds, roster, and forces.

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

### Requirement: Cross-Browser Participation Sync

The system SHALL propagate each co-op player's `CoopParticipationChoice` to the other player over the campaign-sync transport, so that the mission-launch gate (`bothChosen`) can enable when host and guest run in separate browser processes. Participation state SHALL NOT depend on a per-process in-memory map that only converges within a single browser tab.

#### Scenario: Both players' choices converge across two browsers

- **GIVEN** a host and a guest on the same co-op mission launch route in separate browser processes
- **WHEN** the host chooses `deploy` and the guest chooses `command-hq`
- **THEN** the host SHALL observe the guest's `command-hq` choice as `otherChoice`
- **AND** the guest SHALL observe the host's `deploy` choice as `otherChoice`
- **AND** the launch gate SHALL enable because at least one player chose `deploy`

#### Scenario: Post-battle campaign consequences reach the guest mirror

- **GIVEN** a co-op mission resolved with a funds change, salvage, and a roster change
- **WHEN** the host reconciles the outcome into the shared campaign
- **THEN** the resulting `FundsChanged`, `SalvageAllocated`, and `RosterUnitChanged` events SHALL be delivered to the guest over the transport
- **AND** the guest mirror SHALL converge on the same post-battle funds, salvage pool, and roster as the host

### Requirement: Host Mutations Persist and Propagate

A host-committed campaign mutation in an active co-op session SHALL be persisted to the shared campaign record before the host UI presents it as committed, and connected guests SHALL observe the mutation — at minimum on refetch, and via the campaign sync channel where connected. A persistence failure (including an optimistic-concurrency conflict) SHALL be surfaced to the acting user and SHALL NOT leave the host UI presenting unpersisted state as committed.

#### Scenario: Host day advance reaches the guest

- **GIVEN** an active co-op session with a connected guest
- **WHEN** the host advances the campaign day
- **THEN** the shared campaign record SHALL reflect the new date
- **AND** the guest SHALL observe the new date (on refetch at minimum; via sync push when connected)

#### Scenario: Persistence conflict is loud

- **GIVEN** the campaign persistence write returns a conflict (409) for a host mutation
- **WHEN** automatic resolution (refresh-and-retry against host-authoritative state) does not succeed
- **THEN** the acting user SHALL see an error state
- **AND** the local UI SHALL NOT present the mutation as committed

### Requirement: Host Post-Battle Reconciliation Routes Over the Campaign-Sync Transport

When a co-op campaign **host** resolves a battle, the post-battle campaign consequences — the funds change, salvage value, and roster changes derived as `ICoopBattleConsequences` — SHALL be reconciled into the shared campaign by sending a single `ReconcileBattle` host-intent over the campaign-sync transport to the **server-resident** `CampaignMatchHost`, and SHALL NOT be applied to a browser-local `CampaignMatchHost`. The server SHALL decompose the `ReconcileBattle` intent through the authoritative `reconcileCoopBattle` path so the resulting `FundsChanged`, `SalvageAllocated`, and `RosterUnitChanged` events are appended to the shared campaign event log and broadcast to every connected guest mirror.

The reconciliation SHALL be idempotent per resolved battle: a duplicate `ReconcileBattle` for a battle already reconciled on the server SHALL commit no additional campaign events. `ReconcileBattle` SHALL be carried on the host-intent wire frame only and SHALL NOT be added to the guest-facing campaign-intent validation set.

When no host-role campaign-sync transport is connected, the host reconciliation SHALL degrade to a locally-persisted outcome plus a surfaced notice, and SHALL NOT route the reconciliation into a disconnected browser-local `CampaignMatchHost`. A single-player campaign SHALL be unaffected by this routing.

#### Scenario: Host reconciliation reaches the guest mirror live

- **GIVEN** a co-op campaign with a host and a connected guest in a separate browser process
- **AND** an active host-role campaign-sync transport for the match
- **WHEN** a co-op battle resolves and the host reconciles its outcome
- **THEN** the host SHALL send a single `ReconcileBattle` host-intent over the transport rather than mutating a browser-local `CampaignMatchHost`
- **AND** the server-resident `CampaignMatchHost` SHALL commit the resulting `FundsChanged`, `SalvageAllocated`, and `RosterUnitChanged` events to the shared campaign event log
- **AND** those events SHALL be broadcast to the guest so the guest mirror converges on the same post-battle funds, salvage pool, and roster **without a reload**

#### Scenario: Duplicate reconciliation is idempotent

- **GIVEN** a host that has already reconciled a resolved battle's outcome over the transport
- **WHEN** a second `ReconcileBattle` host-intent for the **same** resolved battle reaches the server (for example after a host reconnect or a duplicated frame)
- **THEN** the server SHALL treat it as a no-op acknowledgement
- **AND** no additional `FundsChanged`, `SalvageAllocated`, or `RosterUnitChanged` events SHALL be committed
- **AND** the guest mirror's funds, salvage pool, and roster SHALL be unchanged from the first reconciliation

#### Scenario: No-transport reconciliation degrades without touching a disconnected registry

- **GIVEN** a host-mode co-op campaign whose host-role campaign-sync transport is not connected
- **WHEN** a co-op battle resolves and the host reconciles its outcome
- **THEN** the outcome SHALL remain locally persisted and a notice SHALL be surfaced to the host that the live push is unavailable
- **AND** the reconciliation SHALL NOT be applied to a disconnected browser-local `CampaignMatchHost`
- **AND** when the transport reconnects or the guest rejoins, the guest SHALL converge on the host's post-battle state via the snapshot/refetch path

#### Scenario: Single-player campaign is unaffected

- **GIVEN** a single-player campaign with `coopSession === undefined`
- **WHEN** a battle resolves and its outcome is reconciled into the campaign
- **THEN** the reconciliation SHALL proceed through the existing single-player post-battle path
- **AND** no `ReconcileBattle` host-intent SHALL be sent
- **AND** the campaign's funds, salvage, and roster SHALL update exactly as they did before this change

### Requirement: Co-op Creation Onboarding Affordances

The co-op campaign create surface SHALL disclose that one-click creation applies defaults (Mercenary faction, Standard preset, empty roster) through a static skip-notice, so a player understands that name, faction, preset, and roster were defaulted and can be configured from the campaign dashboard after creation. On a vault-identity (token-mint) failure, the surface SHALL present a link to vault settings (`/settings#vault`) in the error notice for both the create and join paths. The vault-settings link SHALL be gated to the identity / token-mint step, so that non-identity failures — invite-code lookup and match creation (POST) — retain generic error copy without the vault link.

**Rationale**: Co-op creation ships create-first with hardcoded defaults and no notice, and vault-identity failures render as raw error strings with no affordance, even though `/settings#vault` already deep-links to the vault section. Mislabeling non-identity errors as vault problems would train users to change the wrong setting.

**Priority**: Medium

#### Scenario: Skip-notice describes the applied defaults

- **GIVEN** a user on the co-op campaign entry surface
- **WHEN** the Create Co-op button is displayed
- **THEN** a static skip-notice SHALL be shown near the button describing the applied defaults (Mercenary faction, Standard preset, empty roster)
- **AND** the notice SHALL indicate the campaign can be renamed and configured from the dashboard after creation

#### Scenario: Vault-identity failure surfaces the settings link

- **GIVEN** a user creating or joining a co-op campaign
- **WHEN** the vault-identity token mint fails
- **THEN** the error notice SHALL include a link to `/settings#vault`
- **AND** the link SHALL be shown for both the create-error and join-error paths

#### Scenario: Non-identity failure keeps generic copy

- **GIVEN** a user creating or joining a co-op campaign
- **WHEN** the failure is a non-identity error (invite-code lookup or match creation POST)
- **THEN** the error notice SHALL retain generic copy
- **AND** it SHALL NOT include the vault-settings link

