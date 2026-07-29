# Design: Durable GM + Two-Player Live Campaign Sessions

## Context

The existing runtime already contains the correct building blocks, but authority is split across process-local and durable paths:

- `ServerMatchHost` validates intents, applies existing combat reducers, appends events, and projects events per connection.
- `CampaignMatchHost`, `CampaignSyncSession`, and `CampaignGmArbiter` provide campaign mirrors, proposals, arbitration, and post-battle reconciliation.
- GM combat and campaign implementers preview and apply corrections.
- Replay, recovery, audit, and journey-QC surfaces already exist.

The missing boundary is the transaction that joins those pieces. Current command handling can append and broadcast one event at a time; live and replay delivery lack a complete deduplication/cursor contract; active room-code reload loses durable match identity; campaign host registration and participant data are process-local; terminal combat outcomes can publish before multiplayer durability; GM corrections patch current state without an immutable replacement branch; and campaign time only cascades forward. The product topology is one non-playing GM authority connection plus exactly two tactical player seats; GM authority is not a third tactical seat.

This design implements the requirements in:

- `specs/event-store/spec.md`
- `specs/multiplayer-server/spec.md`
- `specs/multiplayer-sync/spec.md`
- `specs/coop-campaign-sync/spec.md`
- `specs/campaign-management/spec.md`
- `specs/campaign-persistence/spec.md`
- `specs/campaign-combat-loop/spec.md`
- `specs/gm-authority-redaction/spec.md`
- `specs/gm-combat-interventions/spec.md`
- `specs/audit-timeline/spec.md`
- `specs/e2e-testing/spec.md`

The approved execution and review contract lives at `implementation-plan.md`.

## Goals / Non-Goals

**Goals:**

- Make one server-owned journal the durable authority for an active campaign, its linked combat matches, participants, branch lineage, and delivery cursors.
- Persist an accepted command and all resulting facts atomically before any committed result is published.
- Support one non-playing GM and two independent tactical players with durable identity, force ownership, readiness, proposal attribution, and reconnect state.
- Apply the same authorization projection to live delivery, replay, resync, audit views, and exports.
- Support GM-finalized combat correction, combat rewind, campaign retroactive correction, and campaign-time rewind without rewriting prior history.
- Preserve exact-once combat-to-campaign reconciliation across retries and restarts.
- Make progress, conflicts, rewind impact, and recovery state understandable on desktop and mobile, with accessible status announcements and keyboard-complete controls.
- Prove the result through real isolated GM/P1/P2 browser contexts plus persisted-state, transcript, visibility, audit, and latency evidence.

**Non-Goals:**

- Replacing combat or campaign reducers, creating a second gameplay engine, or changing BattleTech rules.
- Introducing Kafka, Redis Streams, a separate broker, or a new service before the single-process SQLite implementation demonstrates a measured limit.
- Allowing client clocks, client RNG, browser-local state, or screenshots to become authority.
- Destructive history edits or silent retroactive mutation.
- Cross-region replication, offline command creation, implicit GM-to-player authority migration, or more than two active player roles in the first implementation.
- Folding unrelated customizer, force-materialization, deterministic-CI, or Quick Game bootstrap defects into the same PR.

## Decisions

### D1 — One authoritative command journal plus transactional outbox

Every accepted command enters a per-session serialized executor. Inside one store transaction the executor validates the command against the current effective head, appends the command receipt and all derived domain events, advances the branch head, and inserts recipient-neutral outbox rows. Only after commit does the dispatcher project and send those rows.

```ts
interface ILiveCampaignCommand {
  commandId: string;
  idempotencyKey: string;
  campaignSessionId: string;
  matchId?: string;
  actorParticipantId: string;
  expectedBranchId: string;
  expectedRevision: number;
  kind: string;
  submittedAt: string;
  payload: unknown;
}

interface ICommittedCommandBatch {
  commandId: string;
  branchId: string;
  firstSequence: number;
  lastSequence: number;
  eventIds: string[];
  committedAt: string;
}

interface IOutboxRecord {
  outboxId: string;
  campaignSessionId: string;
  branchId: string;
  sequence: number;
  eventId: string;
  payload: unknown;
  committedAt: string;
}
```

