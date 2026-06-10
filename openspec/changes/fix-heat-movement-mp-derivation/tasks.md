# Tasks: Fix Heat Movement MP Derivation

## 1. Implementation

- [x] 1.1 `getMaxMP` applies the heat penalty to walk MP and re-derives Run/Sprint/Evade MP from the heat-adjusted walk, preserving the capability's formula family (C-1)
- [x] 1.2 `getMaxMP` returns jump MP unmodified under heat (C-2)
- [x] 1.3 `getHeatAdjustedMovementCapability` drops the jump-MP heat reduction and re-derives run/sprint MP from the adjusted walk; docstring corrected (C-1, C-2)
- [x] 1.4 Environmental jump branch in `validation.ts` no longer subtracts the heat penalty (C-2)
- [x] 1.5 Consumer sweep verified: reachable/validation/commitValidation/InteractiveSession.actions/movementCommands/GameSessionPage.movementPlanning/runner movement phase all route through the fixed helpers; no caller reimplements the subtraction
- [x] 1.6 Support catalog `heat-mp-penalty` description updated in `CombatRuleSupport.ts`

## 2. Tests

- [x] 2.1 Red-first unit tests for the C-1 worked example (walk 5 / run 8 / heat 10 → run 5) and jump heat-immunity
- [x] 2.2 Existing tests pinning pre-fix subtraction values updated with C-1/C-2 justification comments (movement.test.ts, tsmHeatInteraction.test.ts, reachable.test.ts, movementCommands.test.ts, InteractiveSession.movement.scenario.test.ts, GameSessionPage.movement.test.ts)
- [x] 2.3 Movement, reachable, runtime capability, dock command, catalog contract, engine scenario, and game-session suites green

## 3. Spec Delta

- [x] 3.1 MODIFIED `movement-system` "Heat MP Reduction" — heat reduces walk; run/sprint re-derive; jump heat-immune; disambiguating scenario added
- [x] 3.2 MODIFIED `movement-system` "Heat Reduces Effective Movement" — same correction at the effective-MP layer; heat-9 scenario run value corrected to the derived formula
- [x] 3.3 `npx openspec validate fix-heat-movement-mp-derivation --strict` and `npx openspec validate --all --strict` pass
