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

Convergence SHALL use authenticated public applied-view evidence, not delivery or final-state equality. Every durable active retained seat, including the non-playing GM and either tactical player regardless of deployment choice, SHALL participate. Socket absence SHALL NOT remove a seat. Committed audited removal SHALL determine retention and authorization even if a crash precedes seat-row healing; every attachment of the removed participant SHALL stop delivery and acknowledgement.

The public `CampaignSnapshot` and `CampaignEvent` stream SHALL offer opaque application identities bound to the admitted socket, authenticated principal, campaign session, effective viewer authority, and application lineage. A cumulative receipt SHALL identify a delivered prefix; its predecessor SHALL link that prefix, with no predecessor only for an authorized replacement baseline. The server SHALL resolve the snapshot, required hydration adjunct facts, and receipt to the same captured effective branch, generation, and committed journal cut using verified parent-prefix/child-suffix history, never a root-only log substituted for a child branch.

An acknowledgement SHALL report successful actual application: baseline/event acceptance into the authoritative fold or player mirror, successful projection onto the loaded campaign, and retention/application of required adjunct facts, including historical mission-launch identities absent from snapshot state. Notification of listeners, handing data to a sink, socket delivery, a transport high-water mark, or starting a saved-record refresh SHALL NOT count as application. A later saved-record refresh SHALL NOT regress an acknowledged authoritative view. Replacement hydration SHALL deliberately replace the held application lineage, be serialized per connection, and be accepted only for an outstanding join/recovery; closed or superseded views SHALL NOT acknowledge. A missing visible predecessor, rejected snapshot, wrong campaign, malformed frame, absent consumer, or failed application SHALL withhold acknowledgement and require the existing join/resync recovery path.

Confirmed applied journal cuts SHALL persist in a separate durable public applied-view record keyed by campaign, session, and participant, binding branch, effective generation, viewer-authority fingerprint, accepted receipt identity, journal revision, and application time. Missing evidence SHALL mean unacknowledged even at revision zero. Grant delivery epochs/cursors, campaign `event.sequence`, snapshot `payload.revision`, membership, internal replica application, and memory acknowledgements SHALL NOT seed or substitute for this record. The existing default sequence-N/journal-revision-N+1 mapping SHALL remain distinct; explicit branch revisions SHALL NOT be repaired by adding one to a public number.

Before the durable write, the server SHALL revalidate admitted socket, principal, active membership after committed removals, public viewer authority, delivered receipt prefix, and captured lineage in the transaction's authoritative context. An upgrade-authenticated but unadmitted socket SHALL NOT advance evidence. Unknown, invented-ahead, foreign-principal/session/campaign/socket, revoked, stale-authority, or stale-branch/generation claims SHALL advance nothing. Exact accepted duplicates SHALL be idempotent and MAY receive the same confirmation after revalidation; superseded offers SHALL earn no new convergence credit. Older or concurrent tab evidence SHALL NOT regress a newer valid row. Confirmation SHALL be sent only after durable commit; failure SHALL NOT confirm application. Failed, refused, or saturated sends SHALL NOT establish a delivered prefix, and that connection SHALL recover without stopping healthy recipients.

Launch and socket progression SHALL read the same durable applied-view evidence and current effective history, preserving existing active-branch, pending-correction, replacement-verification precedence, readiness, and next-scenario gates. A seat SHALL converge only with valid current-lineage/current-authority evidence whose cut does not exceed the required head and whose authorized visible remainder through that head is empty. This evaluation SHALL preserve the existing full-state snapshot withholding latch across the verified history, not merely filter tail scopes. A visible fact that leaves reduced state unchanged SHALL still require application. Missing/unavailable evidence or unverifiable history SHALL fail closed, never become an empty retained set or a successful zero comparison.

