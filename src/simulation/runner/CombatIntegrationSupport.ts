import type {
  ICombatFeatureSourceReference,
  ICombatFeatureSupportEntry,
} from './CombatFeatureSupport';

import {
  ACTION_REMOVAL_SOURCE_REFS,
  EJECTED_TARGETABILITY_SOURCE_REFS,
  LOCAL_EJECTION_SOURCE_REFS,
  LOCAL_SURVIVOR_COUNT_SOURCE_REFS,
  RETREATED_TARGETABILITY_SOURCE_REFS,
  SHUTDOWN_TARGETABILITY_SOURCE_REFS,
} from './CombatLifecycleSourceRefs';

const MEKSTATION_SOURCE_VERSION = 'MekStation working-tree';

function mekstationDeviationSourceRef(
  citation: string,
  path: string,
  lineAnchor: string,
): ICombatFeatureSourceReference {
  return {
    kind: 'mekstation-deviation',
    citation,
    url: `${path}#${lineAnchor}`,
    sourceVersion: MEKSTATION_SOURCE_VERSION,
  };
}

function integrated(
  id: string,
  evidence: string,
  sourceRefs?: readonly ICombatFeatureSourceReference[],
): ICombatFeatureSupportEntry {
  return sourceRefs
    ? { id, level: 'integrated', evidence, sourceRefs }
    : { id, level: 'integrated', evidence };
}

const TARGETABILITY_LIFECYCLE_SOURCE_REFS = [
  ...SHUTDOWN_TARGETABILITY_SOURCE_REFS,
  ...RETREATED_TARGETABILITY_SOURCE_REFS,
  ...EJECTED_TARGETABILITY_SOURCE_REFS,
] satisfies readonly ICombatFeatureSourceReference[];

