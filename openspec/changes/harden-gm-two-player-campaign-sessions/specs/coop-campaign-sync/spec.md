## ADDED Requirements

### Requirement: Co-op Campaign Has One Non-Playing GM and Two Tactical Players
The initial live campaign topology SHALL contain one authenticated non-playing GM authority participant and exactly two authenticated tactical player slots. The GM SHALL NOT occupy or inherit a tactical player seat.

#### Scenario: Three roles join
- **WHEN** the GM hosts and two invited players join
- **THEN** durable membership SHALL identify one GM with no player slot, Player 1 in slot 1, and Player 2 in slot 2

#### Scenario: Third tactical player is rejected
- **WHEN** another player attempts to join after both player slots are occupied
- **THEN** admission SHALL fail without changing existing membership

### Requirement: Participant Membership and Ownership Are Durable
Campaign membership SHALL persist authenticated identity, role, player slot, owned force identifiers, readiness revision, active branch, acknowledgement cursor, and revocation state.

#### Scenario: Membership survives process restart
- **WHEN** the host process restarts during an active campaign
- **THEN** the GM and both players SHALL recover their roles, forces, readiness, branch, and cursors from durable authority

#### Scenario: Client role claim is ignored
- **WHEN** a client claims GM authority or another player's force in a proposal
- **THEN** the campaign host SHALL use durable membership for validation and SHALL reject the unauthorized claim

### Requirement: Force Ownership and Readiness Are Revisioned
Each tactical player SHALL own an explicit set of campaign forces. Readiness SHALL acknowledge a specific force and campaign revision and SHALL clear when an authoritative change invalidates that revision.

#### Scenario: Both players acknowledge launch revision
- **WHEN** Player 1 and Player 2 each acknowledge their current owned-force and campaign revision
- **THEN** the scenario MAY become launch-ready if all other mechanical gates pass

#### Scenario: GM changes one owned force
- **WHEN** the GM finalizes a change to Player 1's force after Player 1 is ready
- **THEN** Player 1 readiness SHALL clear while unaffected Player 2 attribution remains intact

#### Scenario: Player edits foreign force
- **WHEN** a player submits a force mutation outside that participant's ownership
- **THEN** the host SHALL reject it with no campaign event

### Requirement: Campaign Progression Requires Convergence
Committed events MAY continue to healthy recipients while another participant is reconnecting or behind, but scenario launch and finalized branch transitions SHALL require all retained participants to converge on the active branch and required revision.

#### Scenario: Slow player does not stop delivery
- **WHEN** Player 2 is behind
- **THEN** the GM and Player 1 SHALL continue receiving eligible committed campaign facts

#### Scenario: Slow player blocks next scenario
- **WHEN** Player 2 has not acknowledged the active branch or scenario revision
- **THEN** next-scenario launch SHALL remain blocked with a visible reason

#### Scenario: GM removes unavailable player
- **WHEN** the GM uses an audited participant-removal command
- **THEN** the retained participant set and launch acknowledgement requirement SHALL update in one committed campaign batch

### Requirement: GM Loss Pauses Campaign Authority
Loss of the non-playing GM connection SHALL pause proposal finalization, rewind, campaign correction, and scenario transition. GM authority SHALL NOT migrate implicitly to a player.

#### Scenario: GM reconnects
- **WHEN** the same GM identity reauthenticates and catches up
- **THEN** the campaign MAY resume without changing player roles or ownership

#### Scenario: Player remains non-authoritative
- **WHEN** a player remains connected during GM loss
- **THEN** the player MAY view authorized committed state but SHALL NOT finalize GM commands

### Requirement: Simultaneous Player Proposals Remain Distinct
Player proposals SHALL retain actor, owned force, base branch, base revision, command identity, and pending resolution independently.

#### Scenario: Two proposals await review
- **WHEN** Player 1 and Player 2 submit proposals concurrently in host-review mode
- **THEN** the GM review surface SHALL show two separately attributable proposals and resolving one SHALL not clear the other

#### Scenario: Proposal timeout commits nothing
- **WHEN** one proposal times out
- **THEN** only that proposal SHALL receive a timed-out result and no campaign mutation SHALL occur

### Requirement: Campaign Join and Recovery Use Viewer-Safe Projection
Each participant SHALL hydrate from a projection produced for durable viewer context, and subsequent live, replay, and resync updates SHALL use the same projection rules.

#### Scenario: Player joins existing campaign
- **WHEN** a player joins or cold-recovers an established campaign
- **THEN** the baseline SHALL contain current public and owned state and SHALL exclude GM-private and opposing-player hidden state

#### Scenario: Player replay matches live visibility
- **WHEN** a player reconnects after missing campaign events
- **THEN** replay SHALL expose exactly the fields that participant would have received live

### Requirement: Campaign Conflict Resolution Is Command-Based
Campaign mutations SHALL be server-authored commands against an expected revision. Disjoint commands SHALL revalidate and serialize; same-field stale commands SHALL reject. The system SHALL NOT retry an unchanged stale whole-campaign envelope as an overwrite.

#### Scenario: Disjoint stale command revalidates
- **WHEN** a command's base revision is old but its declared affected fields do not conflict with intervening facts
- **THEN** the server MAY revalidate and serialize it against the current revision

#### Scenario: Same-field stale command rejects
- **WHEN** intervening facts changed a field the command intends to mutate
- **THEN** the server SHALL return a typed semantic conflict with current revision and recovery action and SHALL append nothing

