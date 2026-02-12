/**
 * Compendium Adapter
 * Converts compendium unit data to IUnitGameState for the game engine.
 */

import type { IWeapon } from '@/simulation/ai/types';

import {
  type IFullUnit,
  getCanonicalUnitService,
} from '@/services/units/CanonicalUnitService';
import { GameSide, LockState } from '@/types/gameplay/GameSessionInterfaces';
import { Facing, MovementType } from '@/types/gameplay/HexGridInterfaces';
import { STANDARD_STRUCTURE_TABLE } from '@/utils/gameplay/damage';

import type { IAdaptedUnit, IAdaptUnitOptions, IWeaponData } from '../types';

// =============================================================================
// Static Weapon Database
// =============================================================================

const WEAPON_DATABASE: Readonly<Record<string, IWeaponData>> = {
  'small-laser': {
    id: 'small-laser',
    name: 'Small Laser',
    shortRange: 1,
    mediumRange: 2,
    longRange: 3,
    damage: 3,
    heat: 1,
    minRange: 0,
    ammoPerTon: -1,
    destroyed: false,
  },
  'medium-laser': {
    id: 'medium-laser',
    name: 'Medium Laser',
    shortRange: 3,
    mediumRange: 6,
    longRange: 9,
    damage: 5,
    heat: 3,
    minRange: 0,
    ammoPerTon: -1,
    destroyed: false,
  },
  'large-laser': {
    id: 'large-laser',
    name: 'Large Laser',
    shortRange: 5,
    mediumRange: 10,
    longRange: 15,
    damage: 8,
    heat: 8,
    minRange: 0,
    ammoPerTon: -1,
    destroyed: false,
  },
  ppc: {
    id: 'ppc',
    name: 'PPC',
    shortRange: 6,
    mediumRange: 12,
    longRange: 18,
    damage: 10,
    heat: 10,
    minRange: 3,
    ammoPerTon: -1,
    destroyed: false,
  },
  'ac-2': {
    id: 'ac-2',
    name: 'AC/2',
    shortRange: 8,
    mediumRange: 16,
    longRange: 24,
    damage: 2,
    heat: 1,
    minRange: 4,
    ammoPerTon: 45,
    destroyed: false,
  },
  'ac-5': {
    id: 'ac-5',
    name: 'AC/5',
    shortRange: 6,
    mediumRange: 12,
    longRange: 18,
    damage: 5,
    heat: 1,
    minRange: 3,
    ammoPerTon: 20,
    destroyed: false,
  },
  'ac-10': {
    id: 'ac-10',
    name: 'AC/10',
    shortRange: 5,
    mediumRange: 10,
    longRange: 15,
    damage: 10,
    heat: 3,
    minRange: 0,
    ammoPerTon: 10,
    destroyed: false,
  },
  'ac-20': {
    id: 'ac-20',
    name: 'AC/20',
    shortRange: 3,
    mediumRange: 6,
    longRange: 9,
    damage: 20,
    heat: 7,
    minRange: 0,
    ammoPerTon: 5,
    destroyed: false,
  },
  'lrm-5': {
    id: 'lrm-5',
    name: 'LRM 5',
    shortRange: 7,
    mediumRange: 14,
    longRange: 21,
    damage: 5,
    heat: 2,
    minRange: 6,
    ammoPerTon: 24,
    destroyed: false,
  },
  'lrm-10': {
    id: 'lrm-10',
    name: 'LRM 10',
    shortRange: 7,
    mediumRange: 14,
    longRange: 21,
    damage: 10,
    heat: 4,
    minRange: 6,
    ammoPerTon: 12,
    destroyed: false,
  },
  'lrm-15': {
    id: 'lrm-15',
    name: 'LRM 15',
    shortRange: 7,
    mediumRange: 14,
    longRange: 21,
    damage: 15,
    heat: 5,
    minRange: 6,
    ammoPerTon: 8,
    destroyed: false,
  },
  'lrm-20': {
    id: 'lrm-20',
    name: 'LRM 20',
    shortRange: 7,
    mediumRange: 14,
    longRange: 21,
    damage: 20,
    heat: 6,
    minRange: 6,
    ammoPerTon: 6,
    destroyed: false,
  },
  'srm-2': {
    id: 'srm-2',
    name: 'SRM 2',
    shortRange: 3,
    mediumRange: 6,
    longRange: 9,
    damage: 4,
    heat: 2,
    minRange: 0,
    ammoPerTon: 50,
    destroyed: false,
  },
  'srm-4': {
    id: 'srm-4',
    name: 'SRM 4',
    shortRange: 3,
    mediumRange: 6,
    longRange: 9,
    damage: 8,
    heat: 3,
    minRange: 0,
    ammoPerTon: 25,
    destroyed: false,
  },
  'srm-6': {
    id: 'srm-6',
    name: 'SRM 6',
    shortRange: 3,
    mediumRange: 6,
    longRange: 9,
    damage: 12,
    heat: 4,
    minRange: 0,
    ammoPerTon: 15,
    destroyed: false,
  },
  'machine-gun': {
    id: 'machine-gun',
    name: 'Machine Gun',
    shortRange: 1,
    mediumRange: 2,
    longRange: 3,
    damage: 2,
    heat: 0,
    minRange: 0,
    ammoPerTon: 200,
    destroyed: false,
  },
};

