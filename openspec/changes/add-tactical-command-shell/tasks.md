## 1. Shell Contract

- [x] 1.1 Define `ITacticalShellState`, shell modes, slot ids, and primary-home mapping in gameplay UI types
  > **Note (Wave 7.0 gate):** `ITacticalShellState` MUST distinguish three independent unit references — `selectedUnit` (clicked token), `activeUnit` (whose turn it is), and `inspectedUnit` (open in right-tray record sheet). Action dock binds to `activeUnit`; inspector binds to `inspectedUnit`; map highlight binds to `selectedUnit`. No cross-coupling. This avoids the MegaMek PR #5540 → #5573 firing-arc regression where a single `currentEntity` reference silently broke arc redraw on cross-selection.
  > **Note (Wave 7.0 gate):** `ITacticalShellState` MUST carry `viewerPlayerId` and `opponentVisibilityScopes` from day one (see spec.md `Per-Viewer Visibility Scope` requirement). These fields are forward-compat hooks for co-op N≥2 and PvP campaigns — they may be defaulted in single-viewer matches but the type surface lands now to avoid a future breaking change to the shell contract.
- [x] 1.2 Add a shell slot registry that maps phase, actions, inspectors, lenses, event feed, minimap, and replay controls to owners
  > **Note (Wave 7.0 gate):** This task creates the slot-registry surface. Lens additions in `add-tactical-map-lenses-feed-replay` that extend `src/components/gameplay/HexMapDisplay/useMapLayerState.ts` MUST wait for this slot registry to land — sequencing constraint to avoid a collision between shell ownership of the lens-control surface and lens-id extensions to the underlying layer state.

## 2. Layout Composition

- [x] 2.1 Create a tactical command shell component around the existing map without wrapping the map in a card
- [x] 2.2 Move phase banner, action panel, minimap, inspector, and event feed into named slots
- [ ] 2.3 Add pinned/collapsed tray behavior with persistence scoped to the current match

## 3. Mode Integration

- [ ] 3.1 Render combat, replay, spectator, and GM/referee shell modes from the same slot contract
- [ ] 3.2 Disable private commands in spectator mode while preserving public map and feed tools

## 4. Verification

- [ ] 4.1 Component tests for slot ownership, pinned tray persistence, and mode switching
- [ ] 4.2 Playwright screenshot checks at desktop, tablet, and mobile widths proving map remains dominant
- [ ] 4.3 Accessibility check that focus order follows top band, map, action dock, side trays, then feed
