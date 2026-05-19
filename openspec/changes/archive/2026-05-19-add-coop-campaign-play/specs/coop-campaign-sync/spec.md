## ADDED Requirements

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
