## Context

MekStation already has several pieces of the future GM control surface, but they are not yet a coherent authority model. The tactical command shell supports a `gm` shell mode and TacticalActionDock exposes starter GM command stubs. Gameplay state is event-derived, and campaign sync has ordered event logs. Fog-of-war and event visibility code already establish that different viewers can receive different projections. Encounter launch also snapshots source forces into game units with source references.

The missing layer is a reusable intervention ledger abstraction plus domain implementers. The ledger decides how interventions are previewed, approved, appended, projected, redacted, and replayed. Domain implementers decide what a combat correction, unit reload, future finance reversal, or future time cascade means. The OMO council changed the implementation order from "event schema first" to "authority and redaction first" because GM interventions become replayable canonical history once appended.

Stakeholders:

- Game master: owns the campaign/game state they created and needs high-authority correction tools.
- Player: needs rules-valid actions and truthful state without hidden GM reasoning or unrevealed scenario context.
- Replay/sync systems: need deterministic, additive history rather than invisible direct mutations.
- Future campaign systems: need a pattern that can later expand to post-combat, base/economy, and time cascades.

## Goals / Non-Goals

**Goals:**

- Define a reusable intervention ledger interface that can be implemented by combat now and campaign/economy/time domains later.
- Define a GM intervention envelope that separates authority, GM-private metadata, public net effect, cascade preview, approval, and additive ledger records.
- Make authority and redaction the first implementation layer, before reducers or UI command handlers.
- Support first-slice combat interventions: reposition/facing, damage and critical correction, heat/ammo correction, phase/initiative correction, lifecycle/ejection/withdrawal/destruction/rescue correction, and active-encounter unit customization reload.
- Preserve live combat overlays during unit reload where possible, while replacing construction/loadout-derived fields from the current source unit definition.
- Keep player-visible logs and replay streams limited to resulting state and public net effects.
- Add tests for authority, redaction, cascade preview, event append/replay, reducer projection, unit reload reconciliation, and logging.

**Non-Goals:**

- No broad rewrite of gameplay or campaign event storage.
- No direct mutation path that bypasses the event history.
- No UI-first implementation where `shellMode === 'gm'` is treated as sufficient authority.
- No replacement of normal player undo with GM semantics.
- No first-slice implementation of post-combat, base/economy, or accumulated time cascades.
- No change to BattleMech construction tech base rules except preserving and reloading existing construction/loadout fields during unit reconciliation.

## Decisions

### Decision 1: Use a reusable intervention ledger abstraction

The implementation should start from a small ledger abstraction rather than a combat-only service. The ledger owns shared mechanics: append-only records, causality, preview status, public/private projection, approval state, and registered domain implementers. Domain implementers own domain-specific preview/apply rules.

Alternative considered: build direct combat GM functions first and generalize later. Rejected because base/economy/time interventions have the same approval, redaction, and audit needs; building combat as a one-off would make the next phases repeat the same safety work.

Sketch:

```ts
type InterventionDomain =
  | 'combat'
  | 'unit-reload'
  | 'post-combat'
  | 'economy'
  | 'repair'
  | 'salvage'
  | 'time';

interface IInterventionLedgerRecord<TPrivate = unknown, TPublic = unknown> {
  id: string;
  domain: InterventionDomain;
  kind: GmInterventionKind;
  status: 'previewed' | 'approved' | 'cancelled' | 'manual';
  actorId: string;
  targetRefs: readonly string[];
  causedBy?: readonly string[];
  supersedes?: readonly string[];
  privateMetadata: TPrivate;
  publicEffect: TPublic;
  createdAt: string;
  approvedAt?: string;
}

interface IInterventionLedgerImplementer<TCommand, TState> {
  readonly domain: InterventionDomain;
  preview(command: TCommand, state: TState): IGmCascadePreview;
  apply(record: IInterventionLedgerRecord, state: TState): TState;
  projectPublic(record: IInterventionLedgerRecord): IGmPublicEffect;
  projectPrivate(record: IInterventionLedgerRecord): IGmPrivateMetadata;
}
```

### Decision 2: Authority and redaction come before canonical append

The first code slice should define an authority context and redaction envelope before any GM intervention event can be appended. The authority check answers whether the actor owns the game/campaign state or otherwise has GM authority. The redaction envelope answers which fields are GM-only and which net effect may be shown to players.

Alternative considered: define event types first, then add redaction later. Rejected because the event-sourced gameplay pipeline will replay appended events as canonical history; a poorly shaped payload could leak GM intent or hidden state before redaction is complete.

Sketch:

```ts
type GmInterventionKind =
  | 'add'
  | 'subtract'
  | 'fix'
  | 'undo'
  | 'reload';

interface IGmAuthorityContext {
  actorId: string;
  gameId: string;
  campaignId?: string;
  ownedStateIds: readonly string[];
  role: 'gm' | 'player' | 'spectator';
}

interface IGmPrivateMetadata {
  reason: string;
  defaultOutcome?: string;
  hiddenNotes?: string;
  manualTakeoverNotes?: string;
}

interface IGmPublicEffect {
  summary: string;
  changedStateRefs: readonly string[];
  visibleToPlayerIds?: readonly string[];
}
```

### Decision 3: GM changes are additive interventions, not replay truncation

GM undo and fixes should append corrective or superseding events. The existing normal undo behavior that truncates/replays history remains a local player/action convenience and should not be reused for GM adjudication.

