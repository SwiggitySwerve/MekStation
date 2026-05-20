# Tasks: Add Aerospace Deployment

> **Apply Wave is DEFERRED to its own dedicated wave** (estimated Wave 9; sized at 3-5× ground vehicle scope per the Wave 7 OMO Council Librarian assessment). This change authors the spec only.

## 1. Scenario environment + mode flag

- [ ] 1.1 Define `IScenarioOptions.mapEnvironment: 'atmospheric' | 'space'` and `IScenarioOptions.aerospaceMode: '2d-simplified' | '3d-tactical'` in `src/types/scenario/ScenarioOptions.ts`
- [ ] 1.2 Default values: `mapEnvironment = 'atmospheric'`, `aerospaceMode = '2d-simplified'` (preserves existing Phase-6 behavior; new scenarios may opt in to 3D)
- [ ] 1.3 At session-init, route to 2D-simplified path vs 3D-tactical path once based on `aerospaceMode`; do NOT re-check per-attack

## 2. Aero combat state extension

- [ ] 2.1 Extend `IAerospaceCombatState` in `src/types/gameplay/CombatInterfaces.ts` with `altitude: number` (0-10), `currentVelocity: number`, `nextVelocity: number`, `airborneState: 'grounded' | 'taking-off' | 'airborne' | 'landing'`, `dogfightWith?: string` (entityId of dogfight opponent this turn)
- [ ] 2.2 Resolve the existing TODO at `src/types/gameplay/GameplayUIInterfaces.ts:299-307` by populating `IAerospaceToken.velocity` from `combatState.aero.currentVelocity`
- [ ] 2.3 Unit-test: initial state for a grounded aero is `{ altitude: 0, currentVelocity: 0, nextVelocity: 0, airborneState: 'grounded' }`

## 3. Altitude bands + transitions

- [ ] 3.1 Implement altitude transitions in `src/lib/movement/aerospaceMovement.ts`: `ascendAltitude` (2 thrust per band), `descendAltitude` (free, +1 to nextVelocity gravity assist)
- [ ] 3.2 Implement `takeoff` (2 thrust + control roll, set altitude=1, currentVelocity=safeThrust); emit `AerospaceTakeoff`
- [ ] 3.3 Implement `landing` (descend from altitude 1 with velocity ≤ safeThrust, rolling on N hexes = velocity, set altitude=0); emit `AerospaceLanding`
- [ ] 3.4 Reject altitude > 10 (orbit transition out of scope this change); emit error event `AerospaceOrbitTransitionAttempted` and revert
- [ ] 3.5 Unit-test: takeoff from altitude 0; ascend 0→2 costs 4 thrust; descend 5→3 is free + boosts nextVelocity +2; landing requires velocity ≤ safeThrust

## 4. Velocity + thrust accounting

- [ ] 4.1 Implement thrust budgeting per turn: `thrustBudget = maxThrust` (= floor(safeThrust × 1.5)); thrust spent on (a) accelerating ±velocity, (b) turning ≤60° per thrust, (c) altitude changes, (d) takeoff/landing
- [ ] 4.2 Spending > safeThrust triggers control roll at end of turn; spending > maxThrust SHALL be rejected outright
- [ ] 4.3 Enforce forced forward motion: must move ≥ currentVelocity hexes in facing direction; failing triggers control roll with reason `'Insufficient forward motion at velocity'`
- [ ] 4.4 At end of turn: `currentVelocity ← nextVelocity` for next turn's forced-forward check
- [ ] 4.5 Unit-test: thrust=8 budget allows accel +3 + turn 60° + ascend 2; thrust=10 rejected as > max; velocity 9 forces ≥9 hexes forward

## 5. Atmospheric vs space rule deltas

- [ ] 5.1 Atmospheric: velocity halved upon landing (velocity → floor(velocity/2)); at velocity 0 in atmospheric environment, control roll auto-fails (stall)
- [ ] 5.2 Space: no velocity halving; no terrain effects; no gravity assist; control rolls only from thrust > safeThrust
- [ ] 5.3 Atmospheric: terrain at hex elevation H blocks low-altitude flight (altitude < H+1); attempting to fly into terrain forces altitude ≥ H+1
- [ ] 5.4 Unit-test: atmospheric stall at velocity=0 auto-fails control roll; space scenario with velocity=0 passes (no stall in vacuum)

