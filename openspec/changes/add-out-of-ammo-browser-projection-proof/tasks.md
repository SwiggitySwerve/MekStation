# Tasks: Add Out-of-Ammo Browser Projection Proof

## 1. Spec contract

- [x] 1.1 Author proposal/tasks/spec delta for out-of-ammo browser projection proof
- [x] 1.2 Add `tactical-map-interface` requirement coverage for dry selected weapons

## 2. Implementation

- [x] 2.1 Add e2e unit-weapon fixture data for a selected ammo-fed weapon with zero ammo
- [x] 2.2 Route the tactical-map e2e page to the dry-weapon scenario, selected weapon, and target
- [x] 2.3 Add browser assertions for blocked target metadata, `AMMO` badge, and tooltip reason
- [x] 2.4 Pin focused projection/component expectations for empty available weapons and blocked option evidence
- [x] 2.5 Keep dry selected weapons in per-weapon range options as blocked ammo choices

## 3. Verification

- [x] 3.1 Focused combat projection Jest coverage passes
- [x] 3.2 Focused HexMapDisplay combat projection Jest coverage passes
- [x] 3.3 Focused attack projection agreement Jest coverage passes
- [x] 3.4 Focused Playwright out-of-ammo browser proof passes
- [x] 3.5 `npx.cmd openspec validate add-out-of-ammo-browser-projection-proof --strict` passes
- [x] 3.6 `npx.cmd oxfmt --check` passes for touched TypeScript files
- [x] 3.7 `npm.cmd run typecheck` passes
- [x] 3.8 `npm.cmd run lint` passes
- [x] 3.9 `git diff --check` passes
