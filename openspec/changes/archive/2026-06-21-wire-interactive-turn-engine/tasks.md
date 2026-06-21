# Tasks: Wire the Interactive Turn Engine

## 1. Investigation and red-first evidence

- [x] 1.1 Confirm the engine path is ready: re-read `applyPhysicalAttack`
  (`src/engine/InteractiveSession.ts:501`), the AI PhysicalAttack branch in
  `runAITurn` (`src/engine/InteractiveSession.ai.ts:183`), and the resolve-on-
  advance step (`src/engine/InteractiveSession.phases.ts:188`); document that
  the engine already declares + resolves physical attacks so the fix is wiring,
  not new rules.
- [x] 1.2 Red-first C-2: write a failing test that drives the store's
  `commitPhysicalAttack` (`src/stores/useGameplayStore.combatFlows.ts:561`) and
  asserts the *engine* session (`interactiveSession.getSession()`), not just the
  store snapshot, carries the `PhysicalAttackDeclared` event and that advancing
  out of PhysicalAttack resolves it (proves the current no-op).
- [x] 1.3 Red-first C-3: write a failing driver test that puts the engine in
  GamePhase.PhysicalAttack and runs one `runAITurnLogic`
  (`src/stores/useGameplayStore.helpers.ts:362`) / `SpectatorView.runOneFullTurn`
  tick, asserting the phase advances past PhysicalAttack (proves the livelock).
- [x] 1.4 Red-first E-1: write a failing test that subscribes a throwing listener
  to the combat-outcome bus, finalizes a completed session, and asserts the
  engine's `hasPublishedOutcome()` stays `false` and the throw was logged
  (proves the guard currently latches on throw and nothing is logged).

## 2. Physical-attack commit routes through the engine (C-2)

- [x] 2.1 Rewrite the store action `commitPhysicalAttack`
  (`src/stores/useGameplayStore.combatFlows.ts:541`) to call
  `args.interactiveSession.applyPhysicalAttack(args.attackerId,
  plan.targetUnitId, plan.attackType, plan.limb ?? undefined)` and return
  `args.interactiveSession.getSession()` (clearing the plan as today via `set`),
  instead of calling the pure `declarePhysicalAttack` + returning a snapshot.
- [x] 2.2 Update `PhysicalAttackPanel.handleConfirm`
  (`src/components/gameplay/PhysicalAttackPanel.tsx:354`) so `setSession(next)`
  consumes the engine-sourced session returned by 2.1; keep the
  committed-summary text and intent-clear behavior unchanged.
- [x] 2.3 Add the missing `physical-attack` dispatch case to the dock action
  handler that consumes `onAction(actionId, payload)` (the registry emits it in
  `src/components/gameplay/TacticalActionDock/commands/physicalAttackCommands.ts:129`+);
  stage `payload.attackType`/limb into `usePhysicalAttackPlanStore` and open the
  existing forecast → commit flow so manual physical attacks are dispatchable.
- [x] 2.4 Update the existing `commitPhysicalAttack` unit tests
  (`src/stores/__tests__/useGameplayStore.combatFlows.test.ts:629`+ and
  `src/components/gameplay/__tests__/addPhysicalAttackPhaseUI.smoke.test.tsx:516`+)
  to assert the engine session — not a detached snapshot — carries the
  declaration; make 1.2 pass.

## 3. Turn-loop PhysicalAttack progression (C-3)

- [x] 3.1 Add a PhysicalAttack branch to `runAITurnLogic`
  (`src/stores/useGameplayStore.helpers.ts:362`) between the WeaponAttack guard
  (`:377`) and the Heat guard (`:382`): when
  `interactiveSession.getState().phase === GamePhase.PhysicalAttack`, call
  `runAITurn(GameSide.Opponent)` then `advancePhase()`; ensure every subsequent
  guard re-reads `getState().phase`.
- [x] 3.2 Add the identical PhysicalAttack branch to `SpectatorView.runOneFullTurn`
  (`src/components/gameplay/SpectatorView.tsx:65`-`75`) between the WeaponAttack
  and Heat guards, running `runAITurn` for both sides (matching the spectator's
  Player+Opponent cadence) then `advancePhase`, with fresh phase re-reads.
- [x] 3.3 Make 1.3 pass and add a full-turn driver test asserting each phase runs
  exactly once per tick and the loop reaches `isGameOver` on an elimination
  fixture (no livelock).

## 4. Combat-outcome bus hardening (E-1)

- [x] 4.1 In `publishCombatOutcome` (`src/engine/combatOutcomeBus.ts:70`) replace
  the empty `catch` with a logged catch (engine `Logger`) and track whether at
  least one subscriber ran without throwing; return that consumed signal
  (boolean/count) from the function.
- [x] 4.2 In `finalizeSessionOutcome`
  (`src/engine/InteractiveSession.outcome.ts:71`) set `published` from the
  consumed signal returned by 4.1 instead of unconditionally `true`; keep the
  pre-publish `published: false` early returns
  (`InteractiveSession.outcome.ts:58`/`:68`) unchanged.
- [x] 4.3 Confirm the engine guard at `src/engine/InteractiveSession.ts:783`
  (`this.outcomePublished = result.published`) now stays `false` on a throwing-
  only subscriber set so a later `tryFinalizeAndPublish` retries; make 1.4 pass.
- [x] 4.4 Re-run the multiplayer publish-idempotency integration test
  (`src/__tests__/integration/phase4Multiplayer.test.ts:307`+) and confirm the
  success-path double-publish suppression via `hasPublishedOutcome()` is
  unchanged.

## 5. Match-log divergence visibility + uniform status guards (mediums)

- [x] 5.1 Add a private `matchLogDiverged` flag (default healthy) to
  `InteractiveSession`; in `persistMatchLogEvent`
  (`src/engine/InteractiveSession.ts:671`) set it inside the `.catch` alongside
  the existing `reportMatchLogDivergence`, and expose an accessor
  (`hasMatchLogDiverged()` / `isMatchLogHealthy()`).
- [x] 5.2 Add a private `assertActiveForAction(method)` guard throwing the spec's
  "Game is not active" error, and call it at the top of `applyMovement`
  (`src/engine/InteractiveSession.ts:398`), `applyAttack`, `applyPhysicalAttack`
  (`:501`), `declareWithdrawal`, and `applyRuntimeMovementState`.
- [x] 5.3 Add tests: a failed match-log append flips `hasMatchLogDiverged()`
  true; each guarded action method throws "Game is not active" when invoked on a
  `Completed` session and behaves unchanged on an `Active` session.

## 6. Verification and documentation

- [x] 6.1 Full verification: `npx tsc --noEmit --skipLibCheck`, `oxlint`,
  `oxfmt --check`, and the affected Jest suites
  (`src/engine/__tests__/`, `src/stores/__tests__/`,
  `src/components/gameplay/__tests__/`, `src/__tests__/integration/`) green;
  all four red-first probes (1.2–1.4) now pass.
- [x] 6.2 Run `npx openspec validate wire-interactive-turn-engine --strict` and
  confirm it reports valid.
- [x] 6.3 Update `docs/audits/2026-06-12-full-codebase-review.md` Wave 1 row for
  this change: C-2, C-3, E-1 closed; match-log divergence + status-guard mediums
  folded in.