The outbox stores recipient-neutral authoritative facts, not serialized GM/P1/P2 frames. Projection happens after authorization lookup and before serialization. Durable transport is at-least-once; stable identities and receipts make server effects and client application exactly once. This avoids persisting private data into a broader audience row.

Alternatives considered:

- Keep event-by-event append/broadcast: rejected because a multi-event command can be partially visible or interleaved.
- Persist fully rendered frames per recipient: rejected because membership changes and projection fixes would make replay depend on stale serialized secrets.
- Publish first and persist asynchronously: rejected because a client could render a result that disappears after restart.

### D2 — Session identity and participation are durable domain records

Campaign sessions, linked matches, GM/P1/P2 memberships, owned forces, readiness, acknowledgement cursors, and host-loss policy are stored with the authoritative journal.

```ts
type CampaignRole = 'gm' | 'player';

interface ICampaignParticipant {
  participantId: string;
  campaignSessionId: string;
  playerId: string;
  role: CampaignRole;
  playerSlot: 1 | 2 | null; // always null for the non-playing GM
  ownedForceIds: string[];
  readyRevision: number | null;
  lastAcknowledgedSequence: number;
  activeBranchId: string;
  joinedAt: string;
  revokedAt: string | null;
}

interface ICampaignSessionRecord {
  campaignSessionId: string;
  campaignId: string;
  activeBranchId: string;
  effectiveRevision: number;
  lifecycle: 'forming' | 'active' | 'paused' | 'rebuilding' | 'blocked' | 'complete';
  hostLossPolicy: 'pause';
  createdAt: string;
  updatedAt: string;
}
```

An invite code remains a short-lived admission mechanism; it is never the durable route identity. After account/vault authentication and durable membership lookup, the server mints a scoped session token and clients navigate and recover by `campaignSessionId` and `matchId`. Bearer tokens never appear in URLs.

GM connection loss enters a durable paused state. GM authority never migrates implicitly to Player 1 or Player 2. Only the same reauthenticated GM can resume, remove a participant through an audited command, or close the campaign session.

Alternatives considered:

- Extend the current undifferentiated `guest` model: rejected because it cannot prove P1/P2 ownership, readiness, privacy, or attribution.
- Store participant state only in auth tokens: rejected because token expiry and process restart would erase session membership.

### D3 — Stable command identity, authority sequence, delivery sequences, and replay/live deduplication

Production intent envelopes MUST carry `commandId`/`intentId` and an idempotency key generated before the first send and reused across retries. The store maintains uniqueness on session plus idempotency identity for the authoritative match/campaign lifetime. Clients track both the active branch and a contiguous applied delivery sequence, not only a maximum high-water mark.

The server-only journal uses a monotonic `authoritySequence`. Each viewer projection stream uses its own gapless `deliverySequence`. Players never receive hidden authority identifiers or inferable sequence gaps.

Delivery behavior:

1. Join authenticates membership before the socket is registered as a fan-out target.
2. Server sends `SessionBaseline` with branch, revision, and the viewer's replay start.
3. Replay frames are chunked and tagged with branch and sequence.
4. Live frames may arrive during replay but are buffered/deduplicated by `(branchId, deliverySequence, eventId)`.
5. A gap requests controlled resync; a conflicting identity at the same sequence blocks the client with a typed integrity error.
6. Client acknowledgements advance the durable participant cursor only after reducer application.

Heartbeat is bidirectional: server ping/heartbeat receives an explicit client response and liveness timeout is reset only by valid protocol traffic.

### D4 — Per-viewer projection is a fail-closed authorization boundary

The server derives an `IViewerContext` from durable authenticated membership for every send, replay, audit query, and export.

```ts
interface IViewerContext {
  participantId: string;
  playerId: string;
  role: CampaignRole;
  playerSlot: 1 | 2 | null;
  ownedForceIds: string[];
  branchId: string;
}

interface IViewerProjection {
  audience: 'gm' | 'player-1' | 'player-2' | 'public';
  eventId: string;
  branchId: string;
  sequence: number;
  payload: unknown;
  sourceDigest: string;
  projectionDigest: string;
}
```

Projection is capability-aware:

- GM drafts and private reasons are GM-only.
- A sealed player choice is visible to that player and the GM until the reveal event.
- Public finalized combat facts publish immediately to every eligible viewer.
- Fog-of-war and unit ownership produce independent P1/P2 payloads.
- A projection failure emits no permissive fallback; the recipient enters a typed blocked/behind state and the server records the failure.