Alternative considered: reuse the current undo action for GM correction. Rejected because GM actions need auditability and public/private visibility, while history truncation erases the adjudication record.

### Decision 4: Cascade preview is a pure projection before approval

Each GM command should produce a preview from the current state without mutating the session. Approval appends the accepted intervention event; cancellation appends nothing. Manual takeover is used when the preview detects conflicts the system cannot safely resolve.

Sketch:

```ts
interface IGmCascadePreview {
  interventionId: string;
  status: 'ready' | 'requires-manual-takeover' | 'blocked';
  publicEffect: IGmPublicEffect;
  privateMetadata: IGmPrivateMetadata;
  affectedEventIds: readonly string[];
  projectedEvents: readonly unknown[];
  conflicts: readonly IGmInterventionConflict[];
}
```

### Decision 5: UI calls the intervention pipeline; it does not own authority

TacticalActionDock and tactical shell GM controls should become command surfaces only after the authority/redaction/intervention service is real. The shell may hide or show controls for ergonomics, but the service must reject unauthorized calls even if a UI bug exposes a command.

Alternative considered: gate commands only by shell mode. Rejected because shell mode is presentation state, not ownership proof.

### Decision 6: Unit reload is session reconciliation, not encounter relaunch

Reloading a unit customization in an active encounter should rehydrate source construction/loadout fields by `unitRef` and `pilotRef`, then merge them into the current live unit. Runtime overlays are preserved by default:

- position and facing
- initiative and phase state
- damage and critical state where compatible
- heat
- ammo and expended resources where compatible
- pilot state
- movement locks and committed action state
- target locks or queued effects that remain valid

If the source change removes a referenced component, changes armor structure enough to invalidate damage mapping, alters ammunition bins, or changes movement profile incompatibly, the preview status becomes `requires-manual-takeover`.

### Decision 7: Campaign expansion follows combat proof

Post-combat amendments, merchant/inventory/finance reversals, repair/salvage corrections, and time-based cascades should follow only after combat interventions prove the authority/redaction/event pattern. Campaign sync and co-op GM arbitration are integration points, not first-slice blockers.

## State Management and Data Flow

Combat first-slice flow:

1. Tactical UI creates a candidate `IGmInterventionCommand`.
2. Intervention ledger receives the command with `IGmAuthorityContext` and a target domain.
3. Authority guard rejects non-GM or non-owner requests.
4. Ledger routes the command to the registered domain implementer.
5. Redaction envelope builder separates `IGmPrivateMetadata` from `IGmPublicEffect`.
6. Preview projector computes `IGmCascadePreview` from the current game state and event history.
7. GM approves, cancels, or takes manual control.
8. Approved intervention appends an additive ledger record and any domain events needed for state derivation with causality/supersession metadata.
9. Gameplay reducers derive the new state from the event stream.
10. Player-facing log/replay projections receive only public net effects and resulting state.

Zustand stores should remain consumers/orchestrators. The store may call the intervention ledger and append approved records/events, but it should not embed ownership, redaction, or cascade resolution rules in component-facing action handlers.

## Validation, Logging, and Errors

- Unauthorized GM intervention attempts MUST be rejected before preview generation and logged without GM-private metadata.
- Preview generation MUST return structured conflicts instead of partially applying changes.
- Approved interventions MUST log intervention kind, actor, target refs, public summary, and conflict/manual takeover status.
- Player-visible logs MUST use the public net-effect payload only.
- Tests MUST assert that GM-private fields do not appear in player projections, replay payloads, or public action logs.

## Migration Plan

1. Add the authority/redaction envelope types and tests without changing runtime behavior.
2. Add GM authority/redaction envelope and tests.
3. Add cascade preview/approval/cancel/manual takeover tests.
4. Add combat implementer preview/apply reducers for the first-slice actions.
5. Wire TacticalActionDock GM commands to call the intervention ledger.
6. Add unit reload reconciliation and conflict/manual takeover tests.
7. Add later campaign/post-combat/economy/time implementers after combat proof.

Rollback strategy: because the change is additive, disable GM command registration and leave the normal gameplay event flow untouched. Existing combat sessions, campaign event logs, and player actions should continue to run without GM intervention events.

## Risks / Trade-offs

- Authority/redaction model may duplicate some fog-of-war visibility concepts -> Keep GM redaction narrowly focused on intervention metadata and public net effects; reuse fog filtering for player perspective where possible.
- Unit reload preservation may hide invalid stale state -> Require conflict reporting and manual takeover when structural mapping is ambiguous.
- Too many GM event types may fragment reducers -> Use a small intervention envelope plus focused projected events for state mutation where existing events already express the public state.
- Campaign cascades may become complex quickly -> Defer them until combat establishes the event and redaction pattern.
- Public net-effect logs may be too terse for player trust -> Include resulting state and visible changed refs, but keep private reason/default outcome GM-only.

## Open Questions

- Should a GM intervention event itself mutate state, or should it act as an audit wrapper around one or more projected domain events?
- What is the exact owner identity source for local-only, hosted co-op, and future server-backed sessions?
- Should manual takeover produce a distinct event kind, or the same intervention kind with `status: 'manual'` metadata?
- How should partial unit reload conflicts be presented in the first UI pass: checklist, diff table, or staged conflict cards?
