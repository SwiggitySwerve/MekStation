# coop-campaign-sync — Delta for prove-live-coop-campaign-journey

## MODIFIED Requirements

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

## ADDED Requirements

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
