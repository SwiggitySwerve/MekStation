import type { CriticalSlotManifest } from '@/utils/gameplay/criticalHitResolution';

import {
  GamePhase,
  IGameEvent,
  IGameState,
  IHexGrid,
  IMovementCapability,
} from '@/types/gameplay';

import type { IAIPlayer } from '../../ai/IAIPlayer';

import { SeededRandom } from '../../core/SeededRandom';
import { InvariantRunner } from '../../invariants/InvariantRunner';
import { IViolation } from '../../invariants/types';
import { runPhysicalAttackForUnit } from './physicalAttackTurn';
import { createD6Roller } from './utils';

export function runPhysicalAttackPhase(options: {
  state: IGameState;
  botPlayer?: IAIPlayer;
  invariantRunner: InvariantRunner;
  violations: IViolation[];
  events: IGameEvent[];
  gameId: string;
  random: SeededRandom;
  grid?: IHexGrid;
  movementCapabilitiesByUnit?: ReadonlyMap<string, IMovementCapability>;
  optionalRules?: readonly string[];
  manifestsByUnit?: Map<string, CriticalSlotManifest>;
}): IGameState {
  const {
    botPlayer,
    events,
    gameId,
    grid,
    invariantRunner,
    manifestsByUnit,
    movementCapabilitiesByUnit,
    optionalRules,
    random,
    state,
    violations,
  } = options;
  let currentState = { ...state, phase: GamePhase.PhysicalAttack };
  let physicalGrid = grid;
  violations.push(...invariantRunner.runAll(currentState));

  const d6Roller = createD6Roller(random);

  for (const unitId of Object.keys(currentState.units)) {
    const turnResult = runPhysicalAttackForUnit({
      currentState,
      unitId,
      botPlayer,
      events,
      gameId,
      random,
      d6Roller,
      grid: physicalGrid,
      movementCapabilitiesByUnit,
      optionalRules,
      manifestsByUnit,
    });
    currentState = turnResult.state;
    physicalGrid = turnResult.grid;
  }

  violations.push(...invariantRunner.runAll(currentState));
  return currentState;
}
