import type { ICombatFeatureSupportEntry } from './CombatFeatureSupport';

function integrated(id: string, evidence: string): ICombatFeatureSupportEntry {
  return { id, level: 'integrated', evidence };
}

export const COMBAT_INTEGRATION_SCENARIO_SUPPORT = {
  'turn-rotation-lifecycle-removal': integrated(
    'turn-rotation-lifecycle-removal',
    'getActiveUnits, getUnitsAwaitingAction, and allUnitsLocked exclude destroyed, shutdown, unconscious, retreated, and ejected actors',
  ),
  'interactive-actor-lifecycle-removal': integrated(
    'interactive-actor-lifecycle-removal',
    'getAvailableActionsForState returns no movement or attack actions for shutdown, retreated, or ejected actors',
  ),
  'targetability-lifecycle-filter': integrated(
    'targetability-lifecycle-filter',
    'interactive action queries and validateDeclaredAttackTarget keep shutdown targets legal while rejecting destroyed, retreated, ejected, same-side, and missing targets',
  ),
  'ejection-damage-preservation': integrated(
    'ejection-damage-preservation',
    'UnitEjected reducer marks hasEjected and resolves the unit without mutating armor, structure, destroyed, or pilotConscious',
  ),
  'ejection-command-intent-outcome': integrated(
    'ejection-command-intent-outcome',
    'ejectionLifecycle.integration.test.ts routes catalog-adapted BattleMechs through utility command, game intent, wire dispatch, UnitEjected state, targetability removal, and post-battle outcome counts',
  ),
  'objective-control-lifecycle-filter': integrated(
    'objective-control-lifecycle-filter',
    'detectObjectiveControl and breakthrough objective counting ignore destroyed, retreated, and ejected units',
  ),
  'objective-outcome-precedence': integrated(
    'objective-outcome-precedence',
    'checkVictoryConditions, SimulationRunnerState.isGameOver, and determineWinner all consult evaluateObjectiveOutcome before destruction or turn-limit fallback',
  ),
  'terminal-survivor-filter': integrated(
    'terminal-survivor-filter',
    'checkVictoryConditions and SimulationRunnerState.isUnitOperable exclude destroyed, retreated, and ejected units from survivor counts',
  ),
  'phase-psr-queue-lifecycle': integrated(
    'phase-psr-queue-lifecycle',
    'applyPhaseChanged preserves pendingPSRs through intra-turn phases and applyTurnStarted clears stale pendingPSRs at the next turn boundary',
  ),
  'runner-terminal-summary': integrated(
    'runner-terminal-summary',
    'SimulationRunner returns winner and matchTerminalState derived from shared objective and survivor-count predicates',
  ),
  'interactive-terminal-event': integrated(
    'interactive-terminal-event',
    'InteractiveSession finalization paths call endGame, appending GameEnded for concede, abort, destruction, turn-limit, and objective outcomes',
  ),
  'runner-terminal-game-ended-event': integrated(
    'runner-terminal-game-ended-event',
    'SimulationRunner.run appends terminal GameEnded to the replay event log using the same winner and terminal reason represented by the run summary',
  ),
} satisfies Record<string, ICombatFeatureSupportEntry>;
