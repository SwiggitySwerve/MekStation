# Tasks: Explain Movement Elevation Cost In Hex Label

## 1. Spec contract

- [x] 1.1 Author proposal/tasks/spec delta for movement elevation-cost label
      explanation
- [x] 1.2 Validate the focused OpenSpec change

## 2. Map explanation contract

- [x] 2.1 Include movement elevation MP cost in the hex-level movement label
      when projection data supplies it
- [x] 2.2 Preserve existing terrain, elevation delta, heat, stand-up, and
      blocked/invalid explanation fields
- [x] 2.3 Cover the combined terrain/elevation/overlay case in focused
      HexMapDisplay tests

## 3. Verification

- [x] 3.1 Focused HexMapDisplay terrain-label Jest coverage passes
- [x] 3.2 `npm.cmd run typecheck` passes
- [x] 3.3 `npm.cmd run lint` passes
- [x] 3.4 Format, diff, and strict OpenSpec validation pass
