import type { UnitReadiness } from '@/stores/campaign/useCampaignRosterStore';

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

export function getDamagePercent(armorDamage: Record<string, number>): number {
  return Math.min(
    100,
    Object.values(armorDamage).reduce((sum, value) => sum + value, 0) * 5,
  );
}