## 6. Control roll triggers + stall/crash

- [ ] 6.1 Per-attack-type control roll triggers: spent > safeThrust (+1 per excess thrust), velocity > 2 × safeThrust (+1 per excess), insufficient forward motion (auto-trigger), damage exceeding 10% of SI (existing rule from `combat-resolution`), atmospheric stall (auto-fail at velocity 0)
- [ ] 6.2 Failed control roll at altitude > 1: drop altitude by 1, emit `AerospaceControlRollFailed`
- [ ] 6.3 Failed control roll at altitude 1: crash to altitude 0 with crash damage = currentVelocity × 5 to all arcs equally; emit `AerospaceCrashed`
- [ ] 6.4 Unit-test: 2 control-roll failures in 2 turns from altitude 5 → altitude 3; failure at altitude 1 → crash + damage application

## 7. Air-to-air combat

- [ ] 7.1 Implement air-to-air dispatch in `src/lib/combat/aerospaceCombat.ts`: eligible when both attacker and target are airborne AND in same hex AND altitude diff ≤ 2
- [ ] 7.2 To-hit base: pilot gunnery skill; arc modifiers: forward +0, left/right wing +1, aft +3
- [ ] 7.3 Velocity differential: +1 per 2 hexes of velocity difference (faster relative motion = harder shot)
- [ ] 7.4 Hit-location + damage: delegate to existing `aerospaceResolveDamage()` per `combat-resolution`
- [ ] 7.5 Emit `AerospaceAirToAirAttack { attackerId, targetId, attackerArc, targetArc, velocityDiff, toHitFinal, outcome }`
- [ ] 7.6 Unit-test: same-hex, same-altitude, forward-arc shot → base only; aft shot → +3 mod; velocity 9 vs velocity 3 → +3 velocity diff mod

## 8. Air-to-ground combat (extends existing strafe)

- [ ] 8.1 Implement air-to-ground in `aerospaceCombat.ts`: eligible when attacker is airborne, target is ground unit in attacker's movement path this turn (extends existing strafe rule from `movement-system`)
- [ ] 8.2 To-hit modifier: existing +2 strafe penalty + altitude tier (low +0, med +1, high +2); legal weapons: Nose-arc + Wing-arc forward-firing
- [ ] 8.3 Emit `AerospaceAirToGroundAttack { attackerId, targetId, altitudeTier, toHitFinal, outcome }`
- [ ] 8.4 Unit-test: ASF at altitude 6 strafing 2 ground hexes → +2 base +1 alt = +3 to-hit per shot

## 9. Ground-to-air combat

- [ ] 9.1 Implement ground-to-air in `aerospaceCombat.ts` (dispatched from `combat-resolution`): eligible when attacker is ground unit, target is airborne aero
- [ ] 9.2 To-hit modifier: altitude tier (low +1, med +2, high +3); legal weapons: any direct-fire weapon within range
- [ ] 9.3 Reject indirect-fire weapons (LRM in Indirect mode) attempting to engage airborne targets — emit warning event
- [ ] 9.4 Emit `AerospaceGroundToAirAttack { attackerId, targetId, altitudeTier, toHitFinal, outcome }`
- [ ] 9.5 Unit-test: AC/20 mech firing at airborne aero at altitude 7 → +3 to-hit; LRM in Indirect mode → rejected

## 10. Dogfight resolution

- [ ] 10.1 Dogfight initiation: both opposing airborne aero in same hex, same altitude, both pilots declare dogfight during movement-phase
- [ ] 10.2 On mutual declaration: both units commit to the current hex for the turn; further movement SHALL be rejected; set `dogfightWith` on both sides
- [ ] 10.3 At end of movement phase, before air-to-air resolution: each dogfighter gets one forward-arc shot at the other; arcs auto-resolve to forward-arc
- [ ] 10.4 Disengagement: next turn, either side may decline dogfight; both units may move normally
- [ ] 10.5 Emit `AerospaceDogfightInitiated { unitAId, unitBId }`, `AerospaceDogfightDisengaged { unitAId, unitBId }`
- [ ] 10.6 Unit-test: A and B in same hex altitude 5; both declare dogfight; both get forward-arc shots; next turn both disengage; movement allowed

