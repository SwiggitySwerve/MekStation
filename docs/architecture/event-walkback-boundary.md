# Event-Walkback Boundary Rule

> **Origin:** OMO Heavy Council audit of Wave 8 (G10 gap). Codifies the architectural
> boundary surfaced by PR-K6's spotter-liveness mid-resolution re-check
> (`src/utils/gameplay/gameSessionAttackResolution.ts`).

## Audience

Engineers extending the combat-resolution pipeline, the indirect-fire dispatch
(`src/utils/gameplay/indirectFire.ts` + `src/engine/InteractiveSession.indirectFire.ts`),
the event factories at `src/utils/gameplay/gameEvents/`, or any subsystem that
needs to consult historical event payloads from inside the resolution path.

## The Rule

MekStation's tactical engine is event-sourced. `IGameSession.events` is the
**append-only audit log**. `IGameSession.currentState` is the **derived
projection** — what the rest of the system queries when it needs to know the
state of the game right now.

When you need to ask a question inside resolve-time code, default to the
projection:

> **Default: project at phase boundary, query the projection.**

When you reach into the event log directly — walking backward to find a
specific past event — you are doing something exceptional. This is sometimes
called "event walkback." It is **justified only when ALL** of the following
are true:

1. The lookup happens at most once per attack / per resolution (not per
   targeted unit, not per location-hit, not per tick).
2. The lookup is gated by an edge condition that fires in a small minority of
   cases (PR-K6's spotter-liveness check fires for ~1% of attack
   resolutions — only when an indirect-fire attack's elected spotter dies
   between declaration and resolution).
3. There is no clean way to express the answer as a `currentState` field
   without leaking a transient invariant into the persistent projection.

If you cannot meet all three, the answer belongs in `currentState`, projected
at the phase boundary that establishes it.

## Canonical Example — PR-K6 (Spotter Liveness)

When an indirect-fire attack resolves, the engine asks: "is the spotter that
was elected at `AttackDeclared` time still alive?" The election event
(`IndirectFireSpotterSelected`) was emitted seconds ago in game-time, but
between then and now the spotter may have been destroyed by a different
attack in the same resolution batch.

PR-K6 walks backward from the current `AttackResolved` candidate, finds the
most recent `IndirectFireSpotterSelected` matching `attackerId + weaponId`,
checks `gameState.units[spotterId].destroyed`, and on death:

- forces `hit = false`,
- emits `IndirectFireSpotterLost`,
- preserves ammo + heat consumption per the existing miss path.

This passes the three-part test:

1. **Once per resolve.** O(events-since-this-declaration), bounded <20 events
   in practice. Not per hit-location, not per damage application.
2. **Edge condition.** Only fires when the spotter is dead at resolve time —
   <1% of indirect-fire attacks.
3. **No clean projection.** "The spotter that was elected for this specific
   attack" is a per-attack-resolution invariant, not a persistent
   game-state property. Adding `currentlyElectedSpotterForAttack:
Map<attackerId, spotterId>` to `currentState` would persist a value that
   should live for a single resolve-tick.

## Anti-patterns

These would fail the test — DO NOT walk the event log for them. Project them
into `currentState` instead:

- **NARC marks expiring.** Walking the event log every resolve to count
  `NarcAttached` minus `NarcExpired` is O(events) per _attack_. Project
  `currentState.units[unitId].narcMarks: INarcMark[]` at phase advance.
- **ECM coverage.** Walking the event log to compute ECM bubbles per attack
  is O(events × units). Project `currentState.ecmCoverage: ECMField` once
  per Movement phase end.
- **Heat dissipation history.** Walking to recompute heat-sink curves is
  pointless — the projection already has `currentState.units[unitId].heat`.
- **Modifier stacking on every to-hit.** Walking to find every modifier
  emitted in the last N events is O(events) per to-hit. Project active
  modifiers (`ITurnModifier`) at phase advance.

The pattern that makes walkback wrong is **frequency**. If the lookup happens
inside a per-target / per-unit / per-tick loop, the cost compounds and the
projection misses its purpose.

## How To Migrate When You Realise You're Walking Wrongly

1. Identify the projection field you'd need on `currentState` (e.g.
   `narcMarks`, `ecmCoverage`).
2. Add a deriving function in `src/utils/gameplay/deriveState/` (or the
   nearest existing reducer module).
3. Wire it into the phase boundary that establishes the invariant (usually
   `gameSessionPhaseAdvance.ts`).
4. Read from `currentState` at resolve time. Drop the walkback.

## Related

- `src/utils/gameplay/gameSessionAttackResolution.ts` — PR-K6 canonical
  walkback at the spotter-liveness hook.
- `src/components/gameplay/TacticalCommandShell/TacticalCommandShell.tsx` —
  PR-K8's `electedSpotters` projection in shell state — a UI-side projection
  driven by the same `IndirectFireSpotterSelected` / `IndirectFireSpotterLost`
  events, kept in shell context for cheap token-ring lookup. This is the
  _projection_ side of the same pattern: events drive a derived field that
  per-frame consumers query.
- `docs/plans/archive/2026-01-20-unified-event-store.md` — the original
  event-store architecture decision.