The same projection function and contract tests are reused for live, replay, snapshot, cold recovery, resync, timeline, and export to prevent privacy drift. Private GM reasons and hidden metadata live in a separate server-only audit record whose authorization is checked before lookup; encryption at rest is outside this change.

### D5 — Rewind is append-only branch supersession

No event is deleted or edited. A rewind commit selects a trusted checkpoint and creates a new branch whose base references the old branch and cutoff sequence.

```ts
interface ISessionBranch {
  branchId: string;
  campaignSessionId: string;
  parentBranchId: string | null;
  baseSequence: number;
  effectiveHeadSequence: number;
  status: 'effective' | 'superseded' | 'building' | 'blocked';
  createdByParticipantId: string;
  reasonCode: string;
  reasonText?: string;
  createdAt: string;
}

interface ISupersessionRecord {
  supersessionId: string;
  oldBranchId: string;
  newBranchId: string;
  cutoffSequence: number;
  invalidatedEventIds: string[];
  invalidatedArtifactIds: string[];
  committedByParticipantId: string;
  committedAt: string;
}
```

Only the GM may commit a rewind. A player may create a rewind request, which is a non-mutating proposal. The GM first receives an impact preview listing invalidated days, scenarios, outcomes, projections, and externalized artifacts. Commit creates a `building` branch; clients remain gated until deterministic rebuild and projection verification succeed, then one branch-activation event advances the effective head. Commands received during rebuild are not invisibly queued: they return retryable `PROJECTION_REBUILDING` with the active branch and revision.

Old-branch commands receive a typed `STALE_BRANCH` rejection and no append. Offline clients resync to the active branch from their durable cursor. Prior branches remain visible only through authorized audit views.

Trusted checkpoints are immutable projection caches keyed by authority head, branch, reducer version, and digest. Compaction may prune or regenerate caches, but it never removes command receipts, authoritative events, branch lineage, supersession, or audit facts.

Alternatives considered:

- Patch current state in place: rejected because it destroys provenance and cannot replay.
- Delete tail events: rejected because player-visible facts, exports, and linked campaign outcomes may already exist.
- Fork only client state: rejected because persistence and other clients would remain authoritative on the old timeline.

### D6 — Combat outcome uses an outbox/inbox receipt boundary

Combat terminal state is not considered reconciled when a process-local event bus fires. The combat transaction appends a durable `CombatOutcomeFinalized` fact and an outcome-outbox row. Campaign ingestion writes an inbox receipt keyed by outcome identity and applies campaign events in one transaction.

```ts
interface ICombatOutcomeEnvelope {
  outcomeId: string;
  matchId: string;
  campaignSessionId: string;
  combatBranchId: string;
  combatHeadSequence: number;
  outcomeVersion: number;
  payloadDigest: string;
  payload: unknown;
}

interface ICampaignOutcomeReceipt {
  outcomeId: string;
  outcomeVersion: number;
  campaignBranchId: string;
  campaignFirstSequence: number;
  campaignLastSequence: number;
  appliedAt: string;
}
```

Retries with the same identity return the existing receipt. Combat-only rewind is permitted only before a campaign receipt exists. After campaign acceptance, the combat rewind command fails with a typed closed-boundary error; a distinct coordinated retroactive-outcome correction uses a higher `outcomeVersion`, explicitly supersedes the prior receipt, and produces a new deterministic campaign correction batch.

### D7 — Retroactive campaign changes rebuild declared derived families

Campaign correction implementers declare the state roots and derived families they affect: campaign date, missions/contracts, funds, transactions, loans, reputation, rewards, salvage, repairs, inventory, unit combat state, pilot health/experience, personnel, markets, contract availability, outcome receipts, scenario artifacts, activity log, and audit projections. The preview computes a correction manifest. Commit creates a new campaign branch and replays deterministic facts from a trusted checkpoint.

Backward time movement is not represented as a negative forward-day loop. It is a rewind/correction operation with an explicit cutoff, invalidation manifest, rebuild, and activation gate.

Whole-envelope last-write-wins retry is prohibited. Server-authored commands declare an expected revision. Disjoint commands revalidate and serialize; a same-field stale command returns a semantic conflict describing the current revision and safe retry/rebase action.

