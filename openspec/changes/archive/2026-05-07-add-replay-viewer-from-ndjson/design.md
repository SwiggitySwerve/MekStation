# Replay Viewer From NDJSON — Design

## Context

The CLI swarm runner persists every encounter as `<gameId>.jsonl` (NDJSON, one `IGameEvent` per line, sequence-ordered). The browser already has the `useReplayPlayer` + `ReplayTimeline` + `ReplayControls` infrastructure, but its `reducers` map is hard-coded to `{}` and the visualization pane is a placeholder card. There is no way to load a swarm-run file from disk into the page, and no projection from the typed `IGameEvent` discriminated union to `IUnitToken[]`.

The two existing surfaces this change touches:

- `src/pages/gameplay/games/[id]/replay.tsx` — already pulls events from `useGameTimeline(gameId)`, drives `useReplayPlayer`, and mounts `ReplayTimeline` + `ReplayControls`. The center pane currently shows an "Event N of M" placeholder that this change replaces with `HexMapDisplay`.
- `src/components/gameplay/HexMapDisplay/HexMapDisplay.tsx` — accepts `tokens: readonly IUnitToken[]`, `events?: readonly IGameEvent[]`, `hexTerrain?: readonly IHexTerrain[]`, `radius: number`. The reducer's output shape feeds these props directly.

The typed-event substrate is solid: `IGameEvent` is a discriminated union over `GameEventType`, the envelope carries `side`, `turn`, `phase`, `actorId`, `sequence`, the payload union covers ~50 event types, `EventLogQuery` is in place. We are NOT modifying any of that — this change is pure consumer-side.

## Goals / Non-Goals

**Goals:**

1. A user can drag a swarm `.jsonl` into the replay page and see the hex map immediately reflect the loaded encounter.
2. Stepping the timeline scrubber forward / backward updates the hex map frame-by-frame (post-step end states, no animation interpolation).
3. Parse / validation errors surface per-line so a malformed file does not silently render an empty map.
4. Existing replay-page tests, audit-store integration, and `useReplayPlayer` behavior stay valid — uploaded events PROMOTE over DB events; clearing the upload reverts.
5. Source-of-truth specs (`quick-session`, `combat-analytics`) absorb the new requirements cleanly via `## ADDED Requirements`.

**Non-Goals:**

1. Per-step animation interpolation between hexes (post-step end states only).
2. Record-sheet-level damage pip rendering (the reducer tracks accumulated location damage but only flips `isDestroyed` on `LocationDestroyed`-CT or `UnitDestroyed`).
3. Key-moment timeline markers (PR A3).
4. Quick-game integrated replay panel (PR A2).
5. Fog-of-war replay (Track B follow-on; the reducer reads un-redacted events as authoritative).
6. URL / cloud-storage event log loaders (filesystem drag-drop only).
7. Server-side persistence of uploaded files (the loader is purely client-side; uploads live in component state).

## Decisions

### D1 — Reducer placement: `src/hooks/replay/`, NOT `src/utils/events/stateDerivation.ts`

The repo already ships a generic `deriveStateWithCheckpoint` reducer harness in `src/utils/events/stateDerivation.ts` that `useReplayPlayer` consumes. We DO NOT extend that harness. Reasoning:

- `stateDerivation.ts` is for the audit `EventStoreService` `IBaseEvent` shape (typed `category` + `payload: unknown`), NOT the gameplay `IGameEvent` discriminated union. Forcing a single `ReducerMap` to handle both shapes would require either widening `IGameEvent` to `IBaseEvent` (loses discriminated narrowing) or branching at every reducer key (makes call sites conditional on event shape).
- The new reducer ships as a top-level hook (`useHexMapStateFromEvents`) that internally walks `events` once. It does NOT use the `ReducerMap<TState>` map shape; it uses a single switch on `event.type` so each branch narrows the payload via the discriminated union.

The replay page's existing `useReplayPlayer({ reducers: {} })` mount stays unchanged — `useReplayPlayer` now drives the scrubber's `currentSequence` cursor only; the new hook reads that cursor directly. Result: zero changes to `useReplayPlayer`, zero changes to `stateDerivation.ts`, isolated new code.

