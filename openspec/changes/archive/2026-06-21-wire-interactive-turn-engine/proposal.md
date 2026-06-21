# Change: Wire the Interactive Turn Engine

## Why

The interactive (human-facing) combat engine is wired on paper and disconnected
in practice on three of its hottest paths — every one a confirmed Wave 1
finding in the 2026-06-12 full codebase review:

- **C-2 — physical-attack UI commit desyncs the engine from the store.** The
  panel's confirm handler (`src/components/gameplay/PhysicalAttackPanel.tsx:359`)
  calls the store's `commitPhysicalAttack`, which calls the *pure*
  `declarePhysicalAttack` against a session snapshot and then only
  `set(...)`s the cleared plan (`src/stores/useGameplayStore.combatFlows.ts:561`,
  `:591`); the panel does `setSession(next)` (`PhysicalAttackPanel.tsx:392`).
  The engine's `this.session` is **never updated** and the engine's own
  `applyPhysicalAttack` (`src/engine/InteractiveSession.ts:501`) is bypassed.
  On `advancePhase`, `resolveAllPhysicalAttacks` runs against the engine session
  (`src/engine/InteractiveSession.phases.ts:188`), which has no declaration — so
  every kick/punch/charge/DFA **silently no-ops** while the panel shows a false
  "Declared …" summary. The command registry already emits
  `actionId: 'physical-attack'` for all twelve attack types
  (`src/components/gameplay/TacticalActionDock/commands/physicalAttackCommands.ts:129`),
  but no dock dispatch handler routes that `actionId` to the engine.

- **C-3 — interactive + spectator turn loops never run the AI PhysicalAttack
  phase and livelock there.** Both turn-loop drivers advance
  Movement → WeaponAttack → (now PhysicalAttack) and then only test Heat and
  End: `runAITurnLogic` checks Movement, WeaponAttack, Heat, End
  (`src/stores/useGameplayStore.helpers.ts:372`/`:377`/`:382`/`:386`) and
  `SpectatorView.runOneFullTurn` checks the same set
  (`src/components/gameplay/SpectatorView.tsx:59`/`:65`/`:71`/`:75`). Neither
  has a PhysicalAttack branch, so when the engine sits in PhysicalAttack no
  branch fires, `isGameOver` stays false, and the timer-paced loop spins
  forever — Heat/End/victory never resolve. The engine itself is ready: its
  `runAITurn` already handles PhysicalAttack
  (`src/engine/InteractiveSession.ai.ts:183`) and `advancePhase` resolves
  declarations out of PhysicalAttack (`InteractiveSession.phases.ts:188`); only
  the drivers are missing the phase.

- **E-1 — the combat-outcome bus swallows listener exceptions and the publish
  guard flips on throw.** `publishCombatOutcome` wraps each listener in
  `try { listener(event) } catch { /* swallowed */ }` with no logger
  (`src/engine/combatOutcomeBus.ts:76`). `finalizeSessionOutcome` then
  unconditionally returns `{ published: true }`
  (`src/engine/InteractiveSession.outcome.ts:75`), and the engine sets
  `this.outcomePublished = result.published`
  (`src/engine/InteractiveSession.ts:783`). So if the campaign subscriber throws
  (e.g. localStorage quota), the staged outcome is dropped, nothing is logged,
  and `outcomePublished` becomes `true` — the once-per-session idempotency guard
  permanently suppresses any retry. The battle result silently vanishes.

Two medium findings ride the same surfaces:

- Match-log event persistence is fire-and-forget
  (`src/engine/InteractiveSession.ts:671`): a failed append reports divergence
  but the recoverable log silently desyncs from the in-memory session, with no
  surfaced unhealthy state.
- `GameStatus.Active` guards are inconsistent across action methods
  (`src/engine/InteractiveSession.ts:398`+): `applyMovement` / `applyAttack` /
  `applyPhysicalAttack` / `declareWithdrawal` / `applyRuntimeMovementState` can
  mutate a `Completed` session, contradicting the spec's "Game is not active"
  lifecycle rule.

## What Changes

