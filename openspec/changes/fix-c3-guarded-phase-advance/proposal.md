## Why

The gameplay store's `handleSkipAction` and `handleNextTurnAction` advance the
phase with the raw `advancePhase` on the store's own session copy, even when an
`InteractiveSession` is present. A raw advance appends a bare `PhaseChanged`:
declared weapon attacks are never resolved, queued PSRs are never drained, the
morale and withdrawal pass and the End-phase game-over guard never run, and the
store's session diverges from the `InteractiveSession`'s. Separately,
`advanceInteractivePhaseLogic` excludes `PhysicalAttack` from its advanceable
phases, so an interactive Advance there is a silent no-op and declared physical
attacks stay unresolved.

## What Changes

- With an interactive session, Skip and Next Turn call
  `InteractiveSession.advancePhase()` (the guarded advance) and sync the store
  from it, including the game-over state.
- `PhysicalAttack` becomes advanceable in `advanceInteractivePhaseLogic`; the
  advanceable set derives from the shared `GAME_PHASE_ORDER` table.
- The raw advance remains only for a store session with no interactive session
  (store-only demo and test sessions), named in a code comment.
- No enum value, event payload, journal or replay shape changes.

## Impact

Capability: game-session-management. Rules follow MegaMek
`48fcb2f64a1b3f2d575707ce5653dad64927b587`: there is no way to leave a phase
without resolving it. `TWGameManager.skipCurrentTurn`
(`megamek/src/megamek/server/totalWarfare/TWGameManager.java:2826-2861`) skips
one entity's turn by processing an empty move or attack, and the phase ends
only through `endCurrentPhase` -> `TWPhaseEndManager` (`FIRING` at `:187`,
`PHYSICAL` at `:231`, `END` at `:334`), which resolves the phase.

Reachability note: on the live interactive game page `skip` and `next-turn` are
intercepted before the store handlers (`skip` -> `skipPhase`, which already
uses the guarded advance; `next-turn` -> `runAITurn`), so the raw handlers are
a latent path there. This change closes it for any caller that reaches the
store's `handleAction` with an interactive session.

## Entry paths

| Entry | Phase advance |
| --- | --- |
| Store Skip / Next Turn with interactive session | InteractiveSession.advancePhase (this change) |
| Store Skip / Next Turn without interactive session | raw advancePhase on the store session (unchanged, store-only) |
| Store Advance (advanceInteractivePhaseLogic) | InteractiveSession.advancePhase, now including PhysicalAttack |
| Store skipPhase (skipPhaseLogic) | InteractiveSession.advancePhase (unchanged) |
| Interactive page lock / skip / next-turn | skipPhase / runAITurn (unchanged) |
| GameEngine.runToCompletion (QuickResolve, quick game, pre-battle, fast-forward) | unchanged |
| AI | InteractiveSession.runAITurn (unchanged) |
| Multiplayer dispatch and journal authority | ServerMatchHostEngineDispatch -> InteractiveSession.advancePhase (unchanged) |
| P2P | translateEndPhase -> host adapter.advancePhase (unchanged) |
| Standalone simulation | SimulationRunner phase loop (unchanged) |

## Non-goals

Server stale `AdvancePhase` (needs a wire field), `getPhaseActions` content for
Initiative and PhysicalAttack (deferred UI change), runner `PhaseChanged`
emission (D-8), replay migrations, or merging the PR.
