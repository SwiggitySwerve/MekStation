# Tasks: Add Combat Morale and Withdrawal

## 1. In-Battle Morale State

- [ ] 1.1 Add `MoraleLevel`, `ISessionMoraleState`, and `battleMorale: Record<GameSide, MoraleLevel>` to the session state in `src/types/gameplay/GameSessionCoreTypes.ts`, defaulting every side to `STEADY`
- [ ] 1.2 Implement the morale-shift function — a pure mapping from a combat event to a per-side morale delta
- [ ] 1.3 Add the `MoraleShifted` event type, payload, and reducer
- [ ] 1.4 Tests: each combat event shifts morale correctly; morale clamps at `ROUTED` / `OVERWHELMING`; replaying the event log reconstructs morale exactly

## 2. Player Withdrawal Action

- [ ] 2.1 Add `WithdrawalDeclared` event/intent, its payload, and an `isWithdrawing` unit flag
- [ ] 2.2 Wire a withdraw action into `InteractiveSession` / `GameEngine.phases` allowing a player to declare withdrawal for an owned unit and choose the target edge
- [ ] 2.3 Route withdrawing player units through the existing edge-ward movement and `UnitRetreated` exit (reuse `RetreatAI.hasReachedEdge`)
- [ ] 2.4 Tests: a declared unit moves toward its edge and emits `UnitRetreated`; the victory check excludes it; an immobilized withdrawing unit stays in place without error

## 3. Forced Withdrawal Rule

- [ ] 3.1 Add the `forcedWithdrawal` boolean to the scenario config, defaulting to `false`
- [ ] 3.2 Implement the end-of-phase check: when enabled, withdraw any unit whose side morale is `BROKEN` or worse, or that is crippled
- [ ] 3.3 Add the `ForcedWithdrawalTriggered` event type and payload
- [ ] 3.4 Bot path: the morale/crippled trigger composes with the existing `RetreatAI` damage triggers without double-withdrawing a unit
- [ ] 3.5 Tests: broken side morale forces withdrawal of eligible units; with the rule off, units fight to destruction; a unit is never withdrawn twice

## 4. Withdrawal UI

- [ ] 4.1 Add a withdraw control with an edge picker to the unit action panel
- [ ] 4.2 Show a forced-withdrawal notice when the rule auto-withdraws a player unit
- [ ] 4.3 Add a per-side morale indicator to the gameplay HUD
- [ ] 4.4 Storybook stories plus render tests for the withdraw control and morale indicator

## 5. Failed Withdrawal

- [ ] 5.1 Apply the first-event-wins discriminator — `UnitDestroyed` before `UnitRetreated` is a combat loss
- [ ] 5.2 Tests: a withdrawing unit destroyed before reaching the edge counts as a combat loss, not a withdrawal

## 6. Verification

- [ ] 6.1 Integration test: a side loses two units, morale breaks, and the Forced Withdrawal rule withdraws a third
- [ ] 6.2 Integration test: a player declares withdrawal, the unit exits the map, and the game-over check resolves correctly
- [ ] 6.3 `openspec validate --strict` clean; build, lint, and typecheck pass
