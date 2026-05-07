# Emit GameCreated from SimulationRunner so persisted NDJSON event logs include the unit roster

## Why

`add-replay-viewer-from-ndjson` (PR #541) shipped a replay viewer that drag-drops a swarm-produced `<gameId>.jsonl` event log into the browser and projects it onto `<HexMapDisplay>`. The reducer at `src/hooks/replay/useHexMapStateFromEvents.ts` walks the typed `IGameEvent` discriminated union and seeds its `tokens` array from the `GameCreated` event's `payload.units` field — that is the contract.

**The problem:** `SimulationRunner.run()` (`src/simulation/runner/SimulationRunner.ts:131-227`) does NOT emit `GameCreated`. Its `events: IGameEvent[]` array is initialized empty at line 134 and the runner never calls `createGameCreatedEvent`. A direct check of the actual swarm output confirms: the first line of `simulation-reports/games/2026-05-07T05-52-10-802Z/sim-42.jsonl` is `movement_declared` at `sequence: 0`, not `game_created`.

Consequence: when a user drags an existing swarm `.jsonl` into the replay viewer, the reducer's `tokens` array stays empty and the hex map renders nothing. The replay viewer's premise is broken.

The interactive game-session path (`src/utils/gameplay/gameSessionCore.ts:85`) DOES emit `GameCreated` correctly via `createGameCreatedEvent`. The headless simulation runner is the only emitter that bypasses this seed event.

## What

### 1. Synthesize `IGameUnit[]` from runner state

New helper `synthesizeGameUnits(config, hydration?)` in `src/simulation/runner/SimulationRunnerState.ts` (or sibling) that mirrors the existing `createSideUnits` per-unit walk, returning `readonly IGameUnit[]`:

- For each `player-N` / `opponent-N` slot the runner allocates, build an `IGameUnit` with:
  - `id`: same id `createSideUnits` uses (`player-N` / `opponent-N`)
  - `name`: `${hydrated.fullUnit.chassis} ${hydrated.fullUnit.model}` when hydration is present, else `id` as-is (synthetic minimal-unit fallback)
  - `side`: `GameSide.Player` / `GameSide.Opponent`
  - `unitRef`: `hydrated.fullUnit.unitRef` (or `id` if absent)
  - `pilotRef`: `hydrated.pilotRef` if available (or `unknown-pilot` synthetic)
  - `gunnery`, `piloting`: from hydration when present, fall back to `DEFAULT_GUNNERY` / `DEFAULT_PILOTING`

### 2. Emit `GameCreated` as event 0 in `SimulationRunner.run()`

After `createInitialState(config, hydration)` and before the turn loop, push a `GameCreated` event:

```ts
const units = synthesizeGameUnits(config, this.hydration);
events.push(
  createGameEvent(
    GameEventType.GameCreated,
    {
      config: {
        mapRadius: config.mapRadius,
        turnLimit: config.turnLimit,
        victoryConditions: ['destruction'],
        optionalRules: [],
      },
      units,
    } satisfies IGameCreatedPayload,
    {
      gameId,
      turn: 0,
      phase: GamePhase.Initiative,
    },
  ),
);
```

The event lands at `sequence: 0`, the runner's existing per-phase emissions occupy sequence 1+. NDJSON output now starts with `game_created`.

### 3. Spec delta — `simulation-system`

ADD `Requirement: Runner Emits GameCreated as Seed Event` covering:
- Every `SimulationRunner.run()` invocation MUST emit `GameCreated` as `events[0]`.
- The payload's `units` array MUST contain one entry per `IUnitGameState` in the initial state, with stable `id` matching the runner's slot ids.
- The payload's `config.mapRadius` and `config.turnLimit` MUST equal the input `ISimulationConfig`'s values.
- 3 scenarios.

## Impact

- **Affected code:**
  - MODIFY `src/simulation/runner/SimulationRunner.ts` — emit `GameCreated` as event 0
  - NEW or MODIFY `src/simulation/runner/SimulationRunnerState.ts` (or sibling `SimulationRunnerSupport.ts`) — `synthesizeGameUnits` helper
  - MODIFY existing runner tests — they assert event-list shapes; some will need to skip `events[0]` or assert it's `GameCreated`
- **Affected specs:** `simulation-system` (ADDED — 1 requirement, 3 scenarios)
- **Risk:** **medium** — `events.push` order is the runner's contract; any test that asserts `events[0].type === GameEventType.MovementDeclared` (or similar) breaks. We verify with full Jest run before merge.

## Out of scope

- Lossy fallback in the reducer for legacy NDJSON files (handled inside PR A1 worktree as a defensive complement; covered by separate PR scope).
- `UnitRetreated` / `MotiveDamaged` / `TrooperKilled` emission — separate domain follow-ons per OMO Council deferred list.
- Schema migration of pre-existing `simulation-reports/` archives — they remain consumable via the lossy fallback in PR A1.
