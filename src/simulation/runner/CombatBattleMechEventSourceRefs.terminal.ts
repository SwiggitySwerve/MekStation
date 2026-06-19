import { GameEventType } from '@/types/gameplay';

import type { ICombatFeatureSourceReference } from './CombatFeatureSourceReference';

import { remappedMekStationDeviationSourceRef as mekstationDeviationSourceRef } from './CombatRemappedSourceReference';
import { BATTLEMECH_SPOTTING_EVENT_SOURCE_REFS } from './CombatSpottingSourceRefs';

export const BATTLEMECH_RETREAT_EJECTION_EVENT_SOURCE_REFS = [
  mekstationDeviationSourceRef(
    'MekStation physical/status event factories create RetreatTriggered, UnitRetreated, and UnitEjected payloads.',
    'src/utils/gameplay/gameEvents/statusPhysical.ts',
    'L267-L364',
  ),
  mekstationDeviationSourceRef(
    'MekStation game-engine phases append RetreatTriggered and UnitRetreated events during forced-withdrawal movement.',
    'src/engine/GameEngine.phases.ts',
    'L123-L270',
  ),
  mekstationDeviationSourceRef(
    'MekStation AI turn handling appends RetreatTriggered and UnitRetreated events for bot withdrawal behavior.',
    'src/engine/InteractiveSession.ai.ts',
    'L218-L270',
  ),
  mekstationDeviationSourceRef(
    'MekStation ejection reducer removes ejected units from active targeting and action participation while preserving damage state.',
    'src/utils/gameplay/gameState/unitExitState.ts',
    'L45-L59',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const BATTLEMECH_NEURAL_INTERFACE_EVENT_SOURCE_REFS = [
  mekstationDeviationSourceRef(
    'MekStation physical/status event factories create NeuralInterfaceStateChanged payloads for represented active-DNI jack-in and jack-out state.',
    'src/utils/gameplay/gameEvents/statusPhysical.ts',
    'L367-L409',
  ),
  mekstationDeviationSourceRef(
    'MekStation unit-exit replay reducer replays NeuralInterfaceStateChanged by updating only the target unit neuralInterfaceActive flag.',
    'src/utils/gameplay/gameState/unitExitState.ts',
    'L61-L73',
  ),
  mekstationDeviationSourceRef(
    'MekStation event dispatch routes NeuralInterfaceStateChanged events into the neural-interface replay helper.',
    'src/utils/gameplay/gameState/eventDispatch.ts',
    'L272-L275',
  ),
  mekstationDeviationSourceRef(
    'MekStation unit-state extension coverage proves VDNI, Buffered VDNI, Prototype DNI, and unknown-unit NeuralInterfaceStateChanged replay behavior.',
    'src/utils/gameplay/__tests__/unitStateExtension.test.ts',
    'L892-L956',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const BATTLEMECH_OBJECTIVE_EVENT_SOURCE_REFS = [
  mekstationDeviationSourceRef(
    'MekStation objective event factories create ObjectiveCaptured, ObjectiveLost, and ObjectiveProgress payloads.',
    'src/utils/gameplay/objectives/objectiveEvents.ts',
    'L25-L185',
  ),
  mekstationDeviationSourceRef(
    'MekStation objective control pass emits ObjectiveCaptured, ObjectiveLost, and ObjectiveProgress events deterministically.',
    'src/utils/gameplay/objectives/objectiveEvents.ts',
    'L199-L275',
  ),
  mekstationDeviationSourceRef(
    'MekStation SimulationRunner runs the objective control event pass at the End phase before terminal checks.',
    'src/simulation/runner/SimulationRunner.ts',
    'L321-L338',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const BATTLEMECH_MORALE_WITHDRAWAL_EVENT_SOURCE_REFS = [
  mekstationDeviationSourceRef(
    'MekStation morale event factories create MoraleShifted, WithdrawalDeclared, and ForcedWithdrawalTriggered payloads.',
    'src/utils/gameplay/gameEvents/morale.ts',
    'L68-L192',
  ),
  mekstationDeviationSourceRef(
    'MekStation withdrawal integration tests assert player WithdrawalDeclared and UnitRetreated event behavior.',
    'src/engine/__tests__/InteractiveSession.withdrawal.test.ts',
    'L129-L163',
  ),
  mekstationDeviationSourceRef(
    'MekStation withdrawal processing tests assert ForcedWithdrawalTriggered event behavior.',
    'src/utils/gameplay/morale/__tests__/withdrawalProcessing.test.ts',
    'L254-L290',
  ),
] satisfies readonly ICombatFeatureSourceReference[];
