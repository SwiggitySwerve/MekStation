# Tasks: Add Isometric Occlusion Rotation Sweep

## 1. Spec contract

- [x] 1.1 Author proposal/tasks/spec delta for rendered isometric occlusion rotation
- [x] 1.2 Require occlusion metadata to identify the camera step that produced it

## 2. Implementation

- [x] 2.1 Expose occlusion rotation step on isometric scene tokens
- [x] 2.2 Expose occluder rotation step on tall-hex highlights and elevation stacks
- [x] 2.3 Include the occlusion camera step in the scene token accessibility label

## 3. Verification

- [x] 3.1 Add rendered interaction coverage for rotating the isometric camera and retargeting occluders
- [x] 3.2 Focused HexMapDisplay camera/isometric coverage passes
- [x] 3.3 `npx.cmd openspec validate add-isometric-occlusion-rotation-sweep --strict` passes
- [x] 3.4 `npm.cmd run typecheck` passes
- [x] 3.5 `npm.cmd run lint` passes
- [x] 3.6 `npm.cmd run format:check` passes
- [x] 3.7 `git diff --check` passes
