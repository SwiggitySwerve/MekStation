# Tasks: Add Cover Overlay Source Context

## 1. Spec contract

- [x] 1.1 Author proposal/tasks/spec delta for cover overlay terrain/elevation source context
- [x] 1.2 Add `tactical-map-interface` requirement for inspectable cover overlay source context

## 2. Implementation

- [x] 2.1 Add terrain feature and primary terrain metadata to cover overlay rows
- [x] 2.2 Add elevation metadata to cover overlay rows
- [x] 2.3 Include cover, terrain, and elevation context in the cover overlay accessible title
- [x] 2.4 Preserve existing visible cover labels and cover calculation

## 3. Verification

- [x] 3.1 Add focused HexMapDisplay coverage for cover overlay source metadata
- [x] 3.2 Focused Jest coverage passes
- [x] 3.3 `npm.cmd run typecheck` passes
- [x] 3.4 `npm.cmd run lint` passes
- [x] 3.5 `npm.cmd run format:check` passes
- [x] 3.6 `npx.cmd openspec validate add-cover-overlay-source-context --strict` passes