## 11. Bomb drop resolution

- [ ] 11.1 Implement `src/lib/combat/bombResolution.ts`: airborne aero with bombs in bomb-bay may declare a bomb-drop attack on a ground hex during movement
- [ ] 11.2 Bomb scatter table: 2d6 roll mapped to scatter direction + distance per altitude tier (low: 0-1 hex; med: 1-2; high: 2-3)
- [ ] 11.3 Apply bomb damage to the deviated hex per existing bomb explosive rules; multiple ground units in deviated hex split damage
- [ ] 11.4 Emit `AerospaceBombDropped { attackerId, declaredHex, deviatedHex, scatterRoll, damage, bombType }`
- [ ] 11.5 Unit-test: 2d6=8 from altitude 5 → 1 hex scatter direction-N; damage applies to N hex

## 12. Combat-resolution dispatch update

- [ ] 12.1 In `src/lib/combat/combatResolution.ts`: extend the existing `Aerospace Combat Dispatch` to branch on attacker/target type matrix per the new `aerospace-deployment` spec
- [ ] 12.2 Existing `aerospaceResolveDamage` continues to handle damage application (per existing `combat-resolution`); the new dispatch routes to-hit calc through air-to-air / air-to-ground / ground-to-air resolvers
- [ ] 12.3 Unit-test: dispatch matrix covers all 9 cells (BattleMech/Vehicle/Aerospace × BattleMech/Vehicle/Aerospace as attacker/target), with aerospace cells delegating correctly

## 13. Off-map exit + re-entry tied to altitude

- [ ] 13.1 Extend existing `AerospaceExited` event to include `exitAltitude` and `exitVelocity` fields
- [ ] 13.2 Re-entry SHALL preserve altitude and velocity; existing 2-turn re-entry-delay rule unchanged
- [ ] 13.3 Unit-test: ASF exits at altitude 5, velocity 8; re-enters 2 turns later at altitude 5, velocity 8

## 14. Spec deltas

- [ ] 14.1 Author `openspec/changes/add-aerospace-deployment/specs/aerospace-deployment/spec.md` (NEW capability — full 3D aerospace combat surface per the proposal)
- [ ] 14.2 Author `openspec/changes/add-aerospace-deployment/specs/combat-resolution/spec.md` (MODIFIED — air-to-air / air-to-ground / ground-to-air dispatch)
- [ ] 14.3 Author `openspec/changes/add-aerospace-deployment/specs/unit-entity-model/spec.md` (MODIFIED — aerospace altitude + velocity in entity model)
- [ ] 14.4 Author `openspec/changes/add-aerospace-deployment/specs/movement-system/spec.md` (MODIFIED — 2D becomes legacy fallback, strafe altitude modifier)
- [ ] 14.5 `npx openspec validate add-aerospace-deployment --strict` passes clean
- [ ] 14.6 `npm run build`, lint, typecheck, jest, scenario tests pass on CI (Apply wave gate — DEFERRED)
- [ ] 14.7 Archive the change to `openspec/changes/archive/YYYY-MM-DD-add-aerospace-deployment/` after Apply-wave PR merge; sync the 4 deltas into source-of-truth specs (NEVER `--skip-specs`)

## 15. Documentation + follow-up notes

- [ ] 15.1 Add a `playtest/wave-9/AEROSPACE_DEPLOYMENT_NOTES.md` section: scenarios to add (Aero-vs-Aero dogfight, Aero strafe-vs-mech-column, Aero bomb-drop-on-fortified-position, Aero takeoff-engage-land cycle); MegaMek parity gates
- [ ] 15.2 Spec the VTOL/hover follow-up — `update-vtol-hover-mp-modifiers` (small delta to `movement-system` capturing VTOL hover MP, VTOL airborne-but-not-aerospace state). Note in `_followups.md` placeholder in archive folder
- [ ] 15.3 Spec the future Dropship combat follow-up (`add-dropship-combat`) as the next aerospace deployment layer
- [ ] 15.4 Spec the future aerospace AI heuristics follow-up (`add-aerospace-ai`) for bot fighter decision-making once the engine path stabilizes
- [ ] 15.5 Capture parity-test budget for Aero combat against MegaMek scenario set — 5-8 scenarios with hit/miss/damage ratios within 5% of MegaMek baseline
