# Tasks: Add Isometric Touch Camera Gesture

## 1. Spec contract

- [x] 1.1 Author proposal/tasks/spec delta for isometric touch camera gesture
- [x] 1.2 Require direct two-finger touch rotation to use discrete isometric camera heading state

## 2. Implementation

- [x] 2.1 Track two-finger touch angle at gesture start
- [x] 2.2 Convert touch twist deltas into 60-degree isometric heading steps
- [x] 2.3 Preserve existing touch pan and pinch zoom behavior
- [x] 2.4 Expose touch rotation in isometric camera surface metadata

## 3. Verification

- [x] 3.1 Add focused render coverage for pointer pan, touch pan, pinch zoom, and touch rotation
- [x] 3.2 Focused HexMapDisplay camera interaction coverage passes
- [x] 3.3 `npx.cmd openspec validate add-isometric-touch-camera-gesture --strict` passes
- [x] 3.4 `npm.cmd run typecheck` passes
- [x] 3.5 `npm.cmd run lint` passes
- [x] 3.6 `npm.cmd run format:check` passes
- [x] 3.7 `git diff --check` passes
