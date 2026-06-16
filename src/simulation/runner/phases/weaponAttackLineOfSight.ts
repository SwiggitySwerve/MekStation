import type { IHexCoordinate } from '@/types/gameplay/HexGridInterfaces';
import type { IIndirectFireResolution } from '@/types/gameplay/IndirectFireInterfaces';
import type { ILOSResult } from '@/utils/gameplay/lineOfSight';

import {
  computeIndirectFireContext,
  lineOfSightOptionsFromGameState,
} from '@/engine/InteractiveSession.indirectFire';
import {
  GameEventType,
  GamePhase,
  type IGameEvent,
  type IGameState,
  type IHexGrid,
} from '@/types/gameplay';
import { calculateLOS } from '@/utils/gameplay/lineOfSight';

import { createGameEvent } from './utils';

export function validateLineOfSightForAttack(options: {
  currentState: IGameState;
  events: IGameEvent[];
  gameId: string;
  grid: IHexGrid | undefined;
  unitId: string;
  targetId: string;
  weaponId: string;
  attackerPosition: IHexCoordinate;
  targetPosition: IHexCoordinate;
  optionalRules?: readonly string[];
}): {
  permitted: boolean;
  indirectFireResolution: IIndirectFireResolution | null;
  losResult?: ILOSResult;
} {
  const {
    attackerPosition,
    currentState,
    events,
    gameId,
    grid,
    targetId,
    targetPosition,
    unitId,
    weaponId,
    optionalRules,
  } = options;

  if (!grid) {
    return { permitted: true, indirectFireResolution: null };
  }

  const losOptions = lineOfSightOptionsFromGameState(
    currentState,
    optionalRules,
  );
  const losResult = calculateLOS(
    attackerPosition,
    targetPosition,
    grid,
    undefined,
    undefined,
    losOptions,
  );
  if (losResult.hasLOS) {
    return { permitted: true, indirectFireResolution: null, losResult };
  }

  const indirectFireResolution = computeIndirectFireContext(
    unitId,
    weaponId,
    targetPosition,
    currentState,
    grid,
    undefined,
    targetId,
    optionalRules,
  );
  if (indirectFireResolution.permitted && indirectFireResolution.isIndirect) {
    return { permitted: true, indirectFireResolution, losResult };
  }

  events.push(
    createGameEvent(
      gameId,
      events.length,
      GameEventType.AttackInvalid,
      currentState.turn,
      GamePhase.WeaponAttack,
      {
        attackerId: unitId,
        targetId,
        weaponId,
        reason: 'NoLineOfSight' as const,
        details:
          indirectFireResolution.reason ??
          `Line of sight blocked at ${losResult.blockedBy?.q ?? '?'}:${
            losResult.blockedBy?.r ?? '?'
          }`,
      },
      unitId,
    ),
  );

  return { permitted: false, indirectFireResolution, losResult };
}
