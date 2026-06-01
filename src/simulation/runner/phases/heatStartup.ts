import type { D6Roller } from '@/utils/gameplay/diceTypes';

import { getShutdownTN } from '@/constants/heat';
import {
  GameEventType,
  GamePhase,
  IGameEvent,
  IUnitGameState,
} from '@/types/gameplay';

import { createGameEvent } from './utils';

interface IApplyRunnerStartupAttemptOptions {
  readonly unit: IUnitGameState;
  readonly unitId: string;
  readonly heat: number;
  readonly turn: number;
  readonly events?: IGameEvent[];
  readonly gameId?: string;
  readonly d6Roller?: D6Roller;
  readonly hotDogTargetNumberModifier?: number;
}

export function applyRunnerStartupAttempt(
  options: IApplyRunnerStartupAttemptOptions,
): IUnitGameState {
  const {
    d6Roller,
    events,
    gameId,
    heat,
    hotDogTargetNumberModifier = 0,
    turn,
    unit,
    unitId,
  } = options;
  if (!unit.shutdown || heat > 29) {
    return unit;
  }

  const targetNumber = getShutdownTN(heat, hotDogTargetNumberModifier);
  if (targetNumber > 0 && !d6Roller) {
    return unit;
  }

  const autoRestart = targetNumber === 0;
  const rolls = autoRestart ? [] : [d6Roller!(), d6Roller!()];
  const roll = rolls.reduce((total, die) => total + die, 0);
  const success = autoRestart || roll >= targetNumber;

  if (events && gameId) {
    events.push(
      createGameEvent(
        gameId,
        events.length,
        GameEventType.StartupAttempt,
        turn,
        GamePhase.Heat,
        {
          unitId,
          targetNumber,
          roll,
          success,
          ...(rolls.length > 0 ? { rolls } : {}),
        },
        unitId,
      ),
    );
  }

  return {
    ...unit,
    shutdown: success ? false : unit.shutdown,
  };
}