- Route the physical-attack UI commit through the engine: the store's
  `commitPhysicalAttack` (and the dock `physical-attack` action dispatch) call
  `interactiveSession.applyPhysicalAttack(...)` so the engine session carries
  the declaration that `advancePhase`/`resolveAllPhysicalAttacks` consumes — the
  panel snapshot is derived from the engine, never the reverse. Add the missing
  `physical-attack` handler case to the dock action dispatcher.
- Add a PhysicalAttack branch to both turn-loop drivers (`runAITurnLogic` and
  `SpectatorView.runOneFullTurn`): when the phase is PhysicalAttack, run
  `runAITurn` then `advancePhase`, and re-check the phase before each subsequent
  guard so the loop always makes forward progress toward Heat/End/game-over.
- Harden the combat-outcome bus: log every swallowed listener exception with the
  engine logger, and report whether *any* subscriber consumed the event without
  throwing. `finalizeSessionOutcome` only returns `published: true` (and the
  engine only flips `outcomePublished`) when a subscriber actually consumed the
  outcome — a throwing subscriber leaves the guard unset so the next finalize
  attempt can retry.
- Promote match-log persistence from fire-and-forget to a tracked health signal:
  a failed `appendEvent` flips a session-level "log diverged" flag the recovery
  path and UI can observe, instead of silently desyncing.
- Make the `GameStatus.Active` guard uniform across all session-mutating action
  methods: `applyMovement`, `applyAttack`, `applyPhysicalAttack`,
  `declareWithdrawal`, and `applyRuntimeMovementState` reject mutation of a
  non-Active session with the same lifecycle error the spec already mandates.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `physical-attack-system`: gains a requirement that the interactive UI commit
  path declares physical attacks through the engine session (not a detached
  store snapshot) and that the dock dispatches the `physical-attack` actionId.
- `game-session-management`: the existing "Session Publishes Outcome Ready Event"
  requirement is tightened so the once-per-session publish guard only latches on
  a genuinely consumed outcome; a new requirement governs match-log divergence
  visibility.
- `game-engine-orchestration`: the existing "InteractiveSession Player Actions"
  requirement gains a physical-attack-commit + Active-status-guard clause; a new
  requirement governs interactive/spectator turn-loop PhysicalAttack progression
  so the drivers cannot livelock.

## Impact

- `src/stores/useGameplayStore.combatFlows.ts` (`commitPhysicalAttack` routes
  through `interactiveSession.applyPhysicalAttack`).
- `src/components/gameplay/PhysicalAttackPanel.tsx` (confirm handler derives the
  panel snapshot from the engine session).
- The dock action dispatcher consuming `onAction('physical-attack', …)`
  (`src/components/gameplay/TacticalActionDock/commands/physicalAttackCommands.ts`
  emits it; the dispatch site gains the handler case).
- `src/stores/useGameplayStore.helpers.ts` (`runAITurnLogic` PhysicalAttack
  branch + phase re-checks).
- `src/components/gameplay/SpectatorView.tsx` (`runOneFullTurn` PhysicalAttack
  branch + phase re-checks).
- `src/engine/combatOutcomeBus.ts` (log + consumed-flag),
  `src/engine/InteractiveSession.outcome.ts` (consumed-aware `published`),
  `src/engine/InteractiveSession.ts` (match-log divergence flag, uniform Active
  guards on action methods).
- New/extended tests beside the engine and store suites
  (`src/engine/__tests__/`, `src/stores/__tests__/`,
  `src/components/gameplay/__tests__/`).

## Non-goals

- No change to physical-attack to-hit, damage, or hit-location math (owned by
  `physical-attack-system` resolution requirements and the active combat
  validation suite) — this change only wires the existing engine path.
- No networked/co-op transport work (C-5..C-8, MP-1/MP-2 are owned by
  `reconcile-multiplayer-coop-reality`); the outcome-bus hardening is local
  in-process pub/sub only.
- No session persistence/recovery on refresh (C-9 is owned by
  `persist-and-recover-interactive-battles`); the match-log divergence flag here
  only surfaces the unhealthy state, it does not rebuild the session.
- No change to the headless `runToCompletion` driver — it already sequences all
  six phases correctly; only the two interactive drivers are repaired.