### D8 — Zustand stores remain projections, never authority

Client stores represent:

- connection lifecycle;
- authenticated participant and owned forces;
- active branch/revision/cursor;
- projected campaign and match state;
- pending local command identities;
- UI status (`pending`, `sealed`, `finalized`, `syncing`, `reconnecting`, `behind`, `rebuilding`, `rewound`, `blocked`);
- typed conflict/recovery guidance.

Reducers remain deterministic and consume projected server facts. Browser persistence may cache recoverable display state, but cold recovery always reconciles against server baseline and cursor before enabling commands.

### D9 — Three isolated browser contexts plus server/store evidence are the release proof

The live sandbox harness starts one owned server and one isolated per-run SQLite database, then creates three independent browser contexts:

```text
GM context ─────┐
Player 1 context├── authenticated WebSocket/API ── authoritative host
Player 2 context┘                                  │
                                                  ├── journal/outbox
                                                  ├── participant cursors
                                                  ├── branch/supersession records
                                                  └── audit/projection evidence
```

Each scenario must assert both:

1. rendered/client behavior in every affected context; and
2. authoritative evidence from socket transcripts, persisted rows, journal order, receipts, branch lineage, or server-side projection digests.

The harness injects controlled append failure, crash-after-commit, delayed send, disconnect, replay/live overlap, projection failure, and restart seams without network dependency or sleeps. Every fault seam requires `NODE_ENV === 'test'`, an E2E run identifier, explicit session scope, and one-shot consumption; production startup rejects enabled fault controls. The harness owns and cleans only its server process, browser contexts, sockets, database, and per-run evidence directory. Durable evidence reads use a dedicated SQLite connection opened `readonly: true, fileMustExist: true`, never a production store constructor that performs DDL.

### D10 — Responsiveness, backpressure, and accessible recovery states are contractual

Controlled loopback-harness budgets:

- p95 accepted-command-to-eligible-render: at most 250 ms.
- p99 under long-log load: at most 750 ms.
- 1,000-event cold catch-up: at most 2 seconds.
- A rebuild exceeding 500 ms exposes progress and keeps command surfaces gated.

The performance fixture defines its event count, command mix, warm-up commands, measured sample count, monotonic server/client clock sources, catch-up chunk size, per-client queue limit, process memory ceiling, percentile calculation, and CI runner class. The 2,000 ms Playwright assertion timeout is only a functional wait and never substitutes for the recorded 250/750 ms gate.

Each connection owns a bounded send queue. A slow client transitions to `behind`, stops receiving an unbounded live tail, and later resynchronizes from its durable cursor; it cannot delay other recipients. Healthy clients continue receiving committed events, but scenario progression remains gated until the lagging participant converges or the GM removes that participant through an audited command.

Status and rewind surfaces MUST:

- use persistent text, not color alone;
- announce lifecycle changes through an appropriate live region;
- preserve keyboard focus after proposal, error, and confirmation;
- provide descriptive conflict and recovery actions;
- fit narrow viewports without hiding the primary recovery action;
- require confirmation for branch activation and summarize blast radius in plain language.

### D11 — Small PRs and post-merge exact-main audits are part of the architecture

The implementation follows the ordered, independently revertible slices in `implementation-plan.md`. Each slice lands only after focused tests and its declared regression gate pass. The ABI checker is the only pre-harness implementation merge and receives its exact-main native-store regression. The isolated three-context fixture lands next and establishes `fixture-smoke`; every later major merge reruns the applicable exact-main three-context subset before the next dependent slice begins. Before durable GM/P1/P2 membership lands, the applicable subset proves context, identity, storage, server, and database isolation without claiming role admission. The membership slice adds `membership-smoke`; later slices extend `smoke` as capabilities become available. This avoids false pre-capability claims and a single unreviewable concurrency wave.

Prerequisite audit defects stay isolated in their own PRs so a regression fix can merge or roll back without coupling to the authority migration.

## Validation and Error Handling

