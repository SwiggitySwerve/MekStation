import {
  GamePhase,
  type IGameEvent,
  type IUnitGameState,
} from '@/types/gameplay';
import { createPSRTriggeredEvent } from '@/utils/gameplay/gameEvents/statusChecks';
import { createShutdownPSR } from '@/utils/gameplay/pilotingSkillRolls';

export function queueRunnerShutdownPSR(options: {
  readonly unit: IUnitGameState;
  readonly unitId: string;
  readonly turn: number;
  readonly events: IGameEvent[];
  readonly gameId: string;
}): IUnitGameState {
  const { events, gameId, turn, unit, unitId } = options;
  const psr = createShutdownPSR(unitId);

  events.push(
    createPSRTriggeredEvent(
      gameId,
      events.length,
      turn,
      GamePhase.Heat,
      unitId,
      psr.reason,
      psr.additionalModifier,
      psr.triggerSource,
      unit.piloting,
      psr.reasonCode,
    ),
  );

  return {
    ...unit,
    pendingPSRs: [...(unit.pendingPSRs ?? []), psr],
  };
}
