import type {
  CommandAvailability,
  GamePhase,
  ICommandCommitResult,
  ITacticalCommandContext,
} from '@/types/gameplay';

import { GAME_PHASE_ORDER } from '@/utils/gameplay/gamePhaseTransitions';

export const ALL_GAME_PHASES: readonly GamePhase[] = GAME_PHASE_ORDER;

const AVAILABLE: CommandAvailability = { available: true };

export function alwaysAvailable(): CommandAvailability {
  return AVAILABLE;
}

export function canActAvailability(
  ctx: ITacticalCommandContext,
): CommandAvailability {
  if (!ctx.canAct) return { available: false, reason: 'Not your turn.' };
  return AVAILABLE;
}

export function activeUnitTurnAvailability(
  ctx: ITacticalCommandContext,
): CommandAvailability {
  if (!ctx.activeUnitId) {
    return { available: false, reason: 'No unit is active.' };
  }
  return canActAvailability(ctx);
}

export function commitStaticAction(
  actionId: string,
  payload: ICommandCommitResult['payload'] = {},
): (ctx: ITacticalCommandContext) => ICommandCommitResult {
  return () => ({ actionId, payload });
}