const EJECTION_INTEGRATION_SOURCE_REFS = [
  ...LOCAL_EJECTION_SOURCE_REFS,
  mekstationDeviationSourceRef(
    'MekStation ejection lifecycle integration test routes catalog-adapted BattleMechs through utility command, game intent, wire dispatch, UnitEjected state, targetability removal, and post-battle outcome counts.',
    'src/simulation/runner/__tests__/ejectionLifecycle.integration.test.ts',
    'L63-L143',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

const OBJECTIVE_CONTROL_SOURCE_REFS = [
  ...LOCAL_SURVIVOR_COUNT_SOURCE_REFS,
  mekstationDeviationSourceRef(
    'MekStation objective control treats only alive, non-retreated, non-ejected units as objective hex occupants.',
    'src/utils/gameplay/objectives/objectiveEngine.ts',
    'L40-L95',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

const OBJECTIVE_OUTCOME_SOURCE_REFS = [
  ...LOCAL_SURVIVOR_COUNT_SOURCE_REFS,
  mekstationDeviationSourceRef(
    'MekStation checkVictoryConditions consults evaluateObjectiveOutcome before destruction and turn-limit fallback winner selection.',
    'src/utils/gameplay/gameState/gameStateReducer.ts',
    'L390-L425',
  ),
  mekstationDeviationSourceRef(
    'MekStation evaluateObjectiveOutcome routes markerless, capture, defend, and breakthrough scenarios through one objective outcome gate.',
    'src/utils/gameplay/objectives/objectiveEngine.ts',
    'L340-L364',
  ),
  mekstationDeviationSourceRef(
    'MekStation SimulationRunnerState.isGameOver consults evaluateObjectiveOutcome before survivor-count game-over checks.',
    'src/simulation/runner/SimulationRunnerState.ts',
    'L635-L652',
  ),
  mekstationDeviationSourceRef(
    'MekStation GameOutcomeCalculator consults evaluateObjectiveOutcome before elimination, mutual destruction, and turn-limit outcome branches.',
    'src/services/game-resolution/GameOutcomeCalculator.ts',
    'L178-L225',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

const PSR_QUEUE_LIFECYCLE_SOURCE_REFS = [
  mekstationDeviationSourceRef(
    'MekStation applyPhaseChanged resets lock/action state and deliberately preserves pendingPSRs across intra-turn phase transitions.',
    'src/utils/gameplay/gameState/phaseManagement.ts',
    'L11-L43',
  ),
  mekstationDeviationSourceRef(
    'MekStation applyTurnStarted clears stale pendingPSRs at the next turn boundary.',
    'src/utils/gameplay/gameState/phaseManagement.ts',
    'L45-L73',
  ),
  mekstationDeviationSourceRef(
    'MekStation phaseManagement regression tests prove applyPhaseChanged preserves pendingPSRs and applyTurnStarted clears them.',
    'src/utils/gameplay/gameState/__tests__/phaseManagement.test.ts',
    'L124-L279',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

const INTERACTIVE_TERMINAL_SOURCE_REFS = [
  mekstationDeviationSourceRef(
    'MekStation endGame appends a GameEnded event through the event-sourced session reducer path.',
    'src/utils/gameplay/gameSessionCore.ts',
    'L176-L197',
  ),
  mekstationDeviationSourceRef(
    'MekStation InteractiveSession.finalizeSessionOutcome converts calculated outcomes into endGame GameEnded events before publishing combat outcomes.',
    'src/engine/InteractiveSession.outcome.ts',
    'L31-L76',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

const RUNNER_TERMINAL_SOURCE_REFS = [
  mekstationDeviationSourceRef(
    'MekStation SimulationRunner derives matchTerminalState from operable survivors before appending the terminal GameEnded event.',
    'src/simulation/runner/SimulationRunner.ts',
    'L381-L412',
  ),
  mekstationDeviationSourceRef(
    'MekStation appendRunnerGameEndedEvent maps runner winner/reason/turns into a terminal GameEnded replay event.',
    'src/simulation/runner/SimulationRunnerTerminalEvent.ts',
    'L52-L84',
  ),
  mekstationDeviationSourceRef(
    'MekStation terminal parity behavior test proves SimulationRunner returns terminal summary fields and appends terminal GameEnded events.',
    'src/simulation/runner/__tests__/simulationRunnerTerminalParity.behavior.test.ts',
    'L31-L92',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

const TERMINAL_SURVIVOR_SOURCE_REFS = [
  ...LOCAL_SURVIVOR_COUNT_SOURCE_REFS,
  mekstationDeviationSourceRef(
    'MekStation appendRunnerGameEndedEvent survivor checks exclude destroyed, retreated, ejected, and unconscious units before selecting destruction or turn-limit reasons.',
    'src/simulation/runner/SimulationRunnerTerminalEvent.ts',
    'L21-L50',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const COMBAT_INTEGRATION_SCENARIO_SUPPORT = {
  'turn-rotation-lifecycle-removal': integrated(
    'turn-rotation-lifecycle-removal',
    'getActiveUnits, getUnitsAwaitingAction, and allUnitsLocked exclude destroyed, shutdown, unconscious, retreated, and ejected actors',
    ACTION_REMOVAL_SOURCE_REFS,
  ),
  'interactive-actor-lifecycle-removal': integrated(
    'interactive-actor-lifecycle-removal',
    'getAvailableActionsForState returns no movement or attack actions for shutdown, retreated, or ejected actors',
    ACTION_REMOVAL_SOURCE_REFS,
  ),
  'targetability-lifecycle-filter': integrated(
    'targetability-lifecycle-filter',
    'interactive action queries and validateDeclaredAttackTarget keep shutdown targets legal while rejecting destroyed, retreated, ejected, same-side, and missing targets',
    TARGETABILITY_LIFECYCLE_SOURCE_REFS,
  ),
  'ejection-damage-preservation': integrated(
    'ejection-damage-preservation',
    'UnitEjected reducer marks hasEjected and resolves the unit without mutating armor, structure, destroyed, or pilotConscious',
    EJECTION_INTEGRATION_SOURCE_REFS,
  ),
  'ejection-command-intent-outcome': integrated(
    'ejection-command-intent-outcome',
    'ejectionLifecycle.integration.test.ts routes catalog-adapted BattleMechs through utility command, game intent, wire dispatch, UnitEjected state, targetability removal, and post-battle outcome counts',
    EJECTION_INTEGRATION_SOURCE_REFS,
  ),
  'objective-control-lifecycle-filter': integrated(
    'objective-control-lifecycle-filter',
    'detectObjectiveControl and breakthrough objective counting ignore destroyed, retreated, and ejected units',
    OBJECTIVE_CONTROL_SOURCE_REFS,
  ),
  'objective-outcome-precedence': integrated(
    'objective-outcome-precedence',
    'checkVictoryConditions, SimulationRunnerState.isGameOver, and determineWinner all consult evaluateObjectiveOutcome before destruction or turn-limit fallback',
    OBJECTIVE_OUTCOME_SOURCE_REFS,
  ),
  'terminal-survivor-filter': integrated(
    'terminal-survivor-filter',
    'checkVictoryConditions and SimulationRunnerState.isUnitOperable exclude destroyed, retreated, and ejected units from survivor counts',
    TERMINAL_SURVIVOR_SOURCE_REFS,
  ),
  'phase-psr-queue-lifecycle': integrated(
    'phase-psr-queue-lifecycle',
    'applyPhaseChanged preserves pendingPSRs through intra-turn phases and applyTurnStarted clears stale pendingPSRs at the next turn boundary',
    PSR_QUEUE_LIFECYCLE_SOURCE_REFS,
  ),
  'runner-terminal-summary': integrated(
    'runner-terminal-summary',
    'SimulationRunner returns winner and matchTerminalState derived from shared objective and survivor-count predicates',
    [...OBJECTIVE_OUTCOME_SOURCE_REFS, ...RUNNER_TERMINAL_SOURCE_REFS],
  ),
  'interactive-terminal-event': integrated(
    'interactive-terminal-event',
    'InteractiveSession finalization paths call endGame, appending GameEnded for concede, abort, destruction, turn-limit, and objective outcomes',
    INTERACTIVE_TERMINAL_SOURCE_REFS,
  ),
  'runner-terminal-game-ended-event': integrated(
    'runner-terminal-game-ended-event',
    'SimulationRunner.run appends terminal GameEnded to the replay event log using the same winner and terminal reason represented by the run summary',
    RUNNER_TERMINAL_SOURCE_REFS,
  ),
} satisfies Record<string, ICombatFeatureSupportEntry>;
