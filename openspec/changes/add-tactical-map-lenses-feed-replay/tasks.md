## 1. Lens Model

- [ ] 1.1 Define tactical lens presets mapped to map layer ids and intensity defaults
  > **Note (Wave 7.0 gate):** Lens-id extensions to `src/components/gameplay/HexMapDisplay/useMapLayerState.ts` MUST land AFTER `add-tactical-command-shell` task 1.2 (slot registry). The shell owns the lens-control surface (left tray slot); extending `MapLayerId` / `IMapLayerInteractionState` without the slot registry in place risks a collision between shell-side lens ownership and underlying layer-state ownership. Pull request ordering: shell PR-A (types) and PR-B (slot registry + GameplayLayout migration) merge first; this change opens after.
- [ ] 1.2 Add lens state selectors for movement, attack, intel, terrain, objective, and survival views

## 2. Pins and Minimap

- [ ] 2.1 Add tactical pin model with coordinate, label, category, scope, and created turn/phase
- [ ] 2.2 Render pins on map and minimap with layer visibility controls
- [ ] 2.3 Add GM/public/side/local pin projection behavior

## 3. Feed and Replay

- [ ] 3.1 Add feed row map-focus handlers and event priority grouping
- [ ] 3.2 Add replay timeline controls synchronized with map, rail, inspectors, and feed
- [ ] 3.3 Persist or derive replay map terrain/elevation/objective source

## 4. Verification

- [ ] 4.1 Unit tests for lens-to-layer mapping and feed priority
- [ ] 4.2 Component tests for pin visibility and feed row focus
- [ ] 4.3 Replay test proving non-clear terrain map restores without placeholder fallback