- Mechanical validation runs before GM review; a mechanical rejection, GM veto, timeout, stale branch, stale revision, duplicate collision, projection failure, persistence failure, and authorization failure each have distinct typed results.
- Rejected commands MUST produce no gameplay journal events, outbox rows, cursor movement, campaign mutation, or false success UI. A separate access-controlled rejection-audit store MUST append one private record before returning the terminal rejection, keyed idempotently by session and command identity so retries cannot duplicate it. That record contains only actor, safe rejection class, base branch/revision, recovery action, timestamps, and integrity linkage; it is excluded from player delivery/replay/export and cannot carry hidden payloads.
- Unknown or revoked membership is rejected before the socket joins any fan-out collection.
- Input schemas reject unknown command kinds and malformed payloads.
- Event and projection digests provide integrity checks without exposing secret payloads.
- Recovery verifies sequence continuity, branch lineage, receipt uniqueness, and projection digests before enabling commands.
- Equipment tech base, rules level, introduction year, weight, and critical slots are unchanged by this feature. Customized units are treated as opaque canonical campaign assets and MUST round-trip without altering those fields.

## Migration Plan

1. Land fail-closed verification prerequisites and red regression tests in separate small PRs.
2. Add nullable journal/session/participant/outbox/cursor/branch tables and adapters without switching production authority.
3. Dual-write or shadow-verify command batches and projection digests behind a disabled-by-default feature flag; keep the current host path authoritative.
4. Enable the new path for the deterministic GM/P1/P2 sandbox and compare rebuilt state and audience digests with the existing path.
5. Backfill existing campaigns idempotently by preserving current materialized snapshots, creating a genesis branch, participant records, command receipts, and cursors from current match/campaign records. Production activation MUST refuse ambiguous ownership rather than guessing.
6. Switch command commit and delivery to the journal/outbox path for new sessions; preserve read compatibility for completed legacy logs.
7. Enable correction/rewind and outcome receipts after delivery, membership, and projection gates are green.
8. Run long-session, restart, slow-client, privacy, replay/export, and exact-main post-merge gates before removing shadow code.

Rollback:

- Before authority cutover, disable the feature flag and remove shadow rows.
- After cutover, stop new command admission, preserve the journal, and roll back application code only to a reader that understands the last schema version.
- Never roll back by deleting or rewriting committed journal or branch rows.

## Risks / Trade-offs

- [Cross-domain change grows into a mega-PR] → Enforce the plan's small-PR boundaries, dependency gates, and exact-main regression audit after major merges.
- [Projection bug leaks GM or opposing-player data] → Assert the projector object before `JSON.stringify`, project before serialization, fail closed, share one implementation across live/replay/snapshot/export, and negative-scan raw live frames, replay/cold-recovery frames, DOM, history, and exports for private reasons, metadata, identifiers, and inferable gaps.
- [SQLite transaction contention raises latency] → Serialize per session rather than globally, keep transactions bounded, measure p95/p99, and adopt a broker only after a measured need.
- [Slow clients exhaust memory] → Bound per-connection queues, persist cursors, mark the client behind, and resync from durable state.
- [Snapshot or compaction changes effective history] → Treat snapshots as caches only and compare full-log and snapshot/compacted state plus per-audience digests before activation; incompatible reducer versions rebuild or block truthfully.
- [Rewind rebuild is expensive or fails] → Build on a non-effective branch, expose progress, keep commands gated, and activate only after deterministic verification.
- [Legacy sessions lack unambiguous P1/P2 ownership] → Fail migration closed and require GM remapping rather than infer ownership.
- [Native SQLite ABI prevents durable proof] → Preflight the repository-supported Node version and native dependency ABI before implementation; do not accept in-memory substitutes as durability evidence.
- [Outcome correction applies twice] → Unique outcome/version receipts and explicit supersession make retries idempotent.
- [Mobile or assistive-technology users miss state changes] → Persistent status text, live announcements, keyboard focus management, narrow-viewport tests, and no color-only semantics.
- [A three-browser screenshot passes while persistence is wrong] → Require server/store authority evidence for every strict acceptance scenario.

## Open Questions

No design-blocking question remains for the first implementation. The following are measurement-driven follow-ups, not permission gates:

- Whether SQLite remains sufficient after the ten-scenario stress gate and measured concurrent-session load.
- The snapshot interval that minimizes catch-up time without increasing write amplification beyond the measured budget.
- The exact product wording for the host-loss pause and rewind-impact confirmation surfaces, subject to UX testing.
- Whether later campaigns need more than two active player slots; the durable participant model permits extension, but the first acceptance surface remains one GM plus two players.
