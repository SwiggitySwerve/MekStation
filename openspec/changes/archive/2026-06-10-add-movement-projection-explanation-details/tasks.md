# Tasks: Add Movement Projection Explanation Details

## 1. Spec contract

- [x] 1.1 Author proposal/tasks/spec delta for movement projection explanation details
- [x] 1.2 Add `tactical-map-interface` requirement for projection-level movement details

## 2. Implementation

- [x] 2.1 Add movement mode, terrain cost, elevation delta/cost, heat, and path details to projection explanations
- [x] 2.2 Add stand-up cost, stand-up PSR, and stand-up modifier details when available
- [x] 2.3 Preserve existing terrain, combat, and blocked-reason explanation content
- [x] 2.4 Add tactical-map browser fixture for impossible stand-up movement projection

## 3. Verification

- [x] 3.1 Add focused tactical projection unit coverage
- [x] 3.2 Add HexMapDisplay metadata coverage for rendered projection explanations
- [x] 3.3 Focused Jest coverage passes
- [x] 3.4 `npm.cmd run typecheck` passes
- [x] 3.5 `npm.cmd run lint` passes
- [x] 3.6 `npm.cmd run format:check` passes
- [x] 3.7 `npx.cmd openspec validate add-movement-projection-explanation-details --strict` passes
- [x] 3.8 Browser smoke covers impossible stand-up metadata, badges, and hover reason
