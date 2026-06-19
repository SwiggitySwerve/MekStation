import type {
  CommandAvailability,
  ICommandCommitResult,
  ITacticalCommandContext,
} from '@/types/gameplay';

import { GamePhase } from '@/types/gameplay';

export const ALL_GAME_PHASES: readonly GamePhase[] = [
  GamePhase.Initiative,
  GamePhase.Movement,
  GamePhase.WeaponAttack,
  GamePhase.PhysicalAttack,
  GamePhase.Heat,
  GamePhase.End,
];

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
