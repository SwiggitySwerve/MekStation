# Change: Add Layered Tactical Combat Map

## Why

The existing tactical combat stack already has a capable SVG hex map and an event-sourced `InteractiveSession`, but playable sessions still route through clear placeholder grids in several launch paths. That makes terrain, cover, LOS, heat, movement cost, and map readability diverge from the generated/imported battlefield the player sees.

This change makes the top-down axial combat map the primary playable surface and adds a small render-only projection contract for an optional isometric preview. Rules remain BattleTech-like and engine-owned; projection and layer controls are presentation state only.

## What Changes

- Add typed map-view contracts: `MapProjectionMode`, `MapLayerId`, and `IMapLayerState`.
- Keep top-down axial hexes canonical for terrain, LOS, range, facing, movement, cover, heat, and attacks.
- Add `isometricPreview` as a render-only SVG projection over the same axial state.
- Thread generated or preset terrain into `GameEngine` / `InteractiveSession` instead of defaulting playable sessions to a clear placeholder grid.
- Expose the live engine grid back to `HexMapDisplay` so rendered terrain matches session rules.
- Preserve the existing SVG rendering path and defer Canvas/Konva work until profiling proves it is needed.

## Impact

- Affected specs: `tactical-map-interface`, `terrain-system`, `game-session-management`.
- Affected code:
  - `src/types/gameplay/GameplayUIInterfaces.ts`
  - `src/engine/GameEngine.ts`
  - `src/engine/GameEngine.helpers.ts`
  - `src/components/gameplay/HexMapDisplay/*`
  - `src/components/gameplay/GameplayLayout.tsx`
  - `src/components/gameplay/SpectatorView.tsx`
  - quick-game and pre-battle launch paths.

## Non-Goals

- Campaign-map expansion.
- Multiplayer rules expansion.
- A separate isometric rules engine or save format.
- Canvas/WebGL migration.
