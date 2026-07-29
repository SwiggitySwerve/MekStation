## ADDED Requirements

### Requirement: Strict GM and Two-Player Durability Catalog
The E2E suite SHALL provide a strict sandbox with one isolated non-playing GM browser context, one isolated Player 1 context, one isolated Player 2 context, one harness-owned server, and one per-run SQLite database. Every scenario SHALL assert rendered behavior and authoritative server or read-only persistence evidence.

#### Scenario: E2E-01 durable campaign cold recovery
- **WHEN** the GM creates a campaign and all three contexts and the server restart
- **THEN** the campaign, genesis branch, non-playing GM membership, two player memberships, and authorized baselines SHALL recover

#### Scenario: E2E-02 participant ownership survives restart
- **WHEN** Player 1 and Player 2 receive owned forces and all contexts refresh or the host process restarts
- **THEN** player slots, force ownership, readiness revision, branch, and cursors SHALL remain authoritative

#### Scenario: E2E-03 campaign fact commits before render
- **WHEN** an accepted campaign command produces a player-visible fact
- **THEN** read-only SQLite evidence SHALL show the committed batch before either eligible player renders it

#### Scenario: E2E-04 multi-event combat batch is atomic
- **WHEN** a combat command derives multiple events
- **THEN** the store SHALL show one contiguous committed batch before any eligible context renders the result

#### Scenario: E2E-05 crash before commit is invisible
- **WHEN** a one-shot scoped fault terminates command processing before commit
- **THEN** no authoritative row or participant-visible mutation SHALL exist after restart

#### Scenario: E2E-06 crash after commit replays
- **WHEN** a one-shot scoped fault terminates the process after commit and before broadcast
- **THEN** restart SHALL replay the committed result once to each eligible context without re-executing it

#### Scenario: E2E-07 concurrent player commands serialize
- **WHEN** Player 1 and Player 2 submit legal commands concurrently
- **THEN** the journal SHALL show two non-interleaved attributable batches and all three contexts SHALL converge

#### Scenario: E2E-08 duplicate intent has one effect
- **WHEN** a client resends the same command and idempotency identity
- **THEN** the store SHALL contain one receipt and one event batch and the client SHALL render one effect

#### Scenario: E2E-09 duplicate frame applies once
- **WHEN** the harness delivers the same projected frame twice
- **THEN** the receiving client SHALL reduce it once and acknowledge one delivery sequence

#### Scenario: E2E-10 replay-live overlap applies once
- **WHEN** a reconnect replay overlaps the live delivery of the same event
- **THEN** the client SHALL converge without duplicate reducer effect

#### Scenario: E2E-11 delivery gap triggers resync
- **WHEN** the harness withholds one viewer delivery sequence and sends a later sequence
- **THEN** that context SHALL enter syncing or behind state and recover the missing authorized tail

#### Scenario: E2E-12 delivery collision blocks
- **WHEN** two different event identities or projection digests claim one branch and delivery sequence
- **THEN** the client SHALL enter an integrity-blocked state without advancing its cursor

#### Scenario: E2E-13 persistence failure is truthful
- **WHEN** a scoped one-shot append failure occurs
- **THEN** the actor SHALL receive a typed failure, no client SHALL render success, and no partial batch SHALL remain

#### Scenario: E2E-14 slow client is isolated
- **WHEN** Player 2 frame consumption is delayed until its bounded queue limit is reached
- **THEN** the GM and Player 1 SHALL continue receiving eligible facts while Player 2 enters a recoverable behind state

#### Scenario: E2E-15 restart restores full authority
- **WHEN** the host restarts during an active scenario
- **THEN** campaign, match, participants, active branch, receipts, cursors, pending outbox, and authorized projections SHALL recover before new commands are enabled

#### Scenario: E2E-16 token expiry reauthenticates safely
- **WHEN** a scoped session token expires during a long campaign
- **THEN** durable membership plus account or vault reauthentication SHALL remint authority without widening access or placing a bearer token in a URL

#### Scenario: E2E-17 active route uses durable identity
- **WHEN** a participant cold-reloads an active match after the invite code expired
- **THEN** the route SHALL recover by durable session and match identity while a newcomer using the invite is rejected

