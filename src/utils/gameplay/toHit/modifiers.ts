import { MovementType, RangeBracket } from '@/types/gameplay';
import {
  IActuatorDamage,
  IIndirectFire,
  ISecondaryTarget,
  IToHitModifierDetail,
} from '@/types/gameplay';
import {
  ITerrainFeature,
  TERRAIN_PROPERTIES,
} from '@/types/gameplay/TerrainTypes';

import {
  ATTACKER_MOVEMENT_MODIFIERS,
  HEAT_THRESHOLDS,
  RANGE_MODIFIERS,
  TMM_BRACKETS,
} from './constants';

export function createBaseModifier(gunnery: number): IToHitModifierDetail {
  return {
    name: 'Gunnery Skill',
    value: gunnery,
    source: 'base',
    description: `Pilot gunnery skill: ${gunnery}`,
  };
}

export function calculateRangeModifier(
  range: number,
  shortRange: number,
  mediumRange: number,
  longRange: number,
  extremeRange?: number,
): IToHitModifierDetail {
  let bracket: RangeBracket;
  let value: number;

  if (range <= shortRange) {
    bracket = RangeBracket.Short;
    value = RANGE_MODIFIERS[RangeBracket.Short];
  } else if (range <= mediumRange) {
    bracket = RangeBracket.Medium;
    value = RANGE_MODIFIERS[RangeBracket.Medium];
  } else if (range <= longRange) {
    bracket = RangeBracket.Long;
    value = RANGE_MODIFIERS[RangeBracket.Long];
  } else if (extremeRange !== undefined && range <= extremeRange) {
    bracket = RangeBracket.Extreme;
    value = RANGE_MODIFIERS[RangeBracket.Extreme];
  } else {
    bracket = RangeBracket.OutOfRange;
    value = Infinity;
  }

  return {
    name: `Range (${bracket})`,
    value,
    source: 'range',
    description: `Target at ${range} hexes: ${bracket} range`,
  };
}

export function getRangeModifierForBracket(
  bracket: RangeBracket,
): IToHitModifierDetail {
  return {
    name: `Range (${bracket})`,
    value: RANGE_MODIFIERS[bracket],
    source: 'range',
    description: `${bracket} range modifier`,
  };
}

export function calculateAttackerMovementModifier(
  movementType: MovementType,
): IToHitModifierDetail {
  const value = ATTACKER_MOVEMENT_MODIFIERS[movementType];
  return {
    name: 'Attacker Movement',
    value,
    source: 'attacker_movement',
    description: `Attacker ${movementType}: +${value}`,
  };
}

export function calculateTMM(
  movementType: MovementType,
  hexesMoved: number,
): IToHitModifierDetail {
  if (movementType === MovementType.Stationary || hexesMoved === 0) {
    return {
      name: 'Target Movement (TMM)',
      value: 0,
      source: 'target_movement',
      description: 'Target is stationary',
    };
  }

  let tmm =
    TMM_BRACKETS.find((bracket) => {
      return hexesMoved >= bracket.min && hexesMoved <= bracket.max;
    })?.tmm ?? 0;

  if (movementType === MovementType.Jump) {
    tmm += 1;
  }

  return {
    name: 'Target Movement (TMM)',
    value: tmm,
    source: 'target_movement',
    description: `Target moved ${hexesMoved} hexes${movementType === MovementType.Jump ? ' (jumped)' : ''}: +${tmm}`,
  };
}

export function calculateHeatModifier(heat: number): IToHitModifierDetail {
  const threshold = HEAT_THRESHOLDS.find(
    (entry) => heat >= entry.minHeat && heat <= entry.maxHeat,
  );
  const value = threshold?.modifier ?? 0;

  return {
    name: 'Heat',
    value,
    source: 'heat',
    description: heat === 0 ? 'No heat penalty' : `Heat ${heat}: +${value}`,
  };
}

export function calculateMinimumRangeModifier(
  range: number,
  minRange: number,
): IToHitModifierDetail | null {
  if (minRange <= 0 || range >= minRange) {
    return null;
  }

  const penalty = minRange - range;
  return {
    name: 'Minimum Range',
    value: penalty,
    source: 'range',
    description: `Target inside minimum range (${minRange}): +${penalty}`,
  };
}

export function calculateProneModifier(
  targetProne: boolean,
  range: number,
): IToHitModifierDetail | null {
  if (!targetProne) {
    return null;
  }

  const value = range <= 1 ? -2 : 1;
  return {
    name: 'Target Prone',
    value,
    source: 'other',
    description:
      range <= 1
        ? 'Target prone at close range: -2'
        : 'Target prone at range: +1',
  };
}

export function calculateImmobileModifier(
  immobile: boolean,
): IToHitModifierDetail | null {
  if (!immobile) {
    return null;
  }

  return {
    name: 'Target Immobile',
    value: -4,
    source: 'other',
    description: 'Target is immobile: -4',
  };
}

export function calculatePartialCoverModifier(
  partialCover: boolean,
): IToHitModifierDetail | null {
  if (!partialCover) {
    return null;
  }

  return {
    name: 'Partial Cover',
    value: 1,
    source: 'terrain',
    description: 'Target in partial cover: +1',
  };
}

export function calculateHullDownModifier(
  hullDown: boolean,
  partialCover: boolean,
): IToHitModifierDetail | null {
  if (!hullDown || partialCover) {
    return null;
  }

  return {
    name: 'Hull-Down (Partial Cover)',
    value: 1,
    source: 'terrain',
    description: 'Target in hull-down position: +1',
  };
}

