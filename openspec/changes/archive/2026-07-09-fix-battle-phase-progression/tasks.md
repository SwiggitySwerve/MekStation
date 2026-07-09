## 1. Store phase gating (D2, D3)

- [x] 1.1 Add an `AwaitPhaseStart` value to `InteractivePhase` and map `GamePhase.Initiative` to it in `setInteractiveSessionLogic` (`src/stores/useGameplayStore.session.ts:264-285`); grep all `InteractivePhase` switch/consumers and handle the new value explicitly (typecheck must pass — jest+babel passes wrong enum members silently, so `npm run typecheck` is the gate).
- [x] 1.2 In `AwaitPhaseStart`, suppress movement affordances: no reachability overlay, no "Pick a movement path" prompt; unit selection remains for inspection only. Verify the map panel renders no movement-intent UI while engine phase is Initiative.
- [x] 1.3 Add a phase guard to the movement/attack intent dispatch path (`src/stores/useGameplayStore.actionHandlers.ts` and/or the map click handler) that checks `session.currentState.phase` before calling engine actions; on mismatch show a polite toast (`aria-live="polite"`) naming the current phase and the advance control. `declareMovement`'s engine throw stays unchanged.
- [x] 1.4 Unit tests: store adoption maps Initiative → `AwaitPhaseStart`; dispatcher guard rejects out-of-phase movement intent with no store mutation and no throw.

## 2. Player-facing phase advance (D1)

- [x] 2.1 Add a phase-progression command for Initiative to the TacticalActionDock registry (category `phase`, label "Roll Initiative & Begin") wired to the store action that calls `advanceInteractiveSessionPhase` (`src/engine/InteractiveSession.phases.ts:154`); update `TacticalActionDock.01.test.tsx:237-251` (Initiative is no longer command-less).
- [x] 2.2 Surface a persistent advance control on the single-player surface near the turn rail's `phase-name`, `data-testid="sp-advance-phase-button"`, real `<button>`, enabled in every phase, disabled-with-blocker-reasons where required actions remain (reuse the existing End Phase blocker semantics from `heatEndCommands.ts`).
- [x] 2.3 Integration test: adopt a fresh Initiative session in the store → activate the control → engine phase is Movement, initiative order populated, rail phase color/name updates; a subsequent `declareMovement` for the active unit succeeds.
- [x] 2.4 Reload persistence test: advance to Movement, simulate session reload (existing persistence path), engine phase remains Movement.

## 3. GM approval commits to engine (D4)

- [x] 3.1 Audit all 10 GM command families in `src/components/gameplay/TacticalActionDock/commands/gmReferralCommands.ts` + `src/lib/interventions/GmCombatInterventionImplementer.ts` / `GmCombatInterventionProjection.ts`: for each, record whether approval currently applies projected effects to the live `InteractiveSession` or only to the `usePhaseQueueProjection` display layer. Write the findings table into the PR description.
- [x] 3.2 Add a commit seam: on approval, apply the preview's projected effects to the live session through the same write-back used by `advanceInteractiveSessionPhase` (`context.setSession(...)` path), then append the intervention record as today. For `gm.advance-phase` the committed effect is `advanceInteractiveSessionPhase`.
- [x] 3.3 Route every family whose effects are appliable through the commit seam; families that cannot commit return the explicit deferred/unsupported response (no record appended, session unchanged) instead of reporting success — list any such family as follow-up in the PR.
- [x] 3.4 Reconcile projections: a committed effect replaces its pending projection entry (rail "pending" badge clears); integration test asserts single application — one approval advances exactly one phase.
- [x] 3.5 Integration test (spec scenario): Initiative session + `?gm=1` → Advance Phase (GM) → Approve → engine phase is Movement AND a following player `declareMovement` succeeds without `Not in movement phase`.

## 4. Verification

- [x] 4.1 `npm run typecheck && npm run lint` clean; run the dock, store, engine-adjacent, and interventions test suites (`npm test -- --findRelatedTests` on touched files, then the full stable suite `npm run test:stable`).
- [x] 4.2 Live smoke on `npm run dev`: create/enter a campaign mission battle via Play Manually; without `?gm=1` advance out of Initiative, compose and lock a move; with `?gm=1` approve a GM phase advance and confirm the next player action validates against the new phase. Capture screenshots to `.sisyphus/evidence/playtest/` alongside the 2026-07-07 baseline. (Verified live 2026-07-07: player path Initiative→roll→move→lock committed, unit moved; GM approve→engine Movement→composer opens. Screenshots 70–78.)
- [x] 4.3 Confirm no regression on the networked surface: `advance-phase-button` behavior unchanged (existing `NetworkedGameSurface` tests pass untouched).