Hidden-only committed tails MAY satisfy convergence after a genuinely applied authorized prefix without advancing its stored applied cut. They SHALL require no player progress frame, acknowledgement request, fabricated cut, hidden payload, hidden count, or hidden-only activity disclosure. Public receipts, confirmations, and newly added refusal detail SHALL expose no durable applied journal cut. Existing public viewer policy SHALL remain: GM sees admitted scopes, players see campaign and their own player scope, and unsupported team scope is fail-closed. Public session-seat authority and internal replica-grant authority SHALL remain distinct; revoking either SHALL NOT imply automatic cross-revocation. This contract introduces no claim that the documented legacy raw-sequence concealment deferral is repaired.

GM loss SHALL remain a separate pause condition with no promotion. Authentication, viewer-safe hydration, recovery, and application acknowledgements SHALL remain possible while paused so the same GM can catch up before convergence-dependent resumption; connection alone SHALL NOT demonstrate catch-up. Cold server recovery SHALL read SQLite and current effective history rather than retained memory. Outstanding unconfirmed connection offers SHALL NOT survive as application evidence. A fresh browser SHALL actually apply a fresh authorized baseline and required adjunct facts before enabling its commands, even when a durable row survived the server restart; returning membership SHALL NOT require reopening an expired invite.

#### Scenario: Actual baseline and adjunct application is confirmed durably
- **WHEN** an admitted GM or player successfully applies a public baseline, projects its state, and retains all required hydration launch facts
- **THEN** the consumer MAY acknowledge the cumulative offered receipt and the server SHALL confirm only after its validated applied-view transaction commits
- **AND** HTTP launch and socket progression SHALL evaluate that same durable current-lineage evidence

#### Scenario: Delivery without successful application gives no credit
- **WHEN** a frame is delivered but has no successful application consumer, is rejected, or fails projection or adjunct application
- **THEN** no application acknowledgement or durable advancement SHALL occur and convergence SHALL remain blocked

#### Scenario: Missing visible predecessor blocks a later receipt
- **WHEN** a cumulative prefix lacks an applied visible predecessor, including a visible reducer no-op
- **THEN** the client SHALL enter behind/syncing and SHALL NOT acknowledge past the hole before authorized recovery

#### Scenario: Foreign or stale receipt is refused
- **WHEN** a receipt is unknown, ahead of delivery, from another socket/principal/session/campaign, unadmitted, revoked, or superseded by current authority or lineage
- **THEN** it SHALL advance no applied record and SHALL provide no current convergence credit, even with an equal or larger numeric revision

#### Scenario: Duplicate and multiple-tab acknowledgements do not regress
- **WHEN** an accepted receipt is repeated or another tab submits older evidence after a newer valid row
- **THEN** the exact duplicate MAY be confirmed idempotently after revalidation and older evidence SHALL NOT overwrite or regress the valid row

#### Scenario: Snapshot and receipt share a branch cut
- **WHEN** hydration races a new commit or effective branch/generation change
- **THEN** the offered receipt SHALL cover only the same verified cut as the applied snapshot and adjuncts, and obsolete lineage SHALL NOT satisfy the current gate

#### Scenario: Hidden-only tail converges without player progress messages
- **WHEN** a player has valid applied-prefix evidence and the remaining effective history contains only facts withheld by the full projection law
- **THEN** the gate MAY converge through the required head without sending a hidden-only progress message or advancing the stored cut
- **AND** an earlier unapplied visible fact SHALL still block, and withheld full-state checkpoints SHALL remain withheld

#### Scenario: Paused GM catches up before resumption
- **WHEN** the same GM reauthenticates while campaign authority is paused
- **THEN** authorized hydration and acknowledgements SHALL be possible, but convergence-dependent resumption SHALL wait for the GM and every other retained seat to converge
- **AND** no tactical player SHALL gain GM authority

#### Scenario: Cold recovery requires fresh browser application
- **WHEN** the server cold-reopens durable state and a fresh browser returns through active membership
- **THEN** convergence SHALL use SQLite/current effective history rather than lost memory, and the browser SHALL apply fresh authorized hydration before enabling commands
- **AND** missing applied evidence SHALL remain unacknowledged even at revision zero

