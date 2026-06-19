import { STANDARD_STRUCTURE_TABLE } from '@/utils/gameplay/damage';

const LOCATION_KEY_MAP: Readonly<Record<string, string>> = {
  HEAD: 'head',
  CENTER_TORSO: 'center_torso',
  LEFT_TORSO: 'left_torso',
  RIGHT_TORSO: 'right_torso',
  LEFT_ARM: 'left_arm',
  RIGHT_ARM: 'right_arm',
  LEFT_LEG: 'left_leg',
  RIGHT_LEG: 'right_leg',
};

function toLowerLocation(upperKey: string): string {
  return (
    LOCATION_KEY_MAP[upperKey] ?? upperKey.toLowerCase().replace(/ /g, '_')
  );
}

export function getStructureForTonnage(
  tonnage: number,
): Record<string, number> {
  const entry = STANDARD_STRUCTURE_TABLE[tonnage];
  if (!entry) {
    const fallback = STANDARD_STRUCTURE_TABLE[50];
    return {
      head: fallback.head,
      center_torso: fallback.centerTorso,
      left_torso: fallback.sideTorso,
      right_torso: fallback.sideTorso,
      left_arm: fallback.arm,
      right_arm: fallback.arm,
      left_leg: fallback.leg,
      right_leg: fallback.leg,
    };
  }
  return {
    head: entry.head,
    center_torso: entry.centerTorso,
    left_torso: entry.sideTorso,
    right_torso: entry.sideTorso,
    left_arm: entry.arm,
    right_arm: entry.arm,
    left_leg: entry.leg,
    right_leg: entry.leg,
  };
}

export function extractArmor(
  armorData: Record<string, unknown>,
): Record<string, number> {
  const result: Record<string, number> = {};

  for (const [upperKey, value] of Object.entries(armorData)) {
    const lowerKey = toLowerLocation(upperKey);
    if (typeof value === 'number') {
      result[lowerKey] = value;
    } else if (typeof value === 'object' && value !== null) {
      const obj = value as { front?: number; rear?: number };
      if (typeof obj.front === 'number') {
        result[lowerKey] = obj.front;
      }
      if (typeof obj.rear === 'number') {
        result[`${lowerKey}_rear`] = obj.rear;
      }
    }
  }

  return result;
}

export function applyInitialDamageToArmor(
  armor: Record<string, number>,
  initialDamage: Record<string, number>,
): void {
  for (const [loc, dmg] of Object.entries(initialDamage)) {
    if (loc in armor) {
      armor[loc] = Math.max(0, (armor[loc] ?? 0) - dmg);
    }
  }
}
