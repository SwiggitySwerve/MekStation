# Tasks: Add Layered Tactical Combat Map

## 1. Spec + contracts

- [x] 1.1 Create OpenSpec change `add-layered-tactical-combat-map`
- [x] 1.2 Add map-view contract types for projection mode, layer ids, and layer state
- [x] 1.3 Preserve old overlay boolean accessors while routing them through typed layer state

## 2. Tactical map rendering

- [x] 2.1 Add render-only projection transform for `topDown` and `isometricPreview`
- [x] 2.2 Add map control to toggle projection mode without changing axial click outputs
- [x] 2.3 Keep existing top-down controls, minimap, and token interactions functional

## 3. Terrain/session wiring

- [x] 3.1 Allow `GameEngine` to receive a canonical `IHexGrid`
- [x] 3.2 Convert generated maps and encounter terrain presets into engine grids
- [x] 3.3 Use configured grids in quick-game, skirmish, interactive, auto-resolve, and spectator launch paths
- [x] 3.4 Render the active session grid through `HexMapDisplay`

## 4. Verification

- [x] 4.1 Unit tests for projection toggling and layer visibility
- [x] 4.2 Engine tests for injected/generated/preset terrain grids
- [x] 4.3 `npm run typecheck`
- [x] 4.4 `npm run lint`
- [x] 4.5 Targeted tactical map and engine tests
- [x] 4.6 `openspec validate add-layered-tactical-combat-map --strict`
- [x] 4.7 Targeted Playwright map smoke
