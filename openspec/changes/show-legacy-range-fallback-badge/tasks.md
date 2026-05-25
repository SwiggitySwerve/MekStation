# Tasks: Show Legacy Range Fallback Badge

## 1. Spec contract

- [x] 1.1 Author proposal/tasks/spec delta for the legacy range-only badge
- [x] 1.2 Validate the focused OpenSpec change

## 2. Badge behavior

- [x] 2.1 Render a compact `RNG` badge only for legacy-only `attackRange`
      fallback projections
- [x] 2.2 Preserve neutral top-level status and `range-only` combat-channel
      status
- [x] 2.3 Expose legacy source metadata and explanation through badge metadata
- [x] 2.4 Leave weapon-backed combat range badges unchanged

## 3. Verification

- [x] 3.1 Focused HexMapDisplay combat projection Jest coverage passes
- [x] 3.2 `npm.cmd run typecheck` passes
- [x] 3.3 `npm.cmd run lint` passes
- [x] 3.4 Format, diff, and strict OpenSpec validation pass
