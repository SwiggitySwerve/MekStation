# coop-campaign-sync Delta - reconcile-multiplayer-coop-reality

## MODIFIED Requirements

### Requirement: Co-op Campaign Route Surface

The system SHALL surface co-op campaign creation, joining, and host-as-GM
review through routable URLs in the campaign page tree, so a player can
reach every co-op authority surface defined by `add-coop-campaign-play`
from the normal application navigation. Co-op create SHALL register a
server-side match and stamp the returned match id onto the host
`coopSession`; route surfaces SHALL be mounted with a runtime-backed
`proposalTransport`; and guest proposals SHALL resolve to committed,
vetoed, or mechanically-rejected rather than remaining pending forever.

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

## ADDED Requirements

### Requirement: Co-op Runtime Transport Wiring

The system SHALL wire co-op campaign create, guest proposal transport,
and mission launch onto the existing co-op core (`CampaignMatchHost`,
`CampaignGmArbiter`, `CampaignSyncSession`). Co-op create SHALL register
the match server-side; the route surface SHALL be mounted with a real
proposal transport; and co-op mission launch SHALL synchronize both
players' participation choices and route the launch through the composed
both-forces encounter entry point rather than the single-player route.

#### Scenario: Co-op create registers the match server-side

- **GIVEN** a host creates a co-op campaign via `handleCreateCoopCampaign`
- **WHEN** the create flow completes
- **THEN** the create flow SHALL register the match server-side (for
  example via `POST /api/multiplayer/matches`) and stamp the returned
  match id onto `coopSession`
- **AND** a guest's `/api/multiplayer/invites/:roomCode` lookup SHALL
  resolve to `{matchId, status: 'lobby'}` rather than 404.

#### Scenario: Guest proposal reaches the host through a real transport

- **GIVEN** `CampaignCoopRouteSurface` is mounted with a real
  `proposalTransport`
- **WHEN** a guest submits an `IGuestProposal`
- **THEN** the proposal SHALL be delivered to the host via the
  `CampaignSyncSession` / `CampaignGmArbiter` runtime bridge
- **AND** the proposal SHALL resolve to committed, vetoed, or
  mechanically-rejected through the real transport rather than the
  default unavailable transport's `session-closed` rejection.

#### Scenario: Co-op launch syncs participation and uses the composed encounter

- **GIVEN** both players have chosen their `CoopParticipationChoice`
- **WHEN** the host launches a co-op mission
- **THEN** `otherChoice` SHALL reflect the other player's pick so the
  launch gate can enable
- **AND** the launch SHALL route through the composed both-forces encounter
  entry point (`src/lib/campaign/coop/launchCoopMission.ts`) rather than the
  single-player `/gameplay/encounters/[id]` route.
