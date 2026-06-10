# Tasks: Add Tactical Projection Rule Reference Metadata

## 1. Spec Contract

- [x] 1.1 Author proposal/tasks/spec delta for tactical projection rule-reference metadata
- [x] 1.2 Validate the focused OpenSpec change

## 2. Implementation

- [x] 2.1 Add optional rule-reference metadata to tactical projection source references
- [x] 2.2 Populate rule references for terrain/elevation, movement, combat, LOS blocker, and legacy range channels
- [x] 2.3 Expose formatted rule references on rendered hex, overlay, projection badge, tooltip, terrain/elevation label, and isometric scene surfaces
- [x] 2.4 Update the tactical-map rules source matrix with the new metadata pin

## 3. Verification

- [x] 3.1 Add projection utility coverage for rule-reference formatting
- [x] 3.2 Add focused HexMapDisplay coverage for rendered rule-reference metadata
- [x] 3.3 Focused Jest coverage passes
- [x] 3.4 `npx.cmd openspec validate add-tactical-projection-rule-reference-metadata --strict` passes
- [x] 3.5 `npx.cmd oxfmt --check` passes for touched files
- [x] 3.6 `npm.cmd run typecheck` passes
- [x] 3.7 `npm.cmd run lint` passes
- [x] 3.8 `git diff --check` passes