#### Scenario: E2E-18 quiet heartbeat keeps clients connected
- **WHEN** the three contexts exchange valid heartbeat traffic without gameplay commands
- **THEN** the session SHALL remain connected beyond the liveness timeout interval

### Requirement: Strict Visibility Ownership and Finalization Catalog
The sandbox SHALL capture and inspect pre-serialization projector objects, raw live frames, raw replay and cold-recovery frames, snapshots, browser history state, rendered DOM, and role-scoped audit exports. Player artifacts SHALL be negative-searched for private GM reasons, opposing-player hidden metadata, private identifiers, server-only authority sequences, and inferable gaps.

#### Scenario: E2E-19 GM draft remains private
- **WHEN** the GM creates but does not finalize a correction or rewind preview
- **THEN** only the GM context and server-only private audit record SHALL contain the draft

#### Scenario: E2E-20 Player 1 sealed choice is private
- **WHEN** Player 1 submits a sealed choice
- **THEN** Player 1 and the GM MAY see it while Player 2 artifacts SHALL contain neither the choice nor an inferable sequence gap

#### Scenario: E2E-21 Player 2 sealed choice is private
- **WHEN** Player 2 submits a sealed choice
- **THEN** Player 2 and the GM MAY see it while Player 1 artifacts SHALL contain neither the choice nor an inferable sequence gap

#### Scenario: E2E-22 finalization reveals together
- **WHEN** the authority finalizes the sealed phase
- **THEN** eligible contexts SHALL receive the authorized reveal from committed viewer delivery streams

#### Scenario: E2E-23 public combat fact publishes immediately
- **WHEN** a normal public movement, attack, damage, or phase fact commits
- **THEN** eligible contexts SHALL render it without another GM approval step

#### Scenario: E2E-24 fog yields distinct projections
- **WHEN** one authoritative event has different visibility for Player 1 and Player 2
- **THEN** the captured projector objects, frames, DOM, and projection digests SHALL prove distinct valid player views

#### Scenario: E2E-25 public correction redacts private reason
- **WHEN** the GM finalizes a correction with a private reason and hidden metadata
- **THEN** player views SHALL show the authorized result while only the GM private record contains the private detail

#### Scenario: E2E-26 reconnect preserves visibility
- **WHEN** a player reconnects and replays events previously delivered live
- **THEN** replay and live payload fields plus projection digests SHALL be equivalent for that player

#### Scenario: E2E-27 player surfaces contain no GM-private data
- **WHEN** the harness scans player projector objects, frames, recovery payloads, history, DOM, and export
- **THEN** no forbidden GM-private field, private identifier, authority sequence, or inferable hidden-event gap SHALL appear

#### Scenario: E2E-28 unauthorized access fails before fan-out
- **WHEN** an unknown, revoked, or player identity attempts unauthorized WebSocket, API, export, or GM command access
- **THEN** it SHALL receive no session payload and SHALL create no outbox or domain event

#### Scenario: E2E-29 veto and timeout commit nothing
- **WHEN** one proposal is vetoed and another times out
- **THEN** neither SHALL mutate campaign state and each SHALL clear only its own pending UI

#### Scenario: E2E-30 simultaneous proposals remain attributable
- **WHEN** both players submit proposals concurrently
- **THEN** the GM SHALL see two actor-specific review items and resolving one SHALL not alter the other

### Requirement: Strict Combat Authority and Outcome Catalog
The sandbox SHALL use two tactical player seats and a separate non-playing GM connection. It SHALL prove server-owned RNG, player ownership, pause policy, durable terminal outcome, correction, combat rewind, and the campaign-receipt boundary.

#### Scenario: E2E-31 player commands owned unit
- **WHEN** each player commands a unit in that participant's owned force
- **THEN** the authority SHALL accept mechanically legal commands and preserve actor and ownership evidence

#### Scenario: E2E-32 cross-player command rejects
- **WHEN** Player 1 commands Player 2's unit or vice versa
- **THEN** the authority SHALL reject before append and all authoritative state SHALL remain unchanged

#### Scenario: E2E-33 concurrent choices resolve deterministically
- **WHEN** both players submit legal movement or attack choices at the same barrier
- **THEN** repeated seeded runs SHALL produce the same command order, authoritative result, and eligible-viewer digests

