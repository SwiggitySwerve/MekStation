# Tasks: Pin Directional Cliff Movement Metadata

## 1. Spec contract

- [x] 1.1 Author proposal/tasks/spec deltas for directional cliff movement metadata
- [x] 1.2 Validate the OpenSpec change strictly

## 2. Implementation

- [x] 2.1 Add explicit cliff-top exit metadata to terrain feature encoding
- [x] 2.2 Add WiGE +1 MP cliff-ascent surcharge through shared movement costs
- [x] 2.3 Block represented vehicle upward cliff movement when no pavement/road surface cancels it
- [x] 2.4 Preserve ordinary hill/elevation movement when no cliff metadata is encoded

## 3. Verification

- [x] 3.1 Add focused movement projection and commit-validation coverage
- [x] 3.2 Focused movement tests pass
- [x] 3.3 `npx.cmd openspec validate pin-directional-cliff-movement-metadata --strict` passes
- [x] 3.4 `npm.cmd run typecheck` passes
- [x] 3.5 `npm.cmd run lint` passes
- [x] 3.6 `npm.cmd run format:check` passes
- [x] 3.7 `npm.cmd run build` passes
- [x] 3.8 `git diff --check` passes