#### Scenario: Committed removal survives a seat-heal crash
- **WHEN** audited participant removal committed but the process crashed before seat-row healing
- **THEN** the removed participant SHALL neither acknowledge nor remain required for convergence, and every attachment SHALL lose delivery authorization
- **AND** unrelated internal grant revocation SHALL NOT be inferred from that public-seat removal

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

After admitting the signed deploying players, participation choices, and force claims, the server SHALL derive the default opposing rows with the existing `selectOpponentUnits` policy. The selector count SHALL equal the admitted deploying-player unit count and its seed SHALL be `${campaignId}:${missionId}`. Every derived opponent SHALL have a stable, unique runtime unit identifier that does not collide with a player unit, SHALL be assigned to the opponent side, and SHALL have neither `ownerPlayerId` nor a player-control grant. Every player and opponent canonical unit reference SHALL resolve before the first match metadata, opening-event, journal-seed, launch-announcement, or receipt write.

The 24-entry unit-bootstrap cap SHALL apply to the combined player and opponent roster. Twelve player rows plus twelve derived opponent rows SHALL be admissible; thirteen plus thirteen SHALL be refused without truncation. A client MAY omit opponent rows. If it supplies opponent rows, they SHALL be assertions only and SHALL exactly match the server-derived identifiers, canonical references, side, and absence of owner; a mismatch SHALL refuse the launch before any of the writes named above.

The admitted server-derived roster and its opening events SHALL be immutable match creation state. Identical or concurrent retries and cold recovery SHALL reuse that persisted roster and opening rather than regenerate, reroll, truncate, or duplicate either. Generic encounter REST force rows SHALL NOT become campaign-session or signed-head authority, historical opponentless matches SHALL NOT be retrofitted, and launch SHALL NOT require an authored scenario-specific opposing force. Existing REST match-metadata exposure is unchanged; this requirement makes no stronger roster-secrecy claim.

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

#### Scenario: Server derives the complete opposing roster

- **GIVEN** admitted signed deploying players whose accepted forces contribute canonical player units
- **WHEN** the co-op mission bootstrap is admitted
- **THEN** the server SHALL select the same number of default opponents with `selectOpponentUnits` and seed `${campaignId}:${missionId}`
- **AND** the complete roster SHALL contain owner-bound player rows and stable, unique, collision-free ownerless opponent rows
- **AND** every canonical player and opponent reference SHALL resolve before the first match write

#### Scenario: Combined bootstrap cap admits twelve plus twelve

- **GIVEN** a server-derived co-op mission bootstrap
- **WHEN** the complete roster contains twelve player rows and twelve opponent rows
- **THEN** the bootstrap SHALL be admitted under the 24-entry cap

#### Scenario: Combined bootstrap cap refuses thirteen plus thirteen

- **GIVEN** a server-derived co-op mission bootstrap
- **WHEN** the complete roster would contain thirteen player rows and thirteen opponent rows
- **THEN** launch SHALL be refused before any write and neither side SHALL be truncated

#### Scenario: Client opponent assertions mismatch

- **GIVEN** the client supplies optional opponent rows with a co-op mission launch
- **WHEN** any supplied identifier, canonical reference, side, or owner field differs from the server-derived roster
- **THEN** launch SHALL be refused before match metadata, opening events, journal seed, launch announcement, or receipt is written
- **AND** the client rows SHALL NOT replace or extend the server-derived roster

#### Scenario: Retry and cold recovery reuse the admitted opening

- **GIVEN** a co-op mission match whose derived roster and opening events were persisted
- **WHEN** an identical launch retries concurrently or the match cold-recovers
- **THEN** the same immutable roster and opening SHALL be reused
- **AND** no opponent SHALL be regenerated or rerolled and no opening effect SHALL be duplicated

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
