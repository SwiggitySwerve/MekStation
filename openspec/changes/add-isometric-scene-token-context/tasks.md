# Tasks: Add Isometric Scene Token Context

## 1. Spec contract

- [x] 1.1 Author proposal/tasks/spec delta for isometric scene token context
- [x] 1.2 Add `tactical-map-interface` requirement for inspectable scene token wrappers

## 2. Implementation

- [x] 2.1 Add isometric scene token wrapper title and accessible label
- [x] 2.2 Include displayed/source position, facing, unit type, and represented altitude/velocity context
- [x] 2.3 Include existing combat-projection target state and terrain/fog visibility context without recalculating legality

## 3. Verification

- [x] 3.1 Add focused render coverage for aerospace, occluded, fogged, last-known, and combat-projected scene token labels
- [x] 3.2 Focused Jest coverage passes
- [x] 3.3 `npm.cmd run typecheck` passes
- [x] 3.4 `npm.cmd run lint` passes
- [x] 3.5 `npx.cmd openspec validate add-isometric-scene-token-context --strict` passes
