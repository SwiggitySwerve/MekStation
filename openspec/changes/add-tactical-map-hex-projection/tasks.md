# Tasks: Add Tactical Map Hex Projection

## 1. Spec contract

- [x] 1.1 Author proposal/design/tasks for the per-hex projection slice
- [x] 1.2 Add `tactical-map-interface` delta for a unified rules-backed hex projection

## 2. Projection helper

- [x] 2.1 Add `ITacticalMapHexProjection` and pure builder helper
- [x] 2.2 Cover default terrain, legal movement, blocked movement, attackable combat, blocked combat, mixed movement/combat, path, selected, hover, and legacy attack-range cases

## 3. HexMapDisplay wiring

- [x] 3.1 Build the projection lookup from existing terrain/movement/combat/path state
- [x] 3.2 Render cells from the projection lookup instead of separate movement/combat/terrain lookups
- [x] 3.3 Add stable rendered metadata for projection status, intent, and blocked reasons
- [x] 3.4 Preserve top-down and isometric behavior
- [x] 3.5 Preserve projection summary metadata on isometric scene hex wrappers
- [x] 3.6 Preserve projection status and explanation context in rendered hex title/accessible labels
- [x] 3.7 Preserve projection explanations on isometric scene hex wrappers

## 4. Verification

- [x] 4.1 Focused Jest coverage passes
- [x] 4.2 `npm.cmd run typecheck` passes
- [x] 4.3 `npm.cmd run lint` passes
- [x] 4.4 `npm.cmd run format:check` passes
- [x] 4.5 `npx.cmd openspec validate add-tactical-map-hex-projection --strict` passes
- [x] 4.6 Focused Playwright browser coverage passes
- [x] 4.7 Focused render coverage proves movement, terrain, unreachable, and combat hex labels carry projection context
- [x] 4.8 Focused render coverage proves isometric scene hex wrappers carry projection explanations
