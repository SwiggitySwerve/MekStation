# Spec Delta: Co-op Campaign Sync

## ADDED Requirements

### Requirement: Co-op Campaign Route Surface

The system SHALL surface co-op campaign creation, joining, and host-as-GM review through routable URLs in the campaign page tree, so a player can reach every co-op authority surface defined by `add-coop-campaign-play` from the normal application navigation.

**Priority**: High

#### Scenario: Host creates a co-op campaign from the campaign list

**GIVEN** a user on `/gameplay/campaigns` with an unlocked vault identity
**WHEN** they click "Create Co-op Campaign", enter a name, and submit
**THEN** the system SHALL mint a campaign with `coopSession = { mode: 'host', roomCode: <generated> }`
**AND** the user SHALL be navigated to `/gameplay/campaigns/[id]` with the `Co-op session: Host` badge visible
**AND** the existing CO1 `CampaignMatchHost` SHALL accept the campaign as a co-op session ready to receive guest joins

#### Scenario: Guest joins a co-op campaign via room code

**GIVEN** a host has created a co-op campaign and shared its room code
**WHEN** a second user on `/gameplay/campaigns` clicks "Join Co-op Campaign" and enters the host's room code
**THEN** the system SHALL resolve the invite via the existing multiplayer invite endpoint
**AND** the guest SHALL receive the host's current campaign snapshot via CO1's session-lifecycle protocol
**AND** the guest SHALL be navigated to `/gameplay/campaigns/[id]` with `coopSession = { mode: 'guest', hostMatchId }` and the `Co-op session: Guest` badge visible
**AND** every campaign-mutating control on the page tree SHALL submit `IGuestProposal` instead of mutating campaign state directly

#### Scenario: Host-review surface mounts on the campaign dashboard

**GIVEN** a host-mode co-op campaign with arbitration mode `'host-review'`
**WHEN** the host loads `/gameplay/campaigns/[id]`
**THEN** the campaign dashboard SHALL render `<HostGmReviewSurface>` with the current pending-proposal queue
**AND** the surface SHALL update in real-time as guest proposals arrive via the CO1 broadcast loop
**AND** clicking `approve` or `veto` on a proposal SHALL invoke the existing `CampaignMatchHost` arbitration path

#### Scenario: Guest mission launch shows the participation picker

**GIVEN** a guest-mode co-op campaign with an active contract and a launchable mission
**WHEN** either player navigates to `/gameplay/campaigns/[id]/missions/[missionId]/launch`
**THEN** the system SHALL mount `<CoopParticipationPicker>` requiring each player to choose `deploy` or `command-hq` before the launch button enables
**AND** the existing zero-`deploy` block rule from `add-coop-campaign-play` SHALL fire if neither player chose deploy
**AND** a non-co-op campaign SHALL skip the picker and launch directly (existing behavior preserved)

#### Scenario: Single-player campaign mounts neither co-op surface

**GIVEN** a campaign with `coopSession === undefined`
**WHEN** any user navigates the campaign page tree
**THEN** the system SHALL NOT render `<HostGmReviewSurface>`, `<GuestProposalSurface>` overlays, or `<CoopParticipationPicker>`
**AND** every campaign-mutating control SHALL behave as it did before this change (direct store action, no proposal submission)
