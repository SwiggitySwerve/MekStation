# Audit Remediation Tracker — 2026-06-09

Execution tracker for the wave plan in
[`openspec/council-decisions/2026-06-09-audit-remediation-plan.md`](../../openspec/council-decisions/2026-06-09-audit-remediation-plan.md),
remediating [`docs/audits/2026-06-09-full-codebase-review.md`](2026-06-09-full-codebase-review.md).

> Note on form: the council decision called for an OpenSpec tracking change
> folder for W0. `openspec validate --strict` requires every change to carry at
> least one spec delta, and W0 deliberately has none (Bucket 1: the specs were
> right, the code regressed). Rather than invent a delta, the tracker lives
> here. Bucket-3 fixes (C-1/C-3/C-7) get real change folders with MODIFIED
> deltas in W2.

Recovery anchors: map baseline `afc46bc0f` · stack tip `382cc0db5` ·
reconciliation merge `7f22e4f22` · audited main `442f90855`.

## W0 — Restore reconciliation reverts (branch `fix/w0-restore-reconciliation-reverts`)

| Task | Finding              | Scope                                                                                                                        | Status |
| ---- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------ |
| W0.1 | A-10                 | `vehicleFiringArc.ts` arc spans (Front/Rear 120, sides 60) + BODY->Front + deleted test cases                                | done   |
| W0.2 | A-2, A-5, A-14, A-7p | Fuel-tank destruction, VTOL rotor MP/immobilization, delete `vehicleCriticalReplay.ts`, restore `vehicleHitLocation.test.ts` | done   |
| W0.3 | A-6, A-7p            | `actuatorsByLocation` writer; restore `reachable.test.ts` + `terrainCover.test.ts`                                           | done   |
| W0.4 | A-13, A-8            | MegaMek `hexAngle` restored + private copy removed; ECM helper deletion re-applied                                           | done   |
| W0.5 | A-9, A-3, A-7p       | `toAIUnitState` fields; Sprint/Evade/MASC/Supercharger commands + catalog rows; `weaponAttackBuilder`/`indirectFire` tests   | done   |
| W0.6 | A-4, A-12, A-15      | Boxcars PSR hack removed; request-spot guard chain; heat.continue fallback                                                   | done   |
| W0.7 | A-11                 | `REASON_COPY` ~85 codes + exhaustiveness check                                                                               | done   |
| W0.8 | A-1                  | CompendiumAdapter motive/MP/water pipeline + tests                                                                           | done   |
| W0.9 | C-12                 | Wreck-LOS dead path removed; transparency tests per `align-wreck-los-with-megamek`                                           | done   |

## W1 — Projection/engine to-hit unification (cluster B)

| Task | Finding       | Scope                                                                                                                                                                                                                                                                                                                                                                                                                                             | Status |
| ---- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| W1.1 | B-1           | Stop commit path overwriting engine's hydrated to-hit; hydrate projection via `buildWeaponAttack*ToHitState`                                                                                                                                                                                                                                                                                                                                      | done   |
| W1.2 | B-2, B-5, B-6 | Evade/sprint attacker gates in projection; positional-arg bug; min-range `>=` + drift                                                                                                                                                                                                                                                                                                                                                             | done   |
| W1.3 | B-3, B-4      | `calculateMovementHeat` options-object refactor (6 call sites incl. `InteractiveSession.actions` ×2); `validateMovement` paths via `movementModeForPath`; commit fallback surfaces `validatorDisagreement` diagnostic (projection stays authoritative). Deferred: turning-MP divergence (validateMovement charges `calculateGroundPathTurningMpCost`, projection models no facing) — surfaced via diagnostic, full unification out of slice scope | done   |

## W2 — MegaMek rules fixes (cluster C; 3 MODIFIED deltas)

| Task | Finding          | Scope                                                                                                                                     | Status  |
| ---- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| W2.1 | C-1, C-2         | Run/sprint MP derived from heat-adjusted walk; jump MP heat-immune. MODIFIED delta: movement-system heat requirements (verbatim headings) | pending |
| W2.2 | C-3, C-4         | Terrain entry-cost table per motive/level; multi-feature hex cost summing. MODIFIED delta: terrain-system table                           | pending |
| W2.3 | C-7              | Swamp partial cover removed. MODIFIED delta: terrain-system cover column                                                                  | pending |
| W2.4 | C-5, C-6         | Indirect fire: drop artillery-only gunnery mod for LRM; +1 spotter-attacking; semi-guided TAG net-0 composition                           | pending |
| W2.5 | C-8              | Arm-mounted weapons multi-arc [Front, Left/Right]                                                                                         | pending |
| W2.6 | C-9, C-10, C-11  | BA trooper re-roll selection; crit confirmation d6; BATrooperKilled squadId semantics                                                     | pending |
| W2.7 | C-13, C-14, C-15 | Sim-runner jump elevation gate; flank MP round-up; isometric rotate-before-shear ordering                                                 | pending |

## W3 — Campaign engine (cluster D)

| Task | Finding   | Scope                                                                                                     | Status  |
| ---- | --------- | --------------------------------------------------------------------------------------------------------- | ------- |
| W3.1 | D-1       | Persistence stops wiping unit battle damage + loan ledger on reload                                       | pending |
| W3.2 | D-2       | Register financial/turnover/factionStanding/vocationalTraining processors                                 | pending |
| W3.3 | D-3, D-4  | applyPreset wired into creation; reconcileCoopBattle invoked                                              | pending |
| W3.4 | D-5..D-10 | XP double-apply guard; processedBattleIds; market offers; kill counters; combatTeams; seeded campaign RNG | pending |

## W4 — CI/test enforcement (cluster E)

| Task | Finding             | Scope                                                                                                                                                              | Status  |
| ---- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------- |
| W4.1 | E-1                 | Playwright smoke lane in pr-checks.yml + fix 2 stale assertions                                                                                                    | pending |
| W4.2 | E-7, E-8            | Invariant runner wired into swarm/preset CLI; phantom-participant fix                                                                                              | pending |
| W4.3 | E-2..E-6, E-9, E-10 | Perf assertions lane; un-skip determinism test; vacuous existence assertions; scheduled full-size proofs; coverage decision; retire stale known-limitations ledger | pending |

## W5 — UI state + persistence (clusters G/H)

| Task | Finding | Scope                                                                                                                                                                                   | Status  |
| ---- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| W5.1 | G       | Fog last-known staleness; centerOn isometric transform; lens effect dep churn; replay prone; rear-arc detector + getPayload constraint; memo/passive-listener fixes; dispatcher payload | pending |
| W5.2 | H       | Replay POST body-size; events validation; index race note; campaign JSON.parse guard; CURRENT_DATE column rename; migration idempotency; vault SyncEngine conflict lookup               | pending |

## W6 — OpenSpec archive remediation (cluster F) — separate project, LAST

79 phantom-target deltas, 2 conflicting gyro deltas, dash-drift headings,
~37 archive-order dependencies, then archive ~202 changes. Not started.

## Resolution log

(append: `<task> resolved @PR #N — <commit>`)

- W0.1–W0.9 (A-1..A-15, C-12) resolved @PR #800 — squash `3a9dea471`, tag v1.4.324