#### Scenario: E2E-34 server RNG provenance is authoritative
- **WHEN** combat requires random resolution
- **THEN** the server-owned roll and provenance SHALL match for eligible viewers and no client-supplied roll SHALL influence the result

#### Scenario: E2E-35 player disconnect follows delivery and progression policy
- **WHEN** one player disconnects
- **THEN** healthy clients SHALL continue eligible delivery while convergence-dependent progression remains paused until catch-up or audited removal

#### Scenario: E2E-36 GM pause and resume are durable
- **WHEN** the GM pauses and later resumes combat
- **THEN** the journal, all eligible surfaces, restart recovery, and audit SHALL reflect the same lifecycle facts

#### Scenario: E2E-37 terminal outcome publishes once
- **WHEN** combat reaches terminal state
- **THEN** one outcome version SHALL commit to the combat outbox and eligible clients SHALL apply one terminal result

#### Scenario: E2E-38 duplicate outcome reconciliation is idempotent
- **WHEN** the same outcome version is delivered repeatedly to campaign ingestion
- **THEN** one campaign receipt and one consequence batch SHALL exist

#### Scenario: E2E-39 GM combat correction is durable and safe
- **WHEN** the GM finalizes a damage or outcome correction before campaign receipt
- **THEN** the immutable correction SHALL survive restart and player views SHALL contain only the authorized result

#### Scenario: E2E-40 combat rewind creates replacement branch
- **WHEN** the GM rewinds to a trusted pre-receipt combat checkpoint
- **THEN** a replacement branch SHALL rebuild and activate while prior history remains superseded and auditable

#### Scenario: E2E-41 stale branch command rejects
- **WHEN** a delayed client command targets the superseded combat branch
- **THEN** the authority SHALL return `STALE_BRANCH`, append nothing, and direct resync

#### Scenario: E2E-42 all contexts converge on new head
- **WHEN** combat branch activation completes
- **THEN** GM, Player 1, and Player 2 SHALL converge on one active branch and effective head

#### Scenario: E2E-43 fog restores after rewind
- **WHEN** rewind removes later movement or revelation
- **THEN** each player's rebuilt hidden-state projection SHALL match the selected checkpoint and subsequent replacement events

#### Scenario: E2E-44 offline player catches up after rewind
- **WHEN** a player is offline during branch activation and later reconnects
- **THEN** authorized baseline and tail SHALL hydrate the active branch without snapshot hacks or superseded secret leakage

#### Scenario: E2E-45 applied outcome uses coordinated correction
- **WHEN** the GM corrects damage or outcome after a campaign receipt exists
- **THEN** combat-only rewind SHALL reject and the coordinated higher outcome version SHALL supersede and rebuild campaign consequences exactly once

### Requirement: Strict Campaign Timeline and Scenario Continuity Catalog
The sandbox SHALL prove forward and retroactive time operations, derived-family rebuild, scenario invalidation, customized-unit fidelity, multi-scenario continuity, cache equivalence, receipts, audit views, and rewind preview.

#### Scenario: E2E-46 one-day advance commits one version
- **WHEN** the GM finalizes one campaign day
- **THEN** one authoritative command batch and one resulting campaign revision SHALL publish to eligible viewers

#### Scenario: E2E-47 multi-effect day cascade is atomic
- **WHEN** one day produces multiple finance, repair, medical, personnel, contract, or market effects
- **THEN** every declared consequence SHALL commit atomically before any finalized projection publishes

#### Scenario: E2E-48 rewind rebuilds derived state
- **WHEN** the GM rewinds to before payroll, repair, medical, contract, or market effects
- **THEN** the replacement branch SHALL deterministically rebuild every declared affected family from a trusted base

#### Scenario: E2E-49 contract correction rebuilds linked domains
- **WHEN** a prior contract result is corrected after downstream effects
- **THEN** funds, transactions, loans, reputation, rewards, salvage, repairs, inventory, units, pilots, personnel, markets, receipts, activity, audit, and scenario artifacts SHALL match the replacement branch

#### Scenario: E2E-50 rewind invalidates later artifacts
- **WHEN** campaign rewind crosses later scenario drafts or outcomes
- **THEN** those artifacts SHALL be explicitly invalidated and linked to the supersession record

