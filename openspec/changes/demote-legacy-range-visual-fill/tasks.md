# Tasks: Demote Legacy Range Visual Fill

## 1. Spec contract

- [x] 1.1 Author proposal/tasks/spec delta for legacy range visual demotion
- [x] 1.2 Add `tactical-map-interface` requirement that legacy range fallback not use weapon-backed attack fill

## 2. Implementation

- [x] 2.1 Add neutral legacy attack-range fallback color
- [x] 2.2 Render legacy fallback overlays with neutral fill
- [x] 2.3 Render dashed non-color outline for legacy fallback range envelopes
- [x] 2.4 Expose overlay kind metadata on rendered hex overlays

## 3. Verification

- [x] 3.1 Add focused legacy fallback render assertions
- [x] 3.2 Focused combat projection Jest coverage passes
- [x] 3.3 `npx.cmd openspec validate demote-legacy-range-visual-fill --strict` passes
- [x] 3.4 `npx.cmd oxfmt --check` passes for touched TypeScript files
- [x] 3.5 `npm.cmd run typecheck` passes
- [x] 3.6 `npm.cmd run lint` passes
- [x] 3.7 `git diff --check` passes
