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
