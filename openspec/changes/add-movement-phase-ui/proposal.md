# Change: Add Movement Phase UI

## Why

The movement phase in the engine alternates unit locks (Player → Opponent →
Player → ...) but there's no way for a human player to execute a move. We
have an A\* pathfinder in `src/utils/gameplay/movement/pathfinding.ts`,
walk/run/jump MP derivation, and hex-cost logic — yet the active unit has
no overlay showing reachable hexes, no path preview, no facing commit, and
no way to lock movement. This change makes the movement phase playable: pick
a destination hex, see the cumulative MP cost, rotate to your desired
facing, commit.

## What Changes

- When a Player-side unit is selected during Movement phase, render a
  reachable-hex overlay colored by MP type (walk=green, run=yellow,
  jump=blue) with MP cost per hex
- Hovering a reachable hex shows the A\* path preview with cumulative MP
- Clicking a reachable hex commits the destination; facing picker appears
- Facing picker lets the player rotate the unit in 60° increments
- "Commit Move" button locks movement; the session advances to the next
  unit's lock

## Dependencies

- **Requires**: `add-interactive-combat-core-ui` (selection + phase HUD
  must be in place), `movement-system` (canonical spec),
  `tactical-map-interface` (hex map + overlays), existing
  `movement/pathfinding.ts` A\* implementation
- **Related**: Lane A A5 `wire-heat-generation-and-effects` — this UI shows
  a _preview_ of movement heat; actual application depends on A5
- **Required By**: `add-attack-phase-ui` (must have a real post-movement
  state to fire from)

## Impact

- Affected specs: `movement-system` (MODIFIED — add UI-facing
  `plannedMovement` projection requirements), `tactical-map-interface`
  (ADDED — reachable-hex overlay, path preview, facing picker)
- Affected code: `src/components/gameplay/HexMapDisplay/` (overlay
  rendering), `src/stores/useGameplayStore.ts` (movement planning state),
  `src/pages/gameplay/games/[id].tsx` (wire the movement UI into the
  combat surface when phase is Movement)
- Non-goals: jumping over buildings (engine already handles it), climbing
  elevation (engine already handles it), multiplayer synchronization of
  planned moves (Phase 4)
