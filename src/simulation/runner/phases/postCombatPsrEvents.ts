import {
  GameEventType,
  type IGameEvent,
  type IGameState,
} from '@/types/gameplay';
import { resolvePilotConsciousnessCheck } from '@/utils/gameplay/damage';
import { projectPsrResolutionTarget } from '@/utils/gameplay/pilotingSkillRolls/eventTargets';

import {
  type IRunnerPSRBatchResult,
  type IRunnerPSRResult,
} from './psrEdgeRerolls';
import { createGameEvent } from './utils';

interface IPsrEventRuntime {
  readonly events: IGameEvent[];
  readonly gameId: string;
}

function psrResolvedPayload(
  unitId: string,
  psrResult: IRunnerPSRResult,
): IGameEvent['payload'] {
  const target = projectPsrResolutionTarget(psrResult);
  const details = {
    roll: psrResult.roll,
    modifiers: psrResult.modifiers.reduce(
      (sum, modifier) => sum + modifier.value,
      0,
    ),
    passed: psrResult.passed,
    ...(psrResult.edgeReroll !== undefined
      ? { edgeReroll: psrResult.edgeReroll }
      : {}),
    ...(psrResult.edgeSuperseded !== undefined
      ? { edgeSuperseded: psrResult.edgeSuperseded }
      : {}),
    ...(psrResult.edgeTrigger !== undefined
      ? { edgeTrigger: psrResult.edgeTrigger }
      : {}),
    ...(psrResult.edgePointsRemaining !== undefined
      ? { edgePointsRemaining: psrResult.edgePointsRemaining }
      : {}),
    ...(psrResult.psr.reasonCode !== undefined
      ? { reasonCode: psrResult.psr.reasonCode }
      : {}),
  };
  const identity = { unitId, reason: psrResult.psr.reason };
  return target.automaticFailure
    ? { ...identity, automaticFailure: true, ...details, passed: false }
    : { ...identity, targetNumber: target.targetNumber, ...details };
}

export function emitPsrResolvedEvents(options: {
  readonly runtime: IPsrEventRuntime;
  readonly state: IGameState;
  readonly unitId: string;
  readonly batchResult: IRunnerPSRBatchResult;
}): void {
  const { batchResult, runtime, state, unitId } = options;
  for (const psrResult of batchResult.results) {
    runtime.events.push(
      createGameEvent(
        runtime.gameId,
        runtime.events.length,
        GameEventType.PSRResolved,
        state.turn,
        state.phase,
        psrResolvedPayload(unitId, psrResult),
        unitId,
      ),
    );
  }
}

export function emitPsrFallEvents(options: {
  readonly state: IGameState;
  readonly runtime: IPsrEventRuntime;
  readonly unitId: string;
  readonly failedPsr: IRunnerPSRResult | undefined;
  readonly pilotConscious: boolean;
  readonly newPilotWounds: number;
  readonly consciousnessCheck: ReturnType<
    typeof resolvePilotConsciousnessCheck
  >;
}): void {
  const {
    consciousnessCheck,
    failedPsr,
    newPilotWounds,
    pilotConscious,
    runtime,
    state,
    unitId,
  } = options;

  runtime.events.push(
    createGameEvent(
      runtime.gameId,
      runtime.events.length,
      GameEventType.UnitFell,
      state.turn,
      state.phase,
      {
        unitId,
        pilotDamage: 1,
        location: 'center_torso',
        ...(failedPsr ? { reason: failedPsr.psr.reason } : {}),
        ...(failedPsr?.psr.reasonCode !== undefined
          ? { reasonCode: failedPsr.psr.reasonCode }
          : {}),
      },
      unitId,
    ),
  );

  runtime.events.push(
    createGameEvent(
      runtime.gameId,
      runtime.events.length,
      GameEventType.PilotHit,
      state.turn,
      state.phase,
      {
        unitId,
        wounds: 1,
        totalWounds: newPilotWounds,
        source: 'fall' as const,
        consciousnessCheckRequired: true,
        consciousnessCheckPassed: pilotConscious,
        edgeReroll: consciousnessCheck.edgeReroll,
        edgeSuperseded: consciousnessCheck.edgeSuperseded,
        edgeTrigger: consciousnessCheck.edgeTrigger,
        edgePointsRemaining: consciousnessCheck.edgePointsRemaining,
      },
      unitId,
    ),
  );
}
