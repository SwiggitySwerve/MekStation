# Tasks: Fix Tactical Projection Agreement Gaps

## 1. Investigation and red-first evidence

- [ ] 1.1 Read `deriveReachableHexes` jump candidate flow end-to-end and document (in the PR description) whether the per-hex derivation already applies the engine elevation/landing gates after the flat `hexDistance <= jumpMP` pre-filter — resolves design Open Question 1 and decides whether task 3 is a fix or a proof.
- [ ] 1.2 Write a red-first movement agreement probe: one scenario fixture where a bent path's committed validation charges turning MP the projection omits, demonstrating the `validatorDisagreement` diagnostic fires today (proves W1.3 drift is observable before the fix).

## 2. Turning/facing MP unification

- [ ] 2.1 Apply the shared turning-cost function (`calculateGroundPathTurningMpCost`) to the projection's derived path in `deriveReachableHexes` / `deriveMovementRangeHexForDestination`, adding turning charges to `mpCost` before reachability classification.
- [ ] 2.2 Surface the turning contribution in the per-hex movement explanation breakdown (movement projection detail rows) so the overlay can list it.
- [ ] 2.3 Verify destinations whose turning charges exceed remaining MP project as unreachable; update reachable-hex tests.

## 3. Jump candidate-gate parity

- [ ] 3.1 Route every jump candidate through the same jump legality helper the engine/sim-runner enforces (elevation-delta gate, prohibited landing terrain, stacking), keeping the distance pre-filter only as a proven superset bound.
- [ ] 3.2 Add jump agreement cases: projected-jump-reachable set equals commit-accepted set on fixtures with elevation walls, prohibited landing hexes, and occupied destinations.

## 4. Combat planning range consolidation

- [ ] 4.1 Replace `CombatPlanningPanel` raw `hexDistance` range/bracket computation with reads from the combat projection lookup; fall back to the same exported projection helper when the target hex is outside the lookup.
- [ ] 4.2 Add a panel render test for the empty-lookup phase (no regression outside combat phases) and a test pinning displayed range/bracket to projection values.

## 5. Movement agreement suite

- [ ] 5.1 Create `InteractiveSession.movementProjectionAgreement.scenario.test.ts` parametrized over the shared tactical-map scenario fixtures × move modes (walk, run, jump + represented vehicle/VTOL/WiGE modes), comparing projection `{reachable, mpCost, terrainCost, elevationDelta, heatGenerated, blockedReason}` against committed-validation outcomes per destination.
- [ ] 5.2 Assert the commit-path `validatorDisagreement` diagnostic list is empty in every agreement case (CI promotion of W1.3); confirm task 1.2's red probe now passes.
- [ ] 5.3 Add the explicit `UNSUPPORTED_AGREEMENT_MODES` enumeration assertion so missing fixtures/modes are visible, and dropping a covered mode fails the suite.

## 6. Verification and documentation

- [ ] 6.1 Full verification: `npx tsc --noEmit --skipLibCheck`, lint, affected Jest suites, and the movement+attack agreement suites green; run `npx openspec validate fix-tactical-projection-agreement-gaps --strict`.
- [ ] 6.2 Update `docs/audits/2026-06-09-remediation-tracker.md` W1.3 row: deferral closed by this change (turning-MP unified, diagnostic promoted to CI assertion).
