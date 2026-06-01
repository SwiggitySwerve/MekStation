# Tasks: Pin WiGE Building Climb Cost

## 1. Spec contract

- [x] 1.1 Author proposal/tasks/spec deltas for represented WiGE building climb cost
- [x] 1.2 Validate the OpenSpec change strictly

## 2. Implementation

- [x] 2.1 Add the represented WiGE +2 MP building climb-mode surcharge to shared movement costs
- [x] 2.2 Preserve ordinary WiGE terrain/elevation bypass for non-building represented terrain
- [x] 2.3 Keep movement preview and commit validation aligned through shared cost calculation

## 3. Verification

- [x] 3.1 Add focused movement projection and commit-validation coverage
- [x] 3.2 Focused movement tests pass
- [x] 3.3 `npx.cmd openspec validate pin-wige-building-climb-cost --strict` passes
- [x] 3.4 `npm.cmd run typecheck` passes
- [x] 3.5 `npm.cmd run lint` passes
- [x] 3.6 `npm.cmd run format:check` passes
- [x] 3.7 `npm.cmd run build` passes
- [x] 3.8 `git diff --check` passes
