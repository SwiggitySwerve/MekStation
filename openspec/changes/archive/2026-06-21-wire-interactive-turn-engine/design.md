# Design: Wire the Interactive Turn Engine

## Context

The interactive engine is event-sourced and correct in isolation: dice are
rolled once at resolution and baked into events, replay re-derives via the same
pure reducer, and the engine class exposes typed action methods
(`applyMovement`, `applyAttack`, `applyPhysicalAttack`) that mutate
`this.session` and call `tryFinalizeAndPublish`. The defects are at the
**seams** — where the React store / panels / turn-loop drivers connect to the
engine — not in the rules.

Three seam defects (Wave 1, 2026-06-12 review):

1. **C-2 — physical-attack commit bypasses the engine.** Weapon-attack and
   movement commits go through the engine (`interactiveSession.applyAttack` /
   `applyMovement`), but the physical-attack commit alone goes through the
   *pure* `declarePhysicalAttack` in the store and writes only the store
   snapshot via `setSession`. The engine method `applyPhysicalAttack`
   (`InteractiveSession.ts:501`) — which builds the full
   `IPhysicalAttackContext` (jump-jet, elevation, terrain) and calls
   `tryFinalizeAndPublish` — is never invoked. The declaration the engine needs
   for `resolveAllPhysicalAttacks` (`InteractiveSession.phases.ts:188`, on
   advance out of PhysicalAttack) is therefore absent, so the attack no-ops.

2. **C-3 — turn-loop drivers skip the PhysicalAttack phase.** The phase order is
   Initiative → Movement → WeaponAttack → **PhysicalAttack** → Heat → End. The
   engine's `runAITurn` already declares AI physical attacks in PhysicalAttack
   (`InteractiveSession.ai.ts:183`) and `advancePhase` resolves them on exit;
   but the two interactive drivers test only Movement, WeaponAttack, Heat, End
   (`useGameplayStore.helpers.ts:372`/`377`/`382`/`386` and
   `SpectatorView.tsx:59`/`65`/`71`/`75`). When the engine lands in
   PhysicalAttack, no branch fires, the session never advances, `isGameOver`
   stays false, and the `setTimeout`-paced loop re-runs forever against the same
   stuck phase.

3. **E-1 — outcome-bus throw is swallowed and latches the guard.**
   `publishCombatOutcome` swallows every listener throw with an empty `catch`
   (`combatOutcomeBus.ts:76`) and `finalizeSessionOutcome` always returns
   `published: true` after calling it (`InteractiveSession.outcome.ts:75`). The
   engine flips its once-per-session `outcomePublished` guard from that result
   (`InteractiveSession.ts:783`). A subscriber throw (the campaign store writing
   localStorage over quota) thus drops the outcome *and* poisons the guard, so
   the retry the idempotency design intends can never happen.

Two mediums on the same files: fire-and-forget match-log persistence
(`InteractiveSession.ts:671`) and non-uniform `GameStatus.Active` guards across
action methods (`InteractiveSession.ts:398`+).

## Decisions

**D1 — Engine is the single writer of `this.session`; the store/panel always
derive from it.**
`commitPhysicalAttack` calls `interactiveSession.applyPhysicalAttack(attackerId,
targetId, attackType, limb)` and then reads back `interactiveSession.getSession()`
for the store/panel snapshot. The panel's `setSession(next)` consumes that
engine-sourced session rather than a separately-declared snapshot. This makes
physical attacks identical in shape to the already-correct weapon/movement
commits (engine writes, UI mirrors) and eliminates the snapshot/engine fork.
Rejected alternative: keep `declarePhysicalAttack` in the store and *also* push
the result into the engine via a setter — rejected because a public session
setter is a new desync footgun and duplicates the context-building the engine
already does in `applyPhysicalAttack`/`buildJumpJetAttackSessionContext`.

**D2 — The dock dispatch handler gains a `physical-attack` case that opens the
forecast/commit flow.**
`physicalAttackCommands.ts` already emits `{ actionId: 'physical-attack',
payload: { attackType } }`; the missing piece is the dispatcher case that
receives it. The handler stages the attack type/limb into the physical-attack
plan store and triggers the existing forecast → `commitPhysicalAttack` path, so
manual physical attacks are dispatchable from the dock/context menu, not just
the panel. No new command shapes are introduced.