export function getTerrainToHitModifier(
  targetTerrain: readonly ITerrainFeature[],
  interveningTerrain: readonly ITerrainFeature[][],
): number {
  let modifier = 0;

  for (const hexFeatures of interveningTerrain) {
    for (const feature of hexFeatures) {
      modifier += TERRAIN_PROPERTIES[feature.type].toHitInterveningModifier;
    }
  }

  if (targetTerrain.length > 0) {
    let targetModifier =
      TERRAIN_PROPERTIES[targetTerrain[0].type].toHitTargetInModifier;
    for (let i = 1; i < targetTerrain.length; i++) {
      const featureModifier =
        TERRAIN_PROPERTIES[targetTerrain[i].type].toHitTargetInModifier;
      if (featureModifier > targetModifier) {
        targetModifier = featureModifier;
      }
    }
    modifier += targetModifier;
  }

  return modifier;
}

export function calculatePilotWoundModifier(
  pilotWounds: number,
): IToHitModifierDetail | null {
  if (pilotWounds <= 0) {
    return null;
  }

  return {
    name: 'Pilot Wounds',
    value: pilotWounds,
    source: 'other',
    description: `Pilot has ${pilotWounds} wound${pilotWounds > 1 ? 's' : ''}: +${pilotWounds}`,
  };
}

export function calculateSecondaryTargetModifier(
  secondaryTarget: ISecondaryTarget,
): IToHitModifierDetail | null {
  if (!secondaryTarget.isSecondary) {
    return null;
  }

  const value = secondaryTarget.inFrontArc ? 1 : 2;
  return {
    name: 'Secondary Target',
    value,
    source: 'other',
    description: secondaryTarget.inFrontArc
      ? 'Secondary target (front arc): +1'
      : 'Secondary target (other arc): +2',
  };
}

export function calculateTargetingComputerModifier(
  hasTargetingComputer: boolean,
): IToHitModifierDetail | null {
  if (!hasTargetingComputer) {
    return null;
  }

  return {
    name: 'Targeting Computer',
    value: -1,
    source: 'equipment',
    description: 'Targeting computer: -1',
  };
}

export function calculateSensorDamageModifier(
  sensorHits: number,
): IToHitModifierDetail | null {
  if (sensorHits <= 0) {
    return null;
  }

  return {
    name: 'Sensor Damage',
    value: sensorHits,
    source: 'damage',
    description: `${sensorHits} sensor hit${sensorHits > 1 ? 's' : ''}: +${sensorHits}`,
  };
}

export function calculateActuatorDamageModifier(
  actuatorDamage: IActuatorDamage,
): IToHitModifierDetail | null {
  let value = 0;
  const parts: string[] = [];

  if (actuatorDamage.shoulderDestroyed) {
    value += 4;
    parts.push('shoulder +4');
  }
  if (actuatorDamage.upperArmDestroyed) {
    value += 1;
    parts.push('upper arm +1');
  }
  if (actuatorDamage.lowerArmDestroyed) {
    value += 1;
    parts.push('lower arm +1');
  }

  if (value <= 0) {
    return null;
  }

  return {
    name: 'Actuator Damage',
    value,
    source: 'damage',
    description: `Actuator damage (${parts.join(', ')}): +${value}`,
  };
}

export function calculateAttackerProneModifier(
  attackerProne: boolean,
): IToHitModifierDetail | null {
  if (!attackerProne) {
    return null;
  }

  return {
    name: 'Attacker Prone',
    value: 2,
    source: 'other',
    description: 'Attacker is prone: +2',
  };
}

export function calculateIndirectFireModifier(
  indirectFire: IIndirectFire,
): IToHitModifierDetail | null {
  if (!indirectFire.isIndirect) {
    return null;
  }

  const value = indirectFire.spotterWalked ? 2 : 1;
  return {
    name: 'Indirect Fire',
    value,
    source: 'other',
    description: indirectFire.spotterWalked
      ? 'Indirect fire (+1) + spotter walked (+1): +2'
      : 'Indirect fire: +1',
  };
}

export function calculateCalledShotModifier(
  calledShot: boolean,
  teammateCalledShot?: boolean,
  abilities?: readonly string[],
): IToHitModifierDetail | null {
  if (!calledShot) {
    return null;
  }

  if (teammateCalledShot) {
    return {
      name: 'Called Shot',
      value: 0,
      source: 'other',
      description: 'Called shot (teammate spotter): +0',
    };
  }

  const sharpshooterReduction = abilities?.includes('sharpshooter') ? 1 : 0;
  const value = 3 - sharpshooterReduction;

  return {
    name: 'Called Shot',
    value,
    source: 'other',
    description:
      sharpshooterReduction > 0
        ? `Called shot (Sharpshooter): +${value}`
        : `Called shot: +${value}`,
  };
}

export function getRangeBracket(
  range: number,
  shortRange: number,
  mediumRange: number,
  longRange: number,
  extremeRange?: number,
): RangeBracket {
  if (range <= shortRange) return RangeBracket.Short;
  if (range <= mediumRange) return RangeBracket.Medium;
  if (range <= longRange) return RangeBracket.Long;
  if (extremeRange !== undefined && range <= extremeRange) {
    return RangeBracket.Extreme;
  }
  return RangeBracket.OutOfRange;
}
