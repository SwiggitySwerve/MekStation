# Tasks: Add Terrain Projection Tooltip Context

## 1. Spec contract

- [x] 1.1 Author proposal/tasks/spec delta for terrain and unreachable projection context
- [x] 1.2 Add `tactical-map-interface` requirement covering terrain-only and unreachable projection rows

## 2. Implementation

- [x] 2.1 Render projection context inside terrain-only hover tooltips
- [x] 2.2 Render projection context inside unreachable hover tooltips
- [x] 2.3 Preserve existing terrain, elevation, cover, LOS, heat-effect, and isometric occluder rows
- [x] 2.4 Render the shared projection explanation as readable text in terrain and unreachable projection context rows

## 3. Verification

- [x] 3.1 Add focused terrain hover assertions for projection status/channel metadata
- [x] 3.2 Add focused unreachable hover assertions for projection status/channel metadata
- [x] 3.3 Focused Jest coverage passes
- [x] 3.4 `npm.cmd run typecheck` passes
- [x] 3.5 `npm.cmd run lint` passes
- [x] 3.6 `npm.cmd run format:check` passes
- [x] 3.7 `npx.cmd openspec validate add-terrain-projection-tooltip-context --strict` passes
- [x] 3.8 Focused terrain and unreachable hover coverage asserts readable projection explanation text
