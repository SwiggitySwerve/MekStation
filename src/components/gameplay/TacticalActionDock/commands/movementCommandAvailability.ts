import type { ITacticalCommandContext } from '@/types/gameplay';

import { movementDeclarationLockInvalidState } from '@/utils/gameplay/movement';

export function movementActiveTurnUnavailableReason(
  ctx: ITacticalCommandContext,
): string | null {
  if (!ctx.activeUnitId) return 'No unit is active.';
  if (!ctx.canAct) return 'Not your turn.';
  const locked = movementDeclarationLockInvalidState(ctx.activeUnitLockState);
  return locked?.details ?? null;
}

export function movementActiveUnitLockUnavailableReason(
  ctx: ITacticalCommandContext,
  missingUnitReason: string,
): string | null {
  if (!ctx.activeUnitId) return missingUnitReason;
  const locked = movementDeclarationLockInvalidState(ctx.activeUnitLockState);
  return locked?.details ?? null;
}
