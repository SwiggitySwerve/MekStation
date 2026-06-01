# Tasks: Pin WiGE Hover And Distance Exemptions

## 1. Spec contract

- [x] 1.1 Author proposal/tasks/spec deltas for WiGE hover and prior-distance exemptions
- [x] 1.2 Validate the OpenSpec change strictly

## 2. Implementation

- [x] 2.1 Count represented hexes already moved this turn in automatic WiGE landing distance
- [x] 2.2 Exempt represented hover movement from automatic WiGE landing projection
- [x] 2.3 Exempt represented hover movement from runtime automatic-landing state patches

## 3. Verification

- [x] 3.1 Add focused helper tests for hover exemption and accumulated movement distance
- [x] 3.2 Add/extend map projection tests proving hover destinations omit landing metadata
- [x] 3.3 Focused movement/runtime tests pass
- [x] 3.4 `npx.cmd openspec validate pin-wige-hover-distance-exemptions --strict` passes
- [x] 3.5 `npm.cmd run typecheck` passes
- [x] 3.6 `npm.cmd run lint` passes
- [x] 3.7 `npm.cmd run format:check` passes
- [x] 3.8 `git diff --check` passes