**D3 — Turn-loop drivers get a PhysicalAttack branch and re-check the phase
before every guard.**
Both `runAITurnLogic` and `SpectatorView.runOneFullTurn` are rewritten so each
phase guard reads `interactiveSession.getState().phase` freshly (they already do
this for WeaponAttack/Heat/End). A PhysicalAttack branch is inserted in phase
order — after WeaponAttack, before Heat — that calls `runAITurn(side)` then
`advancePhase`. Because every guard re-checks the live phase, a single tick now
walks Movement → WeaponAttack → PhysicalAttack → Heat → End and always reaches a
terminal/`isGameOver` check, so the timer loop cannot livelock. The headless
`runToCompletion` driver is untouched (already correct).
Rejected alternative: a single generic "advance until phase changes or
game-over" loop in the driver — rejected as a larger behavioral rewrite of the
spectator/interactive cadence than the bug warrants; the explicit per-phase
branch matches the existing structure and is the minimum that fixes the stall.

**D4 — `published` means "a subscriber consumed the outcome without throwing".**
`publishCombatOutcome` logs each swallowed listener throw with the engine
`Logger` (no more silent empty catch) and returns a boolean / count indicating
whether at least one subscriber ran to completion without throwing.
`finalizeSessionOutcome` returns `{ published: <that consumed flag> }`, and the
engine sets `this.outcomePublished` from it. A throwing-only subscriber set
therefore leaves `outcomePublished === false`, so the next `tryFinalizeAndPublish`
(e.g. after the subscriber's transient quota error clears) re-attempts the
publish. The engine still cannot crash on a bad subscriber — throws remain
isolated; the only change is that they are logged and do not falsely latch the
guard.
Rejected alternative: re-throw subscriber errors out of the engine — rejected
because it reintroduces the "buggy subscriber takes down the engine" failure the
isolation was added to prevent.

**D5 — Match-log divergence is a tracked session flag, not a silent log line.**
`persistMatchLogEvent`'s `.catch` keeps calling `reportMatchLogDivergence` for
telemetry but additionally sets a private `matchLogDiverged` flag exposed via an
accessor (e.g. `isMatchLogHealthy()` / `hasMatchLogDiverged()`). Recovery /
persistence callers and the UI can read it to decide whether the recoverable log
can be trusted, instead of discovering the desync only on a failed rebuild. This
is observability only — it does not retry or rebuild here (C-9's recovery work
owns that).

**D6 — One Active-status guard helper applied uniformly to every session-mutating
action method.**
A single private guard (e.g. `assertActiveForAction(method)`), throwing the same
"Game is not active" error the lifecycle requirement already specifies, is called
at the top of `applyMovement`, `applyAttack`, `applyPhysicalAttack`,
`declareWithdrawal`, and `applyRuntimeMovementState`. This closes the gap where a
`Completed` session could still be mutated and makes the guard consistent with
`appendEvent`'s existing lifecycle enforcement.

## Open Questions

(none) — the engine surfaces required by D1–D6 all exist and were read in this
session: `applyPhysicalAttack` (`InteractiveSession.ts:501`), the AI
PhysicalAttack branch (`InteractiveSession.ai.ts:183`), the publish path
(`InteractiveSession.outcome.ts:75`, `InteractiveSession.ts:783`), the match-log
catch (`InteractiveSession.ts:671`), and the action methods at
`InteractiveSession.ts:398`+.

## Risks

- **Routing through the engine changes physical-attack timing/side effects.**
  `applyPhysicalAttack` calls `tryFinalizeAndPublish`, which the pure
  store-snapshot path did not. Mitigation: a regression test asserting a declared
  physical attack is present on the engine session and resolves (no longer
  no-ops), plus that finalize is still idempotent.
- **Turn-loop branch ordering regression.** Inserting PhysicalAttack out of phase
  order, or not re-checking the phase, could double-run a phase or skip Heat.
  Mitigation: a full-turn driver test that asserts each phase runs exactly once
  per tick and the loop reaches `isGameOver` on an elimination scenario.
- **`published`-flag semantics could regress the idempotency E2E.** The capstone
  multiplayer integration test asserts double-publish suppression via
  `hasPublishedOutcome()`. Mitigation: keep the guard latching on the *success*
  path unchanged (consumed → `true` → no second publish); only the throwing-path
  behavior changes. Re-run `src/__tests__/integration/phase4Multiplayer.test.ts`.
- **Match-log flag could be read before any append.** Default the flag to
  "healthy/undiverged" so a fresh session is not falsely reported diverged.
