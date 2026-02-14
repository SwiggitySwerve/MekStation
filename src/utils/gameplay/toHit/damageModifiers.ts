import {
  IActuatorDamage,
  IIndirectFire,
  ISecondaryTarget,
  IToHitModifierDetail,
} from '@/types/gameplay';

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
