# Tasks: wire-vibroclaw-attack-dispatch

## 0. Scope amendment (discovered at wiring time)

- [x] 0.1 MegaMek parity check BEFORE wiring: the orphan resolver's deterministic `1 + ceil(0.5 × troopers)` formula (archived §8) contradicted the living spec's cluster model. Verified canonical source (`BAVibroClawAttackAction.getDamageFor` = `missilesHit(shootingStrength) × vibroClaws`); rewrote the resolver to the cluster-table model with MegaMek's claw-sized damage-cluster application; proposal amended accordingly

## 1. Dispatch wiring (engine)

- [x] 1.1 Read the PR-L3 `LegAttack` dispatch path end-to-end as the shape to mirror — finding: PR-L3 delivers resolver + thin action handler + record event (no separate to-hit gate; damage downstream), driven by scenario coverage
- [x] 1.2 Wire the resolver into combat dispatch — `dispatchVibroClawAttack` (`src/utils/gameplay/battlearmor/vibroClawDispatch.ts`): legality (squad attacker, `vibroClaws ≥ 1`, adjacency, mech-style target), `VibroClawAttackResolved` record event, per-cluster front-arc hit-location rolls, standard `DamageApplied` events with armor depletion carried between clusters; stale "§7 deferred to PR-L4" comment in `baCombat.ts` updated
- [x] 1.3 Interactive declaration path: `InteractiveSession.declareVibroClawAttack(squadId, targetId)` (engine-owned dice, adopts the resolved session, returns typed rejections); new `GameEventType.VibroClawAttackResolved` + payload + factory
- [x] 1.4 Dispatch-level tests: resolved event + 3 cluster `DamageApplied` events at rolled locations with 20→14 armor depletion; rejections (non-adjacent, zero claws, non-squad attacker, per-type target)

## 2. UI gating (tactical surface)

- [x] 2.1 `physical.vibro-claw` dock command gated by the new `activeUnitVibroClawCount` context flag (builder drops the command entirely at 0 claws / non-squad / legacy contexts — hidden, never disabled); commit routes `vibro-claw-attack` action id through the store handler into `declareVibroClawAttack`
- [x] 2.2 UI gating tests: present for a 2-claw squad context, absent at 0 claws and for legacy contexts; commit payload carries the target

## 3. Verification battery

- [x] 3.1 Battle-armor, engine, stores, dock, gameState, gameEvents suites green (112 suites / 1,468 tests); scripts + simulation-runner suites green after reconciling the out-of-scope inventory pins (147 → 148 across the event catalog contract, validation catalog fragments, `verify:rules` package scripts, five QC validators, the QC registry/graph artifacts, and the non-BattleMech scope matrix — the new `VibroClawAttackResolved` event row is audited out-of-scope in the battle-armor lane like its `LegAttackResolved` sibling, with fresh sourceRefs)
- [x] 3.2 MegaMek parity spot-check: 4-trooper/2-claw at cluster roll 7 → `missilesHit(4)=3` → 6 damage in `[2,2,2]` clusters (living spec scenario); degraded 2-trooper squad → cluster-2 column → 1 hit
- [x] 3.3 `openspec validate --strict --all` + evidence capture green
