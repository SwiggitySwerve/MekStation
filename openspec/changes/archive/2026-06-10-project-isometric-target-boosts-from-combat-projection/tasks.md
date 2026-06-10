# Tasks: Project Isometric Target Boosts From Combat Projection

## 1. Spec contract

- [x] 1.1 Author proposal/tasks/spec delta for projection-aware isometric
      target boosts
- [x] 1.2 Validate the focused OpenSpec change

## 2. Rendering contract

- [x] 2.1 Thread combat-projected valid-target ids into the isometric
      occlusion/foreground id projection
- [x] 2.2 Suppress stale legacy `isValidTarget` foreground boosts when
      weapon-backed combat projection is active
- [x] 2.3 Preserve legacy valid-target foreground boosts when combat projection
      is absent
- [x] 2.4 Preserve selected-unit, terrain-occlusion, and combat-target
      readability boosts

## 3. Verification

- [x] 3.1 Add focused isometric coverage for stale legacy target flag
      suppression
- [x] 3.2 Add focused isometric coverage for legacy target flag fallback
- [x] 3.3 Focused Jest coverage passes
- [x] 3.4 `npm.cmd run typecheck` passes
- [x] 3.5 `npm.cmd run lint` passes
- [x] 3.6 Format and strict OpenSpec validation pass
