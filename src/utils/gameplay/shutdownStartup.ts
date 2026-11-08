import type { IUnitGameState } from '@/types/gameplay';

import { HEAT_THRESHOLDS } from '@/constants/heat';

/** Shared heat-phase startup eligibility; event replay applies recorded results. */
export function canAttemptHeatStartup(
  unit: Pick<IUnitGameState, 'shutdown'>,
  heat: number,
): boolean {
  if (!unit.shutdown || heat > HEAT_THRESHOLDS.AUTO_SHUTDOWN - 1) {
    return false;
  }
  return true;
}

/** Advance the represented EMP shutdown timer once at a new turn. */
export function advanceEmpShutdownTurns(remaining: number | undefined): number {
  return Math.max(0, Math.trunc(remaining ?? 0) - 1);
}
