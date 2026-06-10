# Tasks: Add Aerospace Deployment

> Current PR scope: spec authority plus the limited altitude/velocity projection
> foundation that already landed on this branch. Full 3D aerospace deployment is
> intentionally deferred to a dedicated apply wave because it spans movement,
> combat dispatch, event log, UI controls, and scenario-authoring surfaces.

## 1. Current-branch foundation

- [x] 1.1 Extend `IAerospaceCombatState` in `src/utils/gameplay/aerospace/state.ts` with altitude, current velocity, next velocity, airborne state, and dogfight pointer fields.
- [x] 1.2 Resolve the `IAerospaceToken.velocity` projection TODO by deriving token velocity from `combatState.aero.currentVelocity`.
- [x] 1.3 Unit-test grounded aerospace initial state as altitude `0`, current velocity `0`, next velocity `0`, and airborne state `grounded`.
- [x] 1.4 Browser-map proof: aerospace altitude and velocity render as token metadata, altitude badge, and velocity vector in top-down and isometric tactical-map projections.
- [x] 1.5 Wire current ground-to-air projection support so altitude modifiers appear in tactical-map to-hit metadata and committed `AttackDeclared` events carry the same modifier.
- [x] 1.6 Reject indirect-fire weapons attempting to engage airborne targets through the shared tactical-map projection and commit path.
- [x] 1.7 Browser/commit parity proof: the same airborne target scenario preserves altitude/velocity metadata and matching ground-to-air to-hit modifiers through preview and committed attack events.

## 2. Spec deltas

- [x] 2.1 Author `openspec/changes/add-aerospace-deployment/specs/aerospace-deployment/spec.md` as the new capability authority for altitude bands, velocity, thrust accounting, takeoff/landing, air-to-air, air-to-ground, ground-to-air, dogfight, bomb-drop, and off-map re-entry behavior.
- [x] 2.2 Author `openspec/changes/add-aerospace-deployment/specs/combat-resolution/spec.md` for air-to-air, air-to-ground, and ground-to-air dispatch expectations.
- [x] 2.3 Author `openspec/changes/add-aerospace-deployment/specs/unit-entity-model/spec.md` for aerospace altitude and velocity runtime entity state.
- [x] 2.4 Author `openspec/changes/add-aerospace-deployment/specs/movement-system/spec.md` for legacy 2D fallback, 3D tactical mode, and strafe altitude modifier expectations.
- [x] 2.5 `npx.cmd openspec validate add-aerospace-deployment --strict` passes.

## 3. Deferred apply-wave backlog

These are retained as explicit future work boundaries, not as incomplete tasks for
this PR.

- Scenario options: add `mapEnvironment` and `aerospaceMode` to scenario options, default legacy scenarios safely, and route once at session init.
- Altitude transitions: implement ascend, descend, takeoff, landing, orbit-transition rejection, and altitude transition events.
- Velocity and thrust accounting: implement safe/max thrust budgets, forced forward motion, end-of-turn velocity carry, and over-thrust control-roll triggers.
- Atmospheric versus space deltas: model atmospheric stall, velocity halving, terrain obstruction, and space-mode terrain/gravity exceptions.
- Control rolls and crashes: implement failed-control altitude loss, altitude-1 crash behavior, and crash damage.
- Air-to-air combat: implement same-hex altitude-band eligibility, arc modifiers, velocity differential, damage delegation, and `AerospaceAirToAirAttack` events.
- Air-to-ground combat: extend strafe into full airborne path attacks with altitude-tier modifiers and `AerospaceAirToGroundAttack` events.
- Ground-to-air combat: add the dedicated `AerospaceGroundToAirAttack` resolver/event around the preview/commit parity already landed.
- Dogfights: implement mutual dogfight declaration, movement lock, simultaneous forward-arc shots, disengagement, and dogfight events.
- Bomb drops: implement bomb bay declaration, scatter table, deviated-hex damage, and `AerospaceBombDropped` events.
- Combat dispatch: extend the aerospace attacker/target matrix while keeping `aerospaceResolveDamage()` as the damage application authority.
- Off-map exit and re-entry: preserve altitude and velocity through exit/re-entry events.
- Playtest notes: add Wave 9 scenarios for aero-vs-aero dogfight, strafe against a mech column, bomb drop against fortifications, and takeoff-engage-land cycles.
- Follow-up specs: split VTOL/hover modifiers, Dropship combat, aerospace AI, and MegaMek parity scenario budgeting into their own changes.

## 4. Archive

- [x] 4.1 Leave this change unarchived while PR #682 is under review; archive after merge with source-of-truth spec sync and without `--skip-specs`.
