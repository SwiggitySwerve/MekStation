import type { IPendingPSR } from '@/types/gameplay';

import { MovementType } from '@/types/gameplay';

/** The persistent swamp-stuck fields. C8's per-turn reset leaves them alone. */
export interface IStuckState {
  readonly isStuck?: boolean;
  readonly canUnstickByJumping?: boolean;
}

/**
 * A stuck unit may not move, except that it may jump when a failed
 * ground-movement bog-down left it eligible to jump free (MegaMek MoveStep
 * jump legality: `!isStuck() || canUnstickByJumping()`).
 */
export function isStuckMovementBlocked(
  state: IStuckState,
  movementType: MovementType,
): boolean {
  if (state.isStuck !== true) return false;
  return !(
    movementType === MovementType.Jump && state.canUnstickByJumping === true
  );
}

/**
 * Free a stuck unit and drop its jump eligibility. The eligibility key is
 * removed, never written as false, so pre-C6b state digests stay unchanged.
 */
export function clearStuck<T extends IStuckState>(unit: T): T {
  const { canUnstickByJumping: _eligibility, ...rest } = unit;
  return { ...rest, isStuck: false } as T;
}

/**
 * MegaMek 48fcb2f64 MovePathHandler (L3524-L3528): an eligible stuck unit
 * that jumps is freed. Any other movement leaves the unit unchanged.
 */
export function applyJumpUnstick<T extends IStuckState>(
  unit: T,
  movementType: MovementType | undefined,
): T {
  if (
    unit.isStuck === true &&
    unit.canUnstickByJumping === true &&
    movementType === MovementType.Jump
  ) {
    return clearStuck(unit);
  }
  return unit;
}

/**
 * MegaMek 48fcb2f64 MovePathHandler (L3918-L3919): only a failed bog-down
 * roll made during ground movement grants jump eligibility. Jumping into a
 * swamp (L1669-L1673) and displacement bog-down (TWGameManager
 * L10050-L10059) do not. Movement-step PSRs carry a `movement-step:<n>`
 * trigger source; displacement bog-down PSRs do not.
 */
export function failedBogDownGrantsJumpUnstick(psr: IPendingPSR): boolean {
  return psr.triggerSource.startsWith('movement-step:');
}
