# Tasks: Demote Legacy Attack Range Projection

## 1. Spec contract

- [x] 1.1 Author proposal/tasks/spec delta for legacy range fallback status
- [x] 1.2 Validate the focused OpenSpec change

## 2. Projection contract

- [x] 2.1 Stop treating legacy-only `attackRange` fallback as a legal
      top-level projection
- [x] 2.2 Preserve weapon-backed empty in-range combat projection as legal range
      context
- [x] 2.3 Keep legacy fallback source metadata distinguishable from
      weapon-backed combat projection metadata

## 3. Verification

- [x] 3.1 Add focused projection unit coverage
- [x] 3.2 Add focused HexMapDisplay legacy fallback coverage
- [x] 3.3 Focused Jest coverage passes
- [x] 3.4 `npm.cmd run typecheck` passes
- [x] 3.5 `npm.cmd run lint` passes
- [x] 3.6 `npm.cmd run format:check` passes