### D2 — Pure-projection contract

`useHexMapStateFromEvents(events, currentSequence)` is a pure function over its inputs:

- No I/O, no side effects, no React refs.
- `useMemo`-d on `[events, currentSequence]` so re-renders that don't change the cursor reuse the prior projection.
- Idempotent: replaying the same `(events, currentSequence)` pair always produces the same result.
- Cursor monotonicity NOT assumed: stepping the scrubber backward re-runs the walk from `GameCreated`. For very long event logs (~1000+ events) we accept the O(N) re-walk on backward seek; a forward-only optimization can come later.

### D3 — Event-family coverage

The reducer covers exactly eight event families that affect on-map state. Other event types pass through silently. The covered set:

| Family | Event types | Mutation |
|---|---|---|
| Lifecycle | `GameCreated` | Seeds initial `tokens` from `payload.units` and `mapRadius` from `payload.config.mapRadius` |
| Position | `MovementDeclared` | Updates `position` + `facing` for the actor |
| Damage | `DamageApplied`, `LocationDestroyed`, `TransferDamage` | Tracks per-unit per-location damage map; flips `isDestroyed` on CT-destroyed |
| Lethal | `UnitDestroyed` | Sets `isDestroyed = true` |
| Posture | `UnitFell`, `UnitStood` | Toggles a per-unit `prone` flag (rendered via existing token component) |
| Heat | `HeatGenerated`, `HeatDissipated` | Tracks `currentHeat` per unit (read by token's existing heat-band rendering) |
| Pilot | `PilotHit` | Increments per-unit `pilotWounds` |

Out-of-band event types (initiative, attack-declared, attack-resolved without damage, ammo-explosion that emits a follow-up `DamageApplied`, `RetreatTriggered`, vehicle-specific motive events, BA-specific trooper / swarm events, ProtoMech / Aerospace combat-state events) are NOT consumed by the reducer in this PR. They flow through the timeline scrubber but do not change `tokens`. A follow-on can extend coverage as needed.

### D4 — Token construction from `GameCreated`

`payload.units: readonly IGameUnit[]` carries `unitId`, `name`, `side`, `unitType?`, plus per-type construction fields. The reducer constructs the matching `IUnitToken` variant (Mech / Vehicle / Aerospace / BattleArmor / Infantry / ProtoMech) via a switch on `unit.unitType ?? UnitType.BattleMech`. For each variant we seed:

- `unitId`, `name`, `side`, `designation` (use `unit.unitRef` last segment if `name` is too long)
- `position`: derived from initial deployment if available; falls back to `{ q: 0, r: 0 }`. Initial deployment is read from `payload.config.initialPositions?` (an existing field on `IGameConfig` per the swarm's deployment seeding) when present; otherwise the unit starts at origin and the first `MovementDeclared` repositions it.
- `facing: Facing.North` as the safe default; the first `MovementDeclared` corrects it.
- `isSelected: false`, `isValidTarget: false`, `isDestroyed: false`.
- Per-type required fields default to safe values (Mech: omit sprite props → fallback medium-humanoid; Vehicle: no turret; Aerospace: `altitude: 0`; BA / Infantry / Proto: trooper / platoon / point counts of 1).

Reducer correctness depends on `GameCreated` being event #0. The persisted NDJSON contract already guarantees this (the runner emits `GameCreated` first; sequence ordering is monotonic).

### D5 — Map radius from `IGameConfig`

`mapRadius` is read from `payload.config.mapRadius` on `GameCreated`. The reducer returns this value alongside `tokens` so the page passes it directly to `<HexMapDisplay radius={...} />`.

### D6 — `JsonlFileLoader` parses, validates, and reports per-line errors

The loader is a small drop zone + file picker. It does NOT touch the network. The parsing pipeline:

1. Read file as UTF-8 text via `FileReader.readAsText`.
2. Split on `\n`, strip empty lines.
3. For each line: `JSON.parse(line)`. On failure, push `{ line: i, error: 'not valid JSON' }`.
4. For each parsed object: `isGameEvent(obj)` (type guard already in `GameSessionInterfaces.ts:1930`). On failure, push `{ line: i, error: 'not a valid IGameEvent' }`.
5. Promote `events` ONLY if zero errors. Otherwise render the error list and keep prior state.

This is intentionally strict: a single bad line rejects the whole file. Users with corrupted files can hand-edit the offending line and re-drop.

### D7 — Replay page wiring

The page maintains both event sources and prefers the upload when present:

```ts
const [uploadedEvents, setUploadedEvents] = useState<readonly IGameEvent[] | null>(null);
const dbEvents = useGameTimeline(gameId).allEvents;
const events = uploadedEvents ?? (dbEvents as readonly IGameEvent[]);
```

`useReplayPlayer` is mounted with the chosen list (its options accept `events` indirectly via the audit store today; we expose a thin adapter that synthesizes an event-store query result from `uploadedEvents` when present — alternative: refactor `useReplayPlayer` to accept events directly. We choose the adapter to keep `useReplayPlayer`'s public contract stable for PR A2 + A3 which reuse it).

The `currentSequence` cursor flows from `useReplayPlayer` into `useHexMapStateFromEvents`. The reducer's output `{ tokens, hexTerrain, mapRadius }` flows into the `<HexMapDisplay>` mount that replaces the placeholder card.

### D8 — Spec-delta home

- `quick-session` already owns the NDJSON persistence + Python formatter contracts. The new "Replay Viewer Consumes Persisted NDJSON Files" requirement extends it on the consumer side.
- `combat-analytics` already owns `EventLogQuery`. The new "Replay State-From-Events Reducer Contract" lives there as the second TypeScript event-stream consumer utility.

We do NOT create a brand-new `replay-viewer` spec for this PR — there isn't enough surface to justify it yet. PR A3 (timeline markers + key-moment scrubber) may earn a dedicated spec when its surface stabilizes.

## Risks / Trade-offs

| Risk | Mitigation |
|---|---|
| Reducer projection drifts from the live engine's view of state | Tests assert state at frame N via `EventLogQuery` slicing; smoke test against a real swarm `.jsonl` end-to-end. The reducer is deliberately narrow (eight families) so coverage gaps are visible. |
| Strict per-line validation rejects useful but slightly malformed files | Per-line error reporting tells the user EXACTLY what to fix; bad-input acceptance is a worse UX. |
| Backward seek triggers full O(N) re-walk on long replays | Acceptable for ~1000-event encounters (sub-millisecond). A forward-only checkpoint cache is a follow-on if profiling shows hot frames during scrubbing. |
| `useGameTimeline` adapter for uploaded events introduces a contract surface | The adapter is private to the page; it's a thin wrapper that returns `{ allEvents: uploadedEvents, isLoading: false, error: null, pagination, loadMore: noop }` so `useReplayPlayer` sees the same shape. |
| Token initial position not in `GameCreated` payload | Defaults to origin; the first `MovementDeclared` corrects. Acceptable for replays since the user is scrubbing forward; the only visual artifact is at sequence 0 before any movement event fires. |
| Reducer can't render every event type's effect (e.g., ProtoMech jump rules) | This PR explicitly scopes coverage to eight families. Out-of-band events flow through the scrubber but the map shows last-known state. A follow-on can extend coverage. |

## Migration Plan

No data migration required — pure additive change. Existing replay-page DB-event flow stays as the default; uploads are opt-in.

## Open Questions

- **Should the JSONL loader live at the same `/gameplay/games/[id]/replay` route, or a new `/gameplay/replay` route?** Default: same route, upload PROMOTES over DB events with a "loaded from file" indicator. A standalone route can be added later if friction surfaces.
- **Should `hexTerrain` be reconstructed from terrain events?** Today the engine doesn't emit terrain-mutation events (no magma damage, no smoke, no fire spread). When those events arrive (already-named follow-on), the reducer extends; for this PR, terrain is empty (HexMapDisplay's Clear default applies).
