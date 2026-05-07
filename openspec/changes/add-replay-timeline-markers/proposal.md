# Add timeline key-moment markers + ComponentDestroyed reducer arm

## Why

The Replay Viewer Bundle's PR A1 (`add-replay-viewer-from-ndjson`) shipped a hex-map state-from-events reducer covering eight event families. PR A2 (`add-quickgame-replay-panel`) wired the panel into the quick-game results page. Two threads remain to close the bundle:

1. **Timeline visual aids.** The `<ReplayTimeline>` today renders one colored marker per event using only the audit-style `EventCategory` palette — every gameplay event collapses to the same amber color. A 1000-event swarm replay is unreadable: the user can't visually find the kills, crits, or pilot hits without scrubbing event-by-event. Phase boundaries are also invisible, so locating "turn 7 weapon-attack phase" requires reading every event label.

2. **Damage rendering on the hex map.** The Council's Phase-3 follow-on (2026-05-07) found that `ComponentDestroyed` + `CriticalHitResolved` are the **only** reducer-expansion candidates that pass all three Oracle gates: (a) the runner emits these events today, (b) the consumer field exists on the token (`IMechToken.armorPipState` per `UnitSpriteTypes.ts:122`), AND (c) the reducer transformation is mechanical. Wiring this arm makes the hex-map replay show real damage progression instead of every mech rendering as fresh-off-the-lot until it's fully destroyed.

PR A3 closes both threads in one change.

## What

### Thread 1 — Timeline marker overlays

NEW component `src/components/audit/replay/KeyMomentMarkers.tsx`:

- Overlay rendered above the existing `<ReplayTimeline>` track.
- Slices key-moment events from the timeline's event log via `EventLogQuery.from(events).ofType(X)` (per the just-shipped PR D from the line-format suite).
- Renders colored badges at marker `position` (0–1) per event type:
  - `UnitDestroyed` → red
  - `CriticalHit` / `CriticalHitResolved` → orange
  - `AmmoExplosion` → purple
  - `PilotHit` → yellow
  - `UnitFell` → gray
- Click → seek to the event's `sequence` via the parent's `onSeek` callback.

NEW component `src/components/audit/replay/PhaseChangeMarkers.tsx`:

- Dotted vertical lines at every `TurnStarted` and `PhaseChanged` event position.
- Reads `event.turn` + `event.phase` from the envelope (already shipped via PR B of the line-format suite).
- Tooltip on hover: "Turn 7 — Weapon Attack".

MODIFY `src/components/audit/replay/ReplayTimeline.tsx`:

- Accept two optional new props: `keyMoments?: readonly IGameEvent[]` and `phaseChanges?: readonly IGameEvent[]`.
- When provided, compose `<KeyMomentMarkers>` and `<PhaseChangeMarkers>` overlays on top of the existing track.
- When omitted, the timeline renders unchanged (preserves audit-store consumers that don't have gameplay events).

### Thread 2 — `ComponentDestroyed` + `CriticalHitResolved` reducer arm

MODIFY `src/hooks/replay/useHexMapStateFromEvents.ts`:

- Extend the reducer's covered event-families table with two new entries:
  - `ComponentDestroyed` → If unit is a Mech, populate `IMechToken.armorPipState`. Compute archetype (`humanoid` / `quad` / `lam` from the unit's `unitType` / `isQuad` / `isLAM` flags). Initialize the `locations` map to `'full'` for all `BipedPipLocation`s (or `QuadPipLocation`s) on first damage, then transition the affected location:
    - `armor: full → partial` on first damage event
    - `armor: partial → structure` when armor reaches 0 (proxy: location appears on `damagedLocations` AND payload's `componentType` is internal — `engine`, `gyro`, `weapon`, `actuator`, `heat_sink`, `cockpit`, `sensor`, `life_support`, `jump_jet`, `ammo`)
    - `structure → destroyed` when `LocationDestroyed` already fired on this location (cross-references the existing per-unit damage map)
  - `CriticalHitResolved` → Same transition logic; covers the new (P4) emitter path while `ComponentDestroyed` covers the legacy (Phase-3) path.
- Per-unit damage map already exists in the accumulator (per PR A1 design); this PR threads it into the public `armorPipState` field on the projected token.
- Non-Mech tokens (Vehicles, Aerospace, BattleArmor, Infantry, ProtoMech) SHALL pass `ComponentDestroyed` events through silently — `armorPipState` is Mech-only per `IMechToken`.

### Spec deltas

`combat-analytics` MODIFIED:

1. **Replay State-From-Events Reducer Contract** — extends the covered-event-families table with `ComponentDestroyed` and `CriticalHitResolved` rows; documents the `armorPipState` projection for Mech tokens.

`combat-analytics` ADDED:

2. **Replay Timeline Key-Moment Markers Contract** — describes the new marker overlays, click-to-seek, and the optional-prop opt-in for the existing `<ReplayTimeline>`.

## Impact

- **Affected types**: none (`IMechToken.armorPipState` and `ArmorPipState` already exist; `ComponentDestroyed` + `CriticalHitResolved` payloads already exist).
- **Affected code**:
  - NEW `src/components/audit/replay/KeyMomentMarkers.tsx` (~80-120 LOC)
  - NEW `src/components/audit/replay/PhaseChangeMarkers.tsx` (~60-80 LOC)
  - NEW `src/components/audit/replay/__tests__/KeyMomentMarkers.test.tsx` (~80 LOC)
  - NEW `src/components/audit/replay/__tests__/PhaseChangeMarkers.test.tsx` (~60 LOC)
  - MODIFY `src/components/audit/replay/ReplayTimeline.tsx` — add optional `keyMoments` / `phaseChanges` props and compose overlays when present
  - MODIFY `src/components/audit/replay/index.ts` — re-export new components
  - MODIFY `src/hooks/replay/useHexMapStateFromEvents.ts` — add `ComponentDestroyed` + `CriticalHitResolved` reducer arms; extend Mech token projection with `armorPipState`
  - MODIFY `src/hooks/replay/__tests__/useHexMapStateFromEvents.test.ts` — add coverage for the new reducer arms
  - MODIFY `src/pages/gameplay/games/[id]/replay.tsx` — pass `keyMoments` + `phaseChanges` from the uploaded events into the timeline
  - MODIFY `src/components/quickgame/QuickGameReplayPanel.tsx` — same pass-through for the in-page panel
- **Affected specs**: `combat-analytics` (1 MODIFIED, 1 ADDED requirement).
- **Risk**: low-medium. Pure projection extension on the reducer side; pure overlay composition on the UI side. The new ReplayTimeline props are optional, so existing audit-store consumers are unaffected.

## Out of scope

- Animation interpolation between hex steps (still post-step states only — same as A1).
- Other reducer expansions deferred per Council #3 — `UnitRetreated`, `TrooperKilled`, `MotiveDamaged`, pilot-wound rendering. Each fails one of the three gates today.
- Vehicle / Aerospace damage projection (no `armorPipState` field on those tokens; future work).
- Marker virtualization for >5000-event logs (current naive render fine up to ~2000 events).