#### Scenario: E2E-51 stale artifact cannot be used
- **WHEN** a client attempts to launch or commit against an invalidated scenario or force revision
- **THEN** the authority SHALL reject with active branch and revision and SHALL create no new scenario

#### Scenario: E2E-52 next scenario retains roles and version
- **WHEN** a reconciled scenario advances to the next scenario
- **THEN** the non-playing GM, both player slots, ownership, and active campaign revision SHALL remain correct

#### Scenario: E2E-53 customized unit stays exact
- **WHEN** a customized unit travels through save, adoption, ownership, force, mission, combat, outcome, rewind, reload, and next scenario
- **THEN** its canonical construction fields and allowed combat-state changes SHALL match every authoritative checkpoint

#### Scenario: E2E-54 ten scenarios survive restarts
- **WHEN** the sandbox completes ten sequential scenarios with periodic client refreshes, player reconnects, GM reconnects, and server restarts
- **THEN** participant roles, ownership, journal continuity, receipts, branches, and scenario progression SHALL remain valid

#### Scenario: E2E-55 checkpoint replay equals full replay
- **WHEN** the same state is rebuilt from full authoritative history and from a compatible immutable checkpoint plus tail
- **THEN** authoritative state and every viewer projection digest SHALL be equal

#### Scenario: E2E-56 outcome linkage remains once
- **WHEN** the long campaign replays or restarts across reconciled scenarios
- **THEN** every combat outcome identity and version SHALL map to exactly one active campaign receipt

#### Scenario: E2E-57 audit records complete provenance
- **WHEN** the harness inspects representative accepted, rejected, vetoed, corrected, rewound, rebuilt, and published actions
- **THEN** actor, role, reason reference, command, branch, revision, supersession, audience, timestamps, result, causality, and digests SHALL be present as authorized

#### Scenario: E2E-58 player audit excludes private fields
- **WHEN** either player opens or exports audit history
- **THEN** public and owned provenance SHALL remain while GM-private and opponent-hidden fields SHALL be absent

#### Scenario: E2E-59 GM audit preserves prior branches
- **WHEN** the GM inspects an effective and superseded timeline
- **THEN** full authorized lineage, reasons, receipts, and correction causality SHALL remain available

#### Scenario: E2E-60 rewind preview lists blast radius
- **WHEN** the GM previews a campaign rewind
- **THEN** the UI and private audit evidence SHALL list affected days, scenarios, derived families, projections, and externalized artifacts before commit

### Requirement: Strict Failure Security and Recovery Catalog
Test-only fault injection SHALL require `NODE_ENV === 'test'`, an E2E run identifier, explicit session scope, and one-shot consumption. Production startup SHALL reject enabled fault controls. Durable inspection SHALL use a dedicated SQLite connection opened `readonly: true, fileMustExist: true`.

#### Scenario: E2E-61 malformed intent has no effect
- **WHEN** a context sends an unknown command kind or malformed payload
- **THEN** the server SHALL return a typed validation error with no journal or publication row

#### Scenario: E2E-62 replay attack cannot duplicate
- **WHEN** an attacker reuses command or idempotency identity before or after reconnect
- **THEN** the authority SHALL return the existing receipt or an integrity conflict and SHALL not repeat effects

#### Scenario: E2E-63 command-batch failure is atomic
- **WHEN** a scoped fault fails a middle event, head update, or outbox insert
- **THEN** no part of the batch SHALL remain and no client SHALL see success

#### Scenario: E2E-64 projection failure fails closed
- **WHEN** a scoped fault makes viewer projection fail
- **THEN** no raw authoritative payload SHALL serialize and the affected viewer SHALL enter a recoverable blocked or behind state

#### Scenario: E2E-65 GM loss pauses without migration
- **WHEN** the GM disconnects beyond the liveness policy
- **THEN** GM authority actions and progression SHALL pause and neither tactical player SHALL be promoted

#### Scenario: E2E-66 partitioned player catches up once
- **WHEN** one player's network is partitioned while eligible events commit
- **THEN** reconnection SHALL apply every authorized event once from the durable viewer cursor

#### Scenario: E2E-67 pre-rewind client cannot diverge
- **WHEN** a stale client returns after branch supersession
- **THEN** it SHALL receive a typed branch upgrade or resync path and SHALL not commit against old state