/**
 * Look up static weapon data by equipment ID.
 */
export function getWeaponData(equipmentId: string): IWeaponData | undefined {
  return WEAPON_DATABASE[equipmentId];
}

// =============================================================================
// Location Key Mapping
// =============================================================================

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

// =============================================================================
// Structure Lookup
// =============================================================================

function getStructureForTonnage(tonnage: number): Record<string, number> {
  const entry = STANDARD_STRUCTURE_TABLE[tonnage];
  if (!entry) {
    // Fall back to nearest valid tonnage
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

// =============================================================================
// Armor Extraction
// =============================================================================

function extractArmor(
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

// =============================================================================
// Weapon Extraction
// =============================================================================

function extractWeapons(
  equipment: readonly { id: string; location: string }[],
  unitId: string,
): IWeapon[] {
  const weapons: IWeapon[] = [];
  const idCounts = new Map<string, number>();

  for (const item of equipment) {
    const data = WEAPON_DATABASE[item.id];
    if (!data) continue;

    const count = (idCounts.get(item.id) ?? 0) + 1;
    idCounts.set(item.id, count);

    weapons.push({
      ...data,
      id: `${unitId}-${item.id}-${count}`,
    });
  }

  return weapons;
}

// =============================================================================
// Movement Calculation
// =============================================================================

function calculateMovement(unitData: Record<string, unknown>): {
  walkMP: number;
  runMP: number;
  jumpMP: number;
} {
  const movement = unitData.movement as
    | { walk?: number; jump?: number }
    | undefined;
  const walkMP = movement?.walk ?? 0;
  const jumpMP = movement?.jump ?? 0;
  const runMP = Math.ceil(walkMP * 1.5);
  return { walkMP, runMP, jumpMP };
}

// =============================================================================
// Compendium Adapter
// =============================================================================

/**
 * Synchronously adapt pre-loaded unit data to an IAdaptedUnit.
 */
export function adaptUnitFromData(
  fullUnit: IFullUnit,
  options: IAdaptUnitOptions = {},
): IAdaptedUnit {
  const side = options.side ?? GameSide.Player;
  const position = options.position ?? { q: 0, r: 0 };
  const facing =
    options.facing ?? (side === GameSide.Player ? Facing.North : Facing.South);
  const initialDamage = options.initialDamage ?? {};

  const unitData = fullUnit as unknown as Record<string, unknown>;
  const tonnage = (unitData.tonnage as number) ?? 50;

  // Armor
  const armorAllocation =
    (unitData.armor as { allocation?: Record<string, unknown> })?.allocation ??
    {};
  const armor = extractArmor(armorAllocation);

  // Apply initial damage to armor
  for (const [loc, dmg] of Object.entries(initialDamage)) {
    if (loc in armor) {
      armor[loc] = Math.max(0, (armor[loc] ?? 0) - dmg);
    }
  }

  // Structure
  const structure = getStructureForTonnage(tonnage);

  // Equipment / Weapons
  const rawEquipment =
    (unitData.equipment as { id: string; location: string }[] | undefined) ??
    [];
  const weapons = extractWeapons(rawEquipment, fullUnit.id);

  // Movement
  const { walkMP, runMP, jumpMP } = calculateMovement(unitData);

  // Ammo — provide one ton of ammo per ballistic/missile weapon type
  const ammo: Record<string, number> = {};
  for (const w of weapons) {
    if (w.ammoPerTon > 0) {
      ammo[w.id] = w.ammoPerTon;
    }
  }

  return {
    id: fullUnit.id,
    side,
    position,
    facing,
    heat: 0,
    movementThisTurn: MovementType.Stationary,
    hexesMovedThisTurn: 0,
    armor,
    structure,
    destroyedLocations: [],
    destroyedEquipment: [],
    ammo,
    pilotWounds: 0,
    pilotConscious: true,
    destroyed: false,
    lockState: LockState.Pending,
    weapons,
    walkMP,
    runMP,
    jumpMP,
  };
}

/**
 * Asynchronously load a unit by ID from the compendium and adapt it.
 * Returns null if the unit is not found.
 */
export async function adaptUnit(
  unitId: string,
  options: IAdaptUnitOptions = {},
): Promise<IAdaptedUnit | null> {
  const service = getCanonicalUnitService();
  const fullUnit = await service.getById(unitId);
  if (!fullUnit) return null;
  return adaptUnitFromData(fullUnit, options);
}
