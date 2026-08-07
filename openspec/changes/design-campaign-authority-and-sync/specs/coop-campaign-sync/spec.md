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
