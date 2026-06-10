# Tasks: Remove Legacy Hex Map Unit Token

## 1. Spec contract

- [x] 1.1 Author proposal/tasks/spec delta for removing the legacy hex-map
      token renderer
- [x] 1.2 Validate the focused OpenSpec change

## 2. Rendering contract

- [x] 2.1 Migrate damage-feedback smoke coverage to `UnitTokenForType`
- [x] 2.2 Delete the superseded `HexMapDisplay/UnitToken.tsx` component
- [x] 2.3 Keep overlay wiring covered through the production dispatcher path

## 3. Verification

- [x] 3.1 Focused damage-feedback and `UnitTokenForType` Jest tests pass
- [x] 3.2 `npm.cmd run typecheck` passes
- [x] 3.3 `npm.cmd run lint` passes
- [x] 3.4 Format, diff, and strict OpenSpec validation pass
