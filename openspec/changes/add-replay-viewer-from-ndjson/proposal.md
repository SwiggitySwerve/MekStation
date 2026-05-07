# Add replay viewer that consumes persisted NDJSON event logs

## Why

The CLI swarm runner persists every encounter as `simulation-reports/games/<run-timestamp>/<gameId>.jsonl` (per `quick-session` → "Per-Game Event Log Persistence"). Each file is a complete, sequence-ordered `IGameEvent` log of a battle that already happened, but **no UI surface in the app can open one**.

The repo *does* ship a replay page at `src/pages/gameplay/games/[id]/replay.tsx` with `useReplayPlayer`, `ReplayTimeline`, and `ReplayControls` already wired. The page renders timestamps, sequence numbers, and an "Event N of M" placeholder, but its reducer map is **empty** (line 70 of the page) — events scrub through but **the hex map does not update**. The page is also bound to the saved-DB-game flow (`useGameTimeline(gameId)` reads from the audit `EventStoreService`), not to on-disk NDJSON files written by swarm runs.

Two gaps follow from that:

1. **No on-disk → UI bridge**. A user with a `.jsonl` file from a CLI run cannot watch it back in the browser at all. They must read the columnar `*.readable.txt` companion or the raw NDJSON.

2. **No state-from-events reducer**. Even when events ARE loaded (via the audit store), the page can't project them onto a hex map because nothing walks the typed `IGameEvent` discriminated union into the `IUnitToken[]` + `IHexTerrain[]` shape that `HexMapDisplay` consumes.

This change ships both halves of the bridge:

- A drag-and-drop `JsonlFileLoader` that parses, validates, and surfaces a `readonly IGameEvent[]` to the page.
- A pure `useHexMapStateFromEvents` reducer that walks events sequentially up to a `currentSequence` cursor and returns `{ tokens, terrain }` for `HexMapDisplay`. The reducer covers the eight event families that drive on-map state: position+facing (`MovementDeclared`), HP (`DamageApplied` / `LocationDestroyed` / `TransferDamage`), KIA (`UnitDestroyed`), heat (`HeatGenerated` / `HeatDissipated`), pilot wounds (`PilotHit`), and prone/standing (`UnitFell` / `UnitStood`).

The replay page wires both: an upload affordance promotes uploaded events over the DB-store events, and the new reducer's output is forwarded into the existing `HexMapDisplay` mount that today shows a placeholder card.

## What

### `JsonlFileLoader.tsx` (drag-and-drop NDJSON ingest)

New file at `src/components/audit/replay/JsonlFileLoader.tsx`:

- Accepts files via drag-drop OR a file-picker button.
- Reads the file as text, splits on `\n`, filters empty lines (trailing newline tolerated), `JSON.parse`-es each line.
- Validates each parsed object against the `isGameEvent(obj)` type guard already exported from `GameSessionInterfaces.ts`.
- On parse / validation failure: surfaces a per-line error list (`"line 47: not valid JSON"` / `"line 92: not a valid IGameEvent"`) AND does NOT promote the file. The page's existing event source remains untouched.
- On success: emits `(events: readonly IGameEvent[], filename: string)` to the host page via a callback prop.
- Renders a small "loaded `<filename>` (`N` events, turns `<minTurn>`–`<maxTurn>`)" status pill while events are active.

### `useHexMapStateFromEvents.ts` (typed-event → HexMapDisplay reducer)

New hook at `src/hooks/replay/useHexMapStateFromEvents.ts`:

```ts
export interface ReplayHexMapState {
  readonly tokens: readonly IUnitToken[];
  readonly hexTerrain: readonly IHexTerrain[];
  readonly mapRadius: number;
}

export function useHexMapStateFromEvents(
  events: readonly IGameEvent[],
  currentSequence: number,
): ReplayHexMapState;
```

Pure projection — no I/O, no side effects, memoized on `[events, currentSequence]`. Walks events with `event.sequence <= currentSequence` in order and applies these reducers:

| Event type | What the reducer mutates |
|---|---|
| `GameCreated` | seeds the initial `tokens` array from `payload.units` (one Mech-variant `IUnitToken` per unit) and reads `mapRadius` from `payload.config.mapRadius` |
| `MovementDeclared` | sets `token.position = payload.to`, `token.facing = payload.facing` |
| `DamageApplied` | tracks accumulated location damage on a per-unit map (used by `armorPipState` projection — best-effort summary, full record-sheet rendering is out-of-scope) |
| `LocationDestroyed` | flags the location in the per-unit damage map; if the location is `'CT'` flips `isDestroyed` |
| `UnitDestroyed` | sets `token.isDestroyed = true` |
| `UnitFell` | tags the unit prone (rendered as a status overlay; HexMapDisplay's existing prone visualization, no new prop) |
| `UnitStood` | clears the prone tag |
| `HeatGenerated` / `HeatDissipated` | tracks `currentHeat` per unit (rendered downstream by the page's existing heat indicator if the page wires it; no new map prop) |
| `PilotHit` | increments per-unit `pilotWounds` |

`hexTerrain` is reconstructed from `GameCreated` if the payload carries terrain (current schema does not — terrain is implicit in `mapRadius`); when absent the reducer returns an empty `hexTerrain` array and the existing `HexMapDisplay` Clear-default rendering applies.

### Replay page integration

Modify `src/pages/gameplay/games/[id]/replay.tsx`:

- Add `JsonlFileLoader` mount in the right-panel.
- When a JSONL file is loaded, the page replaces the `useReplayPlayer`-derived `events` source with the uploaded event list (promotes the upload over `useGameTimeline`).
- Replace the placeholder card in the center pane with `<HexMapDisplay {...stateFromReducer} />`.
- Add a small "loaded from file" indicator + a "clear upload" button to revert to the DB-loaded events.

The existing `useReplayPlayer` hook stays as-is — it already accepts a generic event list. Only its consumer wiring changes.

### Spec deltas

- `quick-session`: ADD `Replay Viewer Consumes Persisted NDJSON Files` requirement — covers the JSONL loader contract (parse, validate, line-level error reporting, event-list promotion).
- `combat-analytics`: ADD `Replay State-From-Events Reducer Contract` requirement — pure projection from `readonly IGameEvent[]` + `currentSequence: number` to `{ tokens, hexTerrain, mapRadius }`; covers the eight event families above; covers idempotence (replaying the same prefix produces the same state); covers cursor monotonicity (`currentSequence` < `prevSequence` re-runs from `GameCreated`).

The reducer lives in `combat-analytics` rather than a brand-new `replay-viewer` spec because (a) the reducer is the same kind of typed-event consumer that `EventLogQuery` is, and (b) we already absorbed the column-formatter and `EventLogQuery` into existing specs to keep the spec count manageable. A future replay UI feature pass (key-moment markers, scrubber annotations) will earn its own spec.

## Impact

- **Affected types**: none (no schema changes — pure consumer-side projection).
- **Affected code**:
  - NEW `src/components/audit/replay/JsonlFileLoader.tsx` (~120-160 LOC)
  - NEW `src/hooks/replay/useHexMapStateFromEvents.ts` (~200-260 LOC)
  - NEW `src/components/audit/replay/__tests__/JsonlFileLoader.test.tsx` (~120 LOC)
  - NEW `src/hooks/replay/__tests__/useHexMapStateFromEvents.test.ts` (~180-220 LOC)
  - MODIFY `src/pages/gameplay/games/[id]/replay.tsx` — wire loader + reducer; replace placeholder card with `HexMapDisplay`
- **Affected specs**: `quick-session` (ADDED), `combat-analytics` (ADDED).
- **Risk**: low — pure projection + drag-drop; no engine code changed; existing replay-page tests stay valid (the placeholder-card branch is replaced cleanly).

## Out of scope

- **Key-moment timeline markers** (PR A3 in the bundle plan).
- **Quick-game integrated replay panel** (PR A2 in the bundle plan).
- **In-page upload from arbitrary URL / cloud storage** — file system only.
- **Animation interpolation between hex moves** — reducer emits post-step end states only. Per-step animation can come later via `MovementAnimationMode` overlays without reducer changes.
- **Record-sheet pip-level damage visualization** — the per-unit damage map exists in the reducer but only `isDestroyed` flips; a future change can route the map into `armorPipState` for full pip rendering.
- **Cooperative / multiplayer fog-aware replay** — the reducer reads the un-redacted `IGameEvent` and renders un-fogged tokens. Fog-of-war replay (consuming `IRedactedUnitDestroyedPayload` etc.) is a follow-on tied to Track B in the bundle plan.
