import type { ITacticalCommandContext } from '@/types/gameplay';

import { movementDeclarationLockInvalidState } from '@/utils/gameplay/movement';

export function runtimeStateUnavailableReason(
  ctx: ITacticalCommandContext,
): string | null {
  if (!ctx.activeUnitId) return 'No unit is active.';
  if (!ctx.canAct) return 'Not your turn.';
  const locked = movementDeclarationLockInvalidState(ctx.activeUnitLockState);
  return locked?.details ?? null;
}
