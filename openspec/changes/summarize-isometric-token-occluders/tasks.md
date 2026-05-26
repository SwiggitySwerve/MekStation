# Tasks: Summarize Isometric Token Occluders

## 1. Spec contract

- [x] 1.1 Author proposal/tasks/spec delta for multi-occluder token summaries
- [x] 1.2 Add `tactical-map-interface` requirement for aggregate token-wrapper occluder metadata

## 2. Implementation

- [x] 2.1 Derive per-unit occlusion groups from the existing isometric terrain-occlusion projection
- [x] 2.2 Preserve first-occluder scene token metadata while exposing all occluder hexes, elevations, and reasons
- [x] 2.3 Pass aggregate terrain-occlusion reasons to the nested token visibility context

## 3. Verification

- [x] 3.1 Add focused helper/component assertions for a unit behind multiple isometric occluders
- [x] 3.2 Extend tactical-map browser smoke metadata assertions for aggregate token occluders
- [x] 3.3 Focused Jest coverage passes
- [x] 3.4 `npx.cmd openspec validate summarize-isometric-token-occluders --strict` passes
- [x] 3.5 PR-hardening checks pass or known gaps are documented
