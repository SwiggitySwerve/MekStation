# multiplayer-server — Delta for prove-live-coop-campaign-journey

## ADDED Requirements

### Requirement: Co-op Campaign Sync Channel

The multiplayer WebSocket transport SHALL carry co-op campaign-sync frames in addition to combat-match frames, dispatched to a server-resident co-op campaign host registry that holds one `CampaignMatchHost` / `CampaignSyncSession` / `CampaignGmArbiter` per shared campaign match id. The campaign-sync channel SHALL reuse the existing authenticated upgrade path and the `bindMultiplayerSocketConnection` pattern — no new port and no second server process. Frame kinds SHALL cover: `CampaignJoin` (guest join by match id), `CampaignSnapshot` (`CampaignSnapshotPublished` baseline), campaign `CampaignEvent` (committed `ICampaignEvent`), `CampaignProposal` (guest `IGuestProposal`), `CampaignDecision` (GM `approve`/`veto`), and `CampaignParticipation` (a player's `CoopParticipationChoice`). Every campaign-sync frame kind SHALL be added to the message-envelope schema with an exhaustiveness check that fails loudly (a runtime assertion, not silent enum widening) on an unknown kind.

#### Scenario: Guest joins a campaign match and receives the baseline then live events

- **GIVEN** a server-resident campaign host registered for match `camp_abc`
- **WHEN** a guest opens a WebSocket to the multiplayer endpoint and sends `{kind: 'CampaignJoin', matchId: 'camp_abc', playerId, lastSeq: 0}`
- **THEN** the server SHALL validate the player against the match
- **AND** the server SHALL send a `CampaignSnapshot` baseline followed by the campaign event log from `lastSeq+1`
- **AND** after the replay the guest SHALL receive live `CampaignEvent` frames as they are committed

#### Scenario: Guest proposal is arbitrated server-side and the decision is broadcast

- **GIVEN** a guest connected to campaign match `camp_abc`
- **WHEN** the guest sends `{kind: 'CampaignProposal', ...}`
- **THEN** the server SHALL route it to that match's `CampaignGmArbiter`
- **AND** on commit the server SHALL broadcast the resulting `CampaignEvent` to all connected clients
- **AND** on a `host-review` veto the server SHALL deliver `PROPOSAL_VETOED` to the originating guest without committing an event

#### Scenario: Campaign-sync frame for an unknown match is rejected cleanly

- **GIVEN** a client sends a campaign-sync frame with an unknown `matchId`
- **WHEN** the server handles the frame
- **THEN** the server SHALL reply with a typed `Error {code: 'UNKNOWN_MATCH'}`
- **AND** the server SHALL close the socket cleanly rather than leaving a half-open connection

#### Scenario: Unknown campaign-sync frame kind fails loudly

- **GIVEN** the campaign-sync envelope decoder receives a frame with a `kind` outside the defined campaign-sync set
- **WHEN** the frame is decoded
- **THEN** the decoder SHALL reject it with a typed error via the exhaustiveness assertion
- **AND** the frame SHALL NOT be silently accepted or dispatched as a no-op
