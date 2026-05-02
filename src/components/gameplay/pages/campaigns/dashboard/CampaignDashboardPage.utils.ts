import type { UnitReadiness } from '@/stores/campaign/useCampaignRosterStore';
import type { IUnitCombatState } from '@/types/campaign/UnitCombatState';

import type { MissionResult } from './CampaignDashboardPage.types';

export function getReadinessBadge(
  readiness: UnitReadiness,
): 'success' | 'warning' | 'red' {
  switch (readiness) {
    case 'Ready':
      return 'success';
    case 'Damaged':
      return 'warning';
    case 'Destroyed':
      return 'red';
  }
}

export function getMissionResultBadge(
  result: MissionResult,
): 'success' | 'red' | 'warning' | 'muted' {
  switch (result) {
    case 'victory':
      return 'success';
    case 'defeat':
      return 'red';
    case 'draw':
      return 'warning';
    default:
      return 'muted';
  }
}

/**
 * Compute the dashboard's damage-bar percentage from canonical combat
 * state.
 *
 * Per `canonicalize-unit-combat-state` PR-B: replaces the legacy
 * `getDamagePercent(armorDamage)` accessor that read deltas from the
 * deleted `ICampaignUnitState.armorDamage` field. The canonical state
 * doesn't carry damage deltas — only "remaining" values — so we
 * approximate "how damaged" with destroyed component + location counts
 * (the same heuristic used by `RosterStateCards.useDamageBarData`).
 *
 * @param combatState Canonical state for the unit, or `undefined` if the
 *   unit hasn't been deployed.
 * @returns Damage percent in `[0, 100]` for the bar width.
 */
export function computeDashboardDamagePercent(
  combatState: IUnitCombatState | undefined,
): number {
  if (!combatState) return 0;
  const destroyedCount = combatState.destroyedComponents.length;
  const destroyedLocationCount = combatState.destroyedLocations.length;
  // Each destroyed component or location contributes ~5%/10% to the
  // bar. Mirrors the heuristic in `RosterStateCards.computeDamageBarData`
  // so both bars fill at the same rate.
  const damagePoints = destroyedCount * 2 + destroyedLocationCount * 4;
  return Math.min(100, damagePoints * 5);
}
