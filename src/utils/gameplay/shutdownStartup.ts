import type { IUnitGameState } from '@/types/gameplay';

import { HEAT_THRESHOLDS } from '@/constants/heat';

/** Shared heat-phase startup eligibility; event replay applies recorded results. */
export function canAttemptHeatStartup(
  unit: Pick<IUnitGameState, 'shutdown' | 'empShutdownTurns'>,
  heat: number,
): boolean {
  if (
    !unit.shutdown ||
    heat > HEAT_THRESHOLDS.AUTO_SHUTDOWN - 1 ||
    (unit.empShutdownTurns ?? 0) > 0
  ) {
    return false;
  }
  return true;
}

/** Choose once before startup so a restart cannot immediately shut down again. */
export function getHeatStartupShutdownAction(
  unit: Pick<IUnitGameState, 'shutdown' | 'empShutdownTurns'>,
  heat: number,
): 'startup' | 'shutdown-check' | 'none' {
  if (unit.shutdown) {
    return canAttemptHeatStartup(unit, heat) ? 'startup' : 'none';
  }
  return heat >= HEAT_THRESHOLDS.SHUTDOWN_CHECK ? 'shutdown-check' : 'none';
}

/** Automatic startup needs no pilot action; a required roll needs a conscious pilot. */
export function canRollHeatStartup(
  unit: Pick<IUnitGameState, 'pilotConscious'>,
  targetNumber: number,
): boolean {
  return targetNumber > 0 && unit.pilotConscious;
}

/** Advance the represented EMP shutdown timer once at a new turn. */
export function advanceEmpShutdownTurns(remaining: number | undefined): number {
  return Math.max(0, Math.trunc(remaining ?? 0) - 1);
}
