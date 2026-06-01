/**
 * Compendium Adapter
 * Converts compendium unit data to IUnitGameState for the game engine.
 */

import type { IWeapon } from '@/simulation/ai/types';

import {
  type IFullUnit,
  getCanonicalUnitService,
} from '@/services/units/CanonicalUnitService';
import {
  buildWeaponLookupFromCatalogFiles,
  hydrateHeatSinksFromFullUnit,
  resolveCatalogDamage,
} from '@/simulation/runner/UnitHydration';
import { GameSide, LockState } from '@/types/gameplay/GameSessionInterfaces';
import { Facing, MovementType } from '@/types/gameplay/HexGridInterfaces';
import { WEAPON_CATALOG_FILES } from '@/utils/construction/equipmentBVCatalogData';
import { STANDARD_STRUCTURE_TABLE } from '@/utils/gameplay/damage';
import { logger } from '@/utils/logger';

import type { IAdaptedUnit, IAdaptUnitOptions, IWeaponData } from '../types';

import {
  CLAN_PREFIX_PATTERNS,
  WEAPON_DATABASE,
  WEAPON_ID_ALIASES,
} from './CompendiumWeaponData';

const officialWeaponLookup =
  buildWeaponLookupFromCatalogFiles(WEAPON_CATALOG_FILES);

function getOfficialWeaponData(equipmentId: string): IWeaponData | undefined {
  const catalogWeapon = officialWeaponLookup(equipmentId);
  if (!catalogWeapon) return undefined;

  return {
    id: catalogWeapon.id,
    name: catalogWeapon.name,
    shortRange: catalogWeapon.ranges.short,
    mediumRange: catalogWeapon.ranges.medium,
    longRange: catalogWeapon.ranges.long,
    ...(catalogWeapon.ranges.extreme !== undefined
      ? { extremeRange: catalogWeapon.ranges.extreme }
      : {}),
    damage: resolveCatalogDamage(catalogWeapon.damage, catalogWeapon.id),
    heat: catalogWeapon.heat,
    minRange: catalogWeapon.ranges.minimum,
    ammoPerTon: catalogWeapon.ammoPerTon ?? -1,
    destroyed: false,
  };
}

export function canonicalizeWeaponId(equipmentId: string): string {
  if (!equipmentId) return equipmentId;
  const raw = equipmentId.toLowerCase().trim();
  // Normalize separators: whitespace → hyphen, slash → hyphen, collapse dupes.
  const normalized = raw.replace(/[\s/]+/g, '-').replace(/-+/g, '-');
  // Direct alias hit (abbreviations, IS-prefixed)
  if (WEAPON_ID_ALIASES[normalized]) {
    return WEAPON_ID_ALIASES[normalized];
  }
  // Direct catalog hit — done.
  if (officialWeaponLookup(normalized) || WEAPON_DATABASE[normalized]) {
    return normalized;
  }
  // Clan-prefixed fallback: strip prefix and re-check against catalog or
  // alias map. Official Clan rows win for abbreviated prefixes; legacy IS
  // fallback remains for ids the official catalog does not contain.
  for (const pattern of CLAN_PREFIX_PATTERNS) {
    if (pattern.test(normalized)) {
      const stripped = normalized.replace(pattern, '');
      const expandedClan = `clan-${stripped}`;
      if (officialWeaponLookup(expandedClan)) return expandedClan;
      if (officialWeaponLookup(stripped)) return stripped;
      if (WEAPON_DATABASE[stripped]) return stripped;
      if (WEAPON_ID_ALIASES[stripped]) return WEAPON_ID_ALIASES[stripped];
    }
  }
  return normalized;
}

/**
 * Look up official catalog weapon data by equipment ID. Accepts both IS and Clan
 * variants via `canonicalizeWeaponId`. Static weapon data is a legacy
 * fallback after the official catalog. Returns `undefined` when no entry
 * matches — callers are expected to surface the miss (e.g., via
 * `weaponAttackBuilder` logger.warn + skip, per task 3.3) rather than
 * silently defaulting to a 5-damage / 3-heat placeholder.
 */
export function getWeaponData(equipmentId: string): IWeaponData | undefined {
  const canonicalId = canonicalizeWeaponId(equipmentId);
  return getOfficialWeaponData(canonicalId) ?? WEAPON_DATABASE[canonicalId];
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
    // Canonicalize the incoming equipment id so IS/Clan/abbreviation
    // variants all resolve against the static DB (task 2.3). Without this
    // step, an upstream producer that emits "Medium Laser" or
    // "clan-medium-laser" would silently drop the weapon from the unit's
    // inventory — and later the weaponAttackBuilder would warn about a
    // missing weapon that was actually discarded here.
    const canonicalId = canonicalizeWeaponId(item.id);
    const data = getWeaponData(item.id);
    if (!data) {
      // Task 3.3: do not silently skip — surface the miss so data-pipeline
      // bugs are observable. Combat resilience is preserved because the
      // weapon simply isn't added to the unit's inventory, and the bot /
      // player cannot then declare it as a firing weapon.
      logger.warn(
        `[CompendiumAdapter] Weapon id "${item.id}" on unit "${unitId}" ` +
          `(canonical: "${canonicalId}") has no official weapon catalog entry — ` +
          `skipping. Add it to the official catalog or WEAPON_ID_ALIASES.`,
      );
      continue;
    }

    const count = (idCounts.get(canonicalId) ?? 0) + 1;
    idCounts.set(canonicalId, count);

    weapons.push({
      ...data,
      id: `${unitId}-${canonicalId}-${count}`,
      location: item.location,
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
  const heatSinks = hydrateHeatSinksFromFullUnit(fullUnit);

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
    unitType: fullUnit.unitType,
    side,
    position,
    facing,
    heat: 0,
    movementThisTurn: MovementType.Stationary,
    hexesMovedThisTurn: 0,
    heatSinks: heatSinks.count,
    heatSinkType: heatSinks.kind,
    armor,
    structure,
    // Per `add-bot-retreat-behavior` § 2 (Trigger A): seed the retreat
    // baseline with a copy of the starting structure values so the trigger
    // can compute the spec-mandated points-of-internal-structure ratio
    // `sum(starting - current) / sum(starting)`. We deep-copy via spread
    // to avoid aliasing the runtime structure record.
    startingInternalStructure: { ...structure },
    destroyedLocations: [],
    destroyedEquipment: [],
    ammo,
    pilotWounds: 0,
    pilotConscious: true,
    destroyed: false,
    hasRetreated: false,
    hasEjected: false,
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
