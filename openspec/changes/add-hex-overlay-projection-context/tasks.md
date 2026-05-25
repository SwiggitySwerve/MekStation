# Tasks: Add Hex Overlay Projection Context

## 1. Spec contract

- [x] 1.1 Author proposal/tasks/spec delta for overlay-level projection context
- [x] 1.2 Add `tactical-map-interface` requirement for overlay highlight projection metadata

## 2. Implementation

- [x] 2.1 Add accessible overlay labels derived from shared projection state
- [x] 2.2 Expose projection status, movement/combat channel status, blocked reasons, sources, and explanation on overlay paths
- [x] 2.3 Preserve existing overlay kind and legacy-fallback metadata

## 3. Verification

- [x] 3.1 Add focused movement overlay projection-context assertions
- [x] 3.2 Add focused combat overlay projection-context assertions
- [x] 3.3 Focused movement Jest coverage passes
- [x] 3.4 Focused combat Jest coverage passes
- [x] 3.5 `npx.cmd openspec validate add-hex-overlay-projection-context --strict` passes
- [x] 3.6 `npx.cmd oxfmt --check` passes for touched TypeScript files
- [x] 3.7 `npm.cmd run typecheck` passes
- [x] 3.8 `npm.cmd run lint` passes
- [x] 3.9 `git diff --check` passes
