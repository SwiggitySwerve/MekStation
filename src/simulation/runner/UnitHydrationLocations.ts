import { normalizeEquipmentLocation } from './UnitHydrationText';

export const CATALOG_TO_RUNNER_LOC: Readonly<Record<string, string>> = {
  HEAD: 'head',
  CENTER_TORSO: 'center_torso',
  LEFT_TORSO: 'left_torso',
  RIGHT_TORSO: 'right_torso',
  LEFT_ARM: 'left_arm',
  RIGHT_ARM: 'right_arm',
  LEFT_LEG: 'left_leg',
  RIGHT_LEG: 'right_leg',
  FRONT_LEFT_LEG: 'left_arm',
  FRONT_RIGHT_LEG: 'right_arm',
  REAR_LEFT_LEG: 'left_leg',
  REAR_RIGHT_LEG: 'right_leg',
};

export function runnerCriticalLocationFromCatalogLocation(
  location: string,
): string | undefined {
  const normalized = normalizeEquipmentLocation(location)
    .toUpperCase()
    .replace(/[\s-]+/g, '_');
  return CATALOG_TO_RUNNER_LOC[normalized];
}
