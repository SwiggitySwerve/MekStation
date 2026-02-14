import {
  EngineType,
  getEngineDefinition,
} from '../../types/construction/EngineType';

export type MechLocation =
  | 'HD'
  | 'CT'
  | 'LT'
  | 'RT'
  | 'LA'
  | 'RA'
  | 'LL'
  | 'RL';

export type ExplosivePenaltyCategory =
  | 'standard'
  | 'gauss'
  | 'hvac'
  | 'reduced';

export interface ExplosiveEquipmentEntry {
  location: MechLocation;
  slots: number;
  penaltyCategory: ExplosivePenaltyCategory;
}

export interface ExplosivePenaltyConfig {
  equipment: ExplosiveEquipmentEntry[];
  caseLocations: MechLocation[];
  caseIILocations: MechLocation[];
  engineType?: EngineType;
  isQuad?: boolean;
}

export interface ExplosivePenaltyResult {
  totalPenalty: number;
  locationPenalties: Partial<Record<MechLocation, number>>;
}

function getPenaltyPerSlot(category: ExplosivePenaltyCategory): number {
  switch (category) {
    case 'standard':
      return 15;
    case 'gauss':
    case 'hvac':
    case 'reduced':
      return 1;
  }
}

function getEngineSideTorsoSlots(engineType?: EngineType): number {
  if (!engineType) return 0;
  const definition = getEngineDefinition(engineType);
  return definition?.sideTorsoSlots ?? 0;
}

function hasExplosiveEquipmentPenalty(
  location: MechLocation,
  config: ExplosivePenaltyConfig,
): boolean {
  if (config.caseIILocations.includes(location)) {
    return false;
  }

  const hasCASE = config.caseLocations.includes(location);
  const sideTorsoSlots = getEngineSideTorsoSlots(config.engineType);

  if (!config.isQuad && (location === 'LA' || location === 'RA')) {
    if (hasCASE) {
      return false;
    }

    const transferLocation: MechLocation = location === 'LA' ? 'LT' : 'RT';
    return hasExplosiveEquipmentPenalty(transferLocation, config);
  }

  if (location === 'LT' || location === 'RT') {
    return !hasCASE || sideTorsoSlots >= 3;
  }

  return true;
}

export function calculateExplosivePenalties(
  config: ExplosivePenaltyConfig,
): ExplosivePenaltyResult {
  const locationPenalties: Partial<Record<MechLocation, number>> = {};
  let totalPenalty = 0;

  for (const item of config.equipment) {
    if (!hasExplosiveEquipmentPenalty(item.location, config)) {
      continue;
    }

    const penaltyPerSlot = getPenaltyPerSlot(item.penaltyCategory);
    const effectiveSlots = item.penaltyCategory === 'hvac' ? 1 : item.slots;
    const penalty = penaltyPerSlot * effectiveSlots;

    locationPenalties[item.location] =
      (locationPenalties[item.location] ?? 0) + penalty;
    totalPenalty += penalty;
  }

  return {
    totalPenalty,
    locationPenalties,
  };
}
