# Tasks: Project Token Target Rings From Combat Projection

## 1. Spec contract

- [x] 1.1 Author proposal/tasks/spec delta for combat-projected token target
      rings
- [x] 1.2 Validate the focused OpenSpec change

## 2. Rendering contract

- [x] 2.1 Derive valid target token ids from weapon-backed
      `ICombatRangeHex.validTargetUnitIds`
- [x] 2.2 Pass the projection result through HexMapDisplay token layers in
      both top-down and isometric rendering paths
- [x] 2.3 Override only the rendered valid-target halo state, preserving
      legacy token flags as fallback when combat projection is absent
- [x] 2.4 Expose token metadata identifying combat projection versus legacy
      token target-ring source

## 3. Verification

- [x] 3.1 Add focused HexMapDisplay coverage for combat-projected valid target
      rings
- [x] 3.2 Add focused HexMapDisplay coverage for stale legacy target-ring
      suppression
- [x] 3.3 Add focused HexMapDisplay coverage for legacy token-ring fallback
- [x] 3.4 Focused Jest coverage passes
- [x] 3.5 `npm.cmd run typecheck` passes
- [x] 3.6 `npm.cmd run lint` passes
- [x] 3.7 Format and strict OpenSpec validation pass
