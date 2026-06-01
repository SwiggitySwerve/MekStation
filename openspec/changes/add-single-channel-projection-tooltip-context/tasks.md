# Tasks: Add Single-Channel Projection Tooltip Context

## 1. Spec contract

- [x] 1.1 Author proposal/tasks/spec delta for projection context in single-channel tooltips
- [x] 1.2 Add `tactical-map-interface` requirement covering movement-only and combat-only projection rows

## 2. Implementation

- [x] 2.1 Add reusable projection context rows for hover tooltips
- [x] 2.2 Render projection context inside movement-only hover tooltips
- [x] 2.3 Render projection context inside combat-only hover tooltips
- [x] 2.4 Preserve combined tooltip behavior and existing movement/combat explanations
- [x] 2.5 Render the shared projection explanation as readable text in the reusable projection context rows

## 3. Verification

- [x] 3.1 Add focused movement hover assertions for projection status/channel metadata
- [x] 3.2 Add focused combat hover assertions for projection status/channel metadata
- [x] 3.3 Focused Jest coverage passes
- [x] 3.4 `npm.cmd run typecheck` passes
- [x] 3.5 `npm.cmd run lint` passes
- [x] 3.6 `npm.cmd run format:check` passes
- [x] 3.7 `npx.cmd openspec validate add-single-channel-projection-tooltip-context --strict` passes
- [x] 3.8 Focused movement and combat hover coverage asserts readable projection explanation text
