# Design: Add Scenario Objective Engine

## Context

The combat engine is otherwise complete for a standard skirmish — the six-phase loop, damage resolution, and the typed event log all work. The single gap blocking "play a fully generated scenario" is that victory is hardcoded to destruction. The scenario layer already declares objective *types* (`ScenarioObjectiveType`) and victory *conditions* (`IVictoryCondition`), but neither the map nor the game-over check carries any spatial objective data. This change supplies the missing middle: a spatial objective model, placement, control detection, and victory evaluation.

## Goals / Non-Goals

**Goals:**

- Make `Capture`, `Defend`, and `Breakthrough` scenarios winnable end-to-end.
- Express `Destroy` through the same objective engine so the game-over check has one uniform path.
- Keep objective evaluation deterministic — a pure function of seed and unit positions.
- Render objectives on the tactical map so a human player can see what to do.

**Non-Goals:**

- `Escort` / `Recon` objective types (separate lifecycle mechanics).
- Multi-stage objectives, campaign rewards, AI objective-seeking.

## Decisions

### D1. Objective markers live on the game session, not on `IHex`

`IHex` (`{ q, r, elevation, terrainType, features[] }`) is shared by terrain generation, the hex-coordinate system, and rendering. Adding objective fields would couple scenario logic into the hex primitive. Instead the session carries `objectives: Record<HexKey, IObjectiveMarker>` where `HexKey` is the canonical `"q,r"` string. Markerless sessions (`{}`) behave exactly as today.

### D2. `IObjectiveMarker` shape

```typescript
type HexKey = string; // "q,r"

interface IObjectiveMarker {
  readonly id: string;
  readonly hexKey: HexKey;
  readonly objectiveType: 'capture' | 'defend' | 'breakthrough';
  readonly owningSide: GameSide | 'neutral';   // initial controller
  readonly controlSide: GameSide | 'neutral';  // current controller (mutable via reducer)
  readonly controlRule: 'sole-occupancy';
  readonly holdTurnsRequired: number;          // consecutive turns to win (Capture)
  readonly holdProgress: number;               // consecutive turns currently held
}
```

### D3. Control rule is sole-occupancy, sticky on contest

A side controls a hex when it has ≥1 unit on that hex and the opposing side has 0. If both sides have units on the hex it is *contested* — `controlSide` is unchanged (sticky to the last controller). A vacated hex also keeps its last controller. This avoids per-turn flip-flop and is deterministic.

### D4. Victory evaluation is one pure function consulted before the destruction fallback

`evaluateObjectiveOutcome(session): IObjectiveOutcome | null` returns `null` while the scenario is undecided. The game-over check calls it first; only if it returns `null` does the existing destruction / turn-limit logic run. This keeps the change additive.

### D5. Per-objective-type resolution

- **Destroy** — the markerless default: a side wins when all enemy units are destroyed or withdrawn. Equivalent to current behavior, routed through the objective engine for uniformity.
- **Capture** — the attacking side wins when it holds *all* objective hexes for `holdTurnsRequired` consecutive turns (`holdProgress` resets to 0 on any loss of control).
- **Defend** — the defending side wins if it still controls the objective hex(es) at `turnLimit`; the attacker wins immediately on capturing them.
- **Breakthrough** — objective markers are exit-edge hexes; the attacking side wins when `requiredUnits` of its units have reached an exit hex.

### D6. Rendering — a dedicated SVG layer

`ObjectiveMarkersLayer` is added to `HexMapDisplay.layers`, rendered above the terrain overlay and below unit tokens. Markers are styled by `controlSide` (neutral / friendly / enemy / contested). The layer is read-only — it never mutates state.

### D7. Lifecycle events are derived, not authored

The control-detection pass runs once per turn. When `controlSide` changes it emits `ObjectiveCaptured` / `ObjectiveLost`; when `holdProgress` changes it emits `ObjectiveProgress`. All three are deterministic functions of unit positions, so the event log fully replays objective state.

### D8. Type contracts

```typescript
interface IObjectiveOutcome {
  readonly decided: true;
  readonly winningSide: GameSide;
  readonly reason: 'objective';
  readonly objectiveType: ScenarioObjectiveType;
}

GameEventType.ObjectiveCaptured  = 'ObjectiveCaptured';
GameEventType.ObjectiveLost      = 'ObjectiveLost';
GameEventType.ObjectiveProgress  = 'ObjectiveProgress';
```

## Risks / Trade-offs

- **[Risk] Contested-hex flip-flop** → Mitigation: sticky control (D3) — control only changes on uncontested sole occupancy.
- **[Risk] Breakthrough exit hexes overlap retreat edges (Change 3)** → Mitigation: breakthrough exit hexes are explicit `IObjectiveMarker`s; retreat/withdrawal edge logic is separate and never consults the objective map.
- **[Risk] Objective outcome vs. turn-limit draw** → Mitigation: `evaluateObjectiveOutcome` is consulted first; an objective win always takes precedence over a turn-limit draw.
- **[Risk] A scenario with no objective markers but a non-`destroy` type** → Mitigation: placement (task 2) guarantees a non-empty objective map for capture/defend/breakthrough; the evaluator treats an empty map as `destroy`.

## Migration Plan

Purely additive. Existing scenarios carry no `objectives` map, so `evaluateObjectiveOutcome` returns `null` and the current destruction path runs unchanged. New event types are additive — existing consumers ignore unknown events. No database migrations. Rollback = revert the change-set; the unused objective-type enum reverts to inert.

## Open Questions

- Default `holdTurnsRequired` for generated Capture scenarios — proposed `1` (control at end of a turn = captured). Revisit if matches end too quickly.
- Whether neutral objectives may begin owned by a side — proposed: generated scenarios start all markers `neutral`; campaign scenarios (Wave 4) may pre-assign.