## MODIFIED Requirements

<!--
Roadmap U91 (owner decision PK-u90-controls, 2026-09-25): names which host screen carries which
GM control. The entry carries the FULL final text so that archiving this change replaces the
living requirement of the same header. The guest scenario is unchanged word for word. On the
GM ledger route the three intervention controls are the ledger's preview, its manual takeover,
and its approval of a previewed correction (the GM correction).
-->

### Requirement: Co-op campaign command authority projection
Co-op campaign command screens SHALL map host and guest roles into the shared command-screen authority model. Hosts SHALL see authoritative campaign and GM controls for owned campaigns, while guests SHALL see proposal, normal player action, and public-result views only. The host's co-op command screen SHALL expose approve and veto controls for each pending guest proposal. The GM intervention controls (preview, manual takeover, and GM correction) SHALL be exposed on the host's GM ledger route, `/gameplay/campaigns/[id]/gm-ledger`, which the co-op dashboard's GM Ledger tab reaches.

#### Scenario: Host sees authoritative campaign commands
- **WHEN** a host opens a co-op campaign command screen while a guest proposal is pending
- **THEN** the proposal's row on the co-op dashboard SHALL expose approve and veto controls for that proposal (pinned by the `the host dashboard review mount` rows of `src/components/campaign/coop/__tests__/HostGmReviewSurface.deadControls.test.tsx`)
- **AND** the dashboard's GM Ledger tab SHALL reach the host's GM ledger route
- **AND** the GM ledger route SHALL expose the preview, manual takeover, and GM correction controls for commands that affect campaign state

#### Scenario: Guest sees proposal or public command path
- **WHEN** a guest opens the same co-op campaign command screen
- **THEN** the screen SHALL hide host-only and GM-private controls and SHALL route mutating actions through proposal or validated player command paths

<!--
Roadmap PAIC (plan task 41), the source contract for roadmap unit PAI (R2.authority-live).
This entry modifies the archived "Co-op Mission Launch With Both Forces" requirement because
that requirement owns co-op mission combat: it composes the encounter, names the OpFor and
binds the fight to ServerMatchHost. The OpFor was named but nothing said who drives it. The
entry carries the FULL final text. Its first paragraph and its three original scenarios are
unchanged word for word, so the per-player same-side unit ownership rule is preserved.
Provenance: the user chose on 2026-09-27 that the server drives the opposing force (GAP-7).
That choice is planning provenance, not an exact-head owner ruling.
-->

### Requirement: Co-op Mission Launch With Both Forces

The system SHALL launch a co-op campaign mission as one encounter composed from both players' selected forces, assigned to a shared `GameSide` against the encounter's OpFor. The composed encounter SHALL be run through the existing `ServerMatchHost` server-authoritative combat loop. Each deploying player SHALL own and command only their own units; an intent for a unit a player does not own SHALL be rejected.

In an explicitly bootstrapped co-op mission match, the OpFor SHALL be driven by server-owned commands. At an eligible opposing-unit turn the server SHALL run the existing engine AI inside the host's serialized command lifecycle. No player browser SHALL run, receive, or be able to request control of the OpFor, and no opponent-control grant SHALL exist. Each server opponent turn SHALL carry a deterministic command identity derived from the match, the accepted branch, revision and effectiveGeneration head, and the active unit, so replay and cold reopen reproduce the same turn and a duplicate trigger appends nothing. The turn's output SHALL reach players only through the normal per-viewer publication, and hidden opponent inputs SHALL stay server-side. The existing disconnect and pause policy SHALL apply unchanged; a guest disconnect SHALL grant no participant any authority. No client wire field SHALL be able to represent server-internal authority, and a player-supplied command that claims to be an opponent AI command SHALL be rejected.

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

#### Scenario: Server opponent turn advances combat

- **GIVEN** an explicitly bootstrapped co-op mission match whose active unit belongs to the OpFor
- **WHEN** the accepted state reaches that unit's turn
- **THEN** the server SHALL take the turn with the existing engine AI inside the host's serialized command lifecycle
- **AND** the resulting events SHALL be persisted and published to each viewer through the normal per-viewer projection
- **AND** combat SHALL advance to the next eligible turn without any player browser acting for the OpFor

#### Scenario: Forged client opponent command is refused

- **GIVEN** a co-op mission match in progress
- **WHEN** a player's client submits a command that claims opponent AI authority or targets an OpFor unit
- **THEN** the host SHALL reject the command as unauthorized
- **AND** no event SHALL be appended and no opponent turn SHALL run

#### Scenario: Replay and cold reopen reproduce the opponent turn

- **GIVEN** a co-op mission match in which the server took an opponent turn
- **WHEN** the match is replayed from its journal or cold reopened after a restart
- **THEN** the opponent turn SHALL have the same command identity and the same resulting events as the original
- **AND** hidden opponent inputs SHALL NOT appear in any player's projection, replay, or export

#### Scenario: Duplicate opponent trigger appends once

- **GIVEN** an opponent turn already committed for a head and active unit
- **WHEN** the same turn is triggered again, including after a restart or redelivery
- **THEN** the host SHALL resolve it to the existing command identity
- **AND** no second batch of events SHALL be appended

#### Scenario: Guest disconnect grants nothing

- **GIVEN** a co-op mission match with a connected host and guest
- **WHEN** the guest disconnects
- **THEN** the existing disconnect and pause policy SHALL apply unchanged
- **AND** no participant SHALL gain control of the guest's units or the OpFor