#### Scenario: E2E-68 corruption quarantines one session
- **WHEN** a scoped test fixture injects sequence, lineage, receipt, or digest corruption
- **THEN** only that session SHALL show truthful blocked recovery, no partial baseline SHALL publish, and a healthy control session SHALL remain available

#### Scenario: E2E-69 large tail is bounded
- **WHEN** an authorized player catches up through a large event tail
- **THEN** replay SHALL use configured bounded chunks and stay within the recorded memory ceiling

#### Scenario: E2E-70 socket failure preserves authority
- **WHEN** one socket send fails after commit
- **THEN** journal and outbox authority SHALL remain intact, healthy recipients SHALL continue, and the failed participant SHALL recover from its cursor

### Requirement: Strict Performance UX Evidence and Hygiene Catalog
The controlled loopback performance fixture SHALL use one campaign, one active match, the three required contexts, 20 warm-up commands, and at least 200 measured commands with a committed representative mix. It SHALL use monotonic server and browser clocks correlated by command identity, nearest-rank percentiles, replay chunks of at most 100 events or 512 KiB, a per-connection queue limit of at most 256 frames or 4 MiB, and a process-memory growth ceiling of 128 MiB above the post-warm-up baseline. Evidence SHALL record the repository-supported Node version, Chromium version, operating system, and named CI runner class; budgets gate only the recorded controlled class. A 2,000 millisecond Playwright wait is a functional timeout and SHALL NOT substitute for latency measurements.

#### Scenario: E2E-71 p95 meets controlled budget
- **WHEN** the controlled measured command set completes
- **THEN** nearest-rank p95 accepted-command-to-eligible-render latency SHALL be at most 250 milliseconds

#### Scenario: E2E-72 p99 meets long-log budget
- **WHEN** the measured command set runs against the committed long-log fixture
- **THEN** nearest-rank p99 accepted-command-to-eligible-render latency SHALL be at most 750 milliseconds

#### Scenario: E2E-73 cold catch-up meets budget
- **WHEN** an eligible context cold-recovers a 1,000-event authorized tail
- **THEN** catch-up SHALL finish within 2 seconds and within chunk, queue, and memory limits

#### Scenario: E2E-74 slow-client backpressure stays bounded
- **WHEN** Player 2 is slowed through the controlled send seam
- **THEN** its queue and memory SHALL remain bounded and GM or Player 1 latency SHALL not exceed the controlled failure threshold

#### Scenario: E2E-75 lifecycle states are distinct and accessible
- **WHEN** the harness drives pending, sealed, finalized, syncing, reconnecting, behind, rebuilding, rewound, and blocked states
- **THEN** each SHALL have a stable locator, persistent text, non-color-only semantics, correct command gating, and an assistive-technology announcement

#### Scenario: E2E-76 rewind confirmation prevents accidental invalidation
- **WHEN** the GM initiates a broad rewind on desktop and narrow viewport
- **THEN** impact summary, confirm, cancel, focus order, and primary recovery action SHALL remain visible and keyboard operable

#### Scenario: E2E-77 conflict message is actionable and safe
- **WHEN** a command rejects for stale revision, stale branch, authorization, integrity, or rebuild
- **THEN** the UI SHALL identify the actor-safe conflict class, base revision or branch, and recovery action without leaking private data

#### Scenario: E2E-78 evidence bundle is complete
- **WHEN** any strict scenario passes or fails
- **THEN** its per-run directory SHALL contain unique role-labeled screenshots, trace, raw socket transcript, pre-serialization projection evidence, latency JSON, read-only durable-row export, role-specific state hashes, environment manifest, and cleanup log

#### Scenario: E2E-79 cleanup is ownership-scoped
- **WHEN** a strict run finishes or aborts
- **THEN** cleanup SHALL close only harness-owned browser contexts, sockets, server, database connections, and per-run artifacts and SHALL preserve ambient browser tabs and unrelated processes

#### Scenario: E2E-80 major merges trigger exact-main regression
- **WHEN** a major authority, delivery, projection, rewind, campaign, or harness PR merges
- **THEN** the applicable strict three-context regression subset SHALL rerun against exact main before the next dependent PR begins and SHALL archive its result with the milestone
