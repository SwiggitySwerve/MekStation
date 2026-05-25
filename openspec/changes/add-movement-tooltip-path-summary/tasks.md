# Tasks: Add Movement Tooltip Path Summary

## 1. Spec contract

- [x] 1.1 Author proposal/tasks/spec delta for movement tooltip path summaries
- [x] 1.2 Add `tactical-map-interface` requirement for path step summaries in movement hover states

## 2. Implementation

- [x] 2.1 Add shared movement path summary formatter
- [x] 2.2 Render path step summary in movement-only tooltip
- [x] 2.3 Render path step summary in combined movement+combat tooltip
- [x] 2.4 Preserve existing tooltip rows and map path badges
- [x] 2.5 Add browser coverage for top-down and isometric path sequence badges

## 3. Verification

- [x] 3.1 Add focused movement tooltip render coverage
- [x] 3.2 Add focused combined tactical tooltip render coverage
- [x] 3.3 Focused Jest coverage passes
- [x] 3.4 `npm.cmd run typecheck` passes
- [x] 3.5 `npm.cmd run lint` passes
- [x] 3.6 `npm.cmd run format:check` passes
- [x] 3.7 `npx.cmd openspec validate add-movement-tooltip-path-summary --strict` passes
- [x] 3.8 Focused tactical-map browser smoke covers rendered path sequence metadata
