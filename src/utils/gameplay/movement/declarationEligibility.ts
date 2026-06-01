import type { IMovementInvalidPayload } from '@/types/gameplay';

import { LockState } from '@/types/gameplay';

export interface IMovementDeclarationInvalidState {
  readonly reason: IMovementInvalidPayload['reason'];
  readonly details: string;
}

export function movementDeclarationLockInvalidState(
  lockState: LockState | undefined,
): IMovementDeclarationInvalidState | null {
  if (lockState === LockState.Locked || lockState === LockState.Resolved) {
    return {
      reason: 'UnitAlreadyMoved',
      details: 'Unit has already locked movement this phase',
    };
  }
  return null;
}
