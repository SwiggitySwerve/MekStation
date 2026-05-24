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
import {
  Facing,
  type IMovementStandUpCapability,
  type IMovementWaterCapability,
  type MovementStandUpArmActuator,
  MovementType,
  type MovementHeatProfile,
  type MovementMotiveMode,
  type MovementPavementRoadBonusProfile,
  type MovementTerrainProfile,
} from '@/types/gameplay/HexGridInterfaces';
import { STANDARD_STRUCTURE_TABLE } from '@/utils/gameplay/damage';
import { UNIT_QUIRK_IDS } from '@/utils/gameplay/quirkModifiers';
import { logger } from '@/utils/logger';

import type { IAdaptedUnit, IAdaptUnitOptions, IWeaponData } from '../types';

import {
  CLAN_PREFIX_PATTERNS,
  WEAPON_DATABASE,
  WEAPON_ID_ALIASES,
} from './CompendiumWeaponData';

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
  if (WEAPON_DATABASE[normalized]) {
    return normalized;
  }
  // Clan-prefixed fallback: strip prefix and re-check against catalog or
  // alias map. The static DB only holds IS rows today, so this fall-through
  // gives Clan variants the IS equivalent stats (documented below).
  for (const pattern of CLAN_PREFIX_PATTERNS) {
    if (pattern.test(normalized)) {
      const stripped = normalized.replace(pattern, '');
      if (WEAPON_DATABASE[stripped]) return stripped;
      if (WEAPON_ID_ALIASES[stripped]) return WEAPON_ID_ALIASES[stripped];
    }
  }
  return normalized;
}

/**
 * Look up static weapon data by equipment ID. Accepts both IS and Clan
 * variants via `canonicalizeWeaponId`. Returns `undefined` when no entry
 * matches — callers are expected to surface the miss (e.g., via
 * `weaponAttackBuilder` logger.warn + skip, per task 3.3) rather than
 * silently defaulting to a 5-damage / 3-heat placeholder.
 */
export function getWeaponData(equipmentId: string): IWeaponData | undefined {
  const canonicalId = canonicalizeWeaponId(equipmentId);
  return WEAPON_DATABASE[canonicalId];
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
    const data = WEAPON_DATABASE[canonicalId];
    if (!data) {
      // Task 3.3: do not silently skip — surface the miss so data-pipeline
      // bugs are observable. Combat resilience is preserved because the
      // weapon simply isn't added to the unit's inventory, and the bot /
      // player cannot then declare it as a firing weapon.
      logger.warn(
        `[CompendiumAdapter] Weapon id "${item.id}" on unit "${unitId}" ` +
          `(canonical: "${canonicalId}") has no static catalog entry — ` +
          `skipping. Add it to WEAPON_DATABASE or WEAPON_ID_ALIASES.`,
      );
      continue;
    }

    const count = (idCounts.get(canonicalId) ?? 0) + 1;
    idCounts.set(canonicalId, count);

    weapons.push({
      ...data,
      id: `${unitId}-${canonicalId}-${count}`,
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
  movementMode?: MovementMotiveMode;
  movementHeatProfile?: MovementHeatProfile;
  movementTerrainProfile?: MovementTerrainProfile;
  pavementRoadBonusProfile?: MovementPavementRoadBonusProfile;
  unitHeight?: number;
  waterCapability?: IMovementWaterCapability;
  standUpCapability?: IMovementStandUpCapability;
} {
  const movement = recordField(unitData.movement);
  const walkMP =
    numberField(movement, 'walk', 'walkMP', 'groundMP', 'cruiseMP') ??
    numberField(unitData, 'walkMP', 'groundMP', 'cruiseMP') ??
    0;
  const explicitRunMP =
    numberField(movement, 'run', 'runMP', 'flankMP') ??
    numberField(unitData, 'runMP', 'flankMP');
  const jumpMP =
    numberField(movement, 'jump', 'jumpMP', 'jumpingMP') ??
    numberField(unitData, 'jumpMP', 'jumpingMP') ??
    0;
  const runMP = explicitRunMP ?? deriveRunMP(unitData, walkMP);
  const movementMode = movementModeFromUnitData(unitData);
  const movementHeatProfile = movementHeatProfileFromUnitData(unitData);
  const movementTerrainProfile = movementTerrainProfileFromUnitData(unitData);
  const pavementRoadBonusProfile =
    pavementRoadBonusProfileFromUnitData(unitData);
  const unitHeight = unitHeightFromUnitData(unitData);
  const waterCapability = waterCapabilityFromUnitData(unitData);
  const standUpCapability = standUpCapabilityFromUnitData(unitData);
  return {
    walkMP,
    runMP,
    jumpMP,
    ...(movementMode ? { movementMode } : {}),
    ...(movementHeatProfile ? { movementHeatProfile } : {}),
    ...(movementTerrainProfile ? { movementTerrainProfile } : {}),
    ...(pavementRoadBonusProfile ? { pavementRoadBonusProfile } : {}),
    ...(unitHeight !== undefined ? { unitHeight } : {}),
    ...(waterCapability ? { waterCapability } : {}),
    ...(standUpCapability ? { standUpCapability } : {}),
  };
}

function recordField(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)
    : undefined;
}

function numberField(
  source: Record<string, unknown> | undefined,
  ...fieldNames: readonly string[]
): number | undefined {
  for (const fieldName of fieldNames) {
    const value = source?.[fieldName];
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
  }
  return undefined;
}

function deriveRunMP(
  unitData: Record<string, unknown>,
  walkMP: number,
): number {
  const unitType = normalizedKey(unitData.unitType);
  const fastInfantryMove = tacOpsFastInfantryMoveEnabled(unitData);

  // MegaMek Infantry#getRunMP and BattleArmor#getRunMP return walk MP unless
  // the optional TacOps fast-infantry rule is enabled. When source data marks
  // that represented option, preserve MegaMek's fallback instead of deriving a
  // Mek-style 1.5x run MP.
  if (unitType === 'infantry') {
    return fastInfantryMove ? (walkMP > 0 ? walkMP + 1 : walkMP + 2) : walkMP;
  }
  if (unitType === 'battlearmor') {
    return fastInfantryMove ? walkMP + 1 : walkMP;
  }

  return Math.ceil(walkMP * 1.5);
}

function tacOpsFastInfantryMoveEnabled(
  unitData: Record<string, unknown>,
): boolean {
  const movement = recordField(unitData.movement);
  const fieldNames = [
    'tacOpsFastInfantryMove',
    'tacOpsFastInfantryMovement',
    'fastInfantryMove',
    'fastInfantryMovement',
    'fastInfantry',
  ] as const;
  return (
    booleanField(unitData, ...fieldNames) ||
    (movement !== undefined && booleanField(movement, ...fieldNames))
  );
}

const UNIT_HEIGHT_FIELDS = [
  'unitHeight',
  'entityHeight',
  'megamekHeight',
  'megamekEntityHeight',
  'movementHeight',
  'bridgeClearanceHeight',
  'heightAboveElevation',
] as const;

function unitHeightFromUnitData(
  unitData: Record<string, unknown>,
): number | undefined {
  const movement = recordField(unitData.movement);
  const explicitHeight =
    numberField(unitData, ...UNIT_HEIGHT_FIELDS) ??
    numberField(movement, ...UNIT_HEIGHT_FIELDS);
  if (explicitHeight !== undefined) {
    return normalizedUnitHeight(explicitHeight);
  }

  const unitType = normalizedKey(unitData.unitType);
  if (isMekUnitType(unitType)) {
    return isSuperHeavyRepresentedUnit(unitData) ? 2 : 1;
  }

  return undefined;
}

function normalizedUnitHeight(height: number): number {
  return Math.max(0, Math.floor(height));
}

function isMekUnitType(unitType: string): boolean {
  switch (unitType) {
    case 'battlemech':
    case 'battlemek':
    case 'industrialmech':
    case 'industrialmek':
    case 'mech':
    case 'mek':
    case 'omnimech':
    case 'omnimek':
      return true;
    default:
      return false;
  }
}

function isSuperHeavyRepresentedUnit(
  unitData: Record<string, unknown>,
): boolean {
  const tonnage = numberField(unitData, 'tonnage', 'mass');
  const weightClass = normalizedKey(
    stringField(unitData, 'weightClass', 'weight_class'),
  );
  return (
    weightClass === 'superheavy' || (tonnage !== undefined && tonnage > 100)
  );
}

function movementHeatProfileFromUnitData(
  unitData: Record<string, unknown>,
): MovementHeatProfile | undefined {
  switch (normalizedKey(unitData.unitType)) {
    case 'battlemech':
    case 'battlemek':
    case 'mech':
    case 'mek':
    case 'omnimech':
    case 'omnimek':
    case 'industrialmech':
    case 'industrialmek':
      return 'mek';
    case 'infantry':
    case 'battlearmor':
    case 'protomech':
    case 'vehicle':
    case 'combatvehicle':
    case 'tank':
    case 'supportvehicle':
    case 'supporttank':
    case 'supportvtol':
    case 'vtol':
    case 'aero':
    case 'aerospace':
    case 'conventionalfighter':
    case 'convfighter':
    case 'smallcraft':
    case 'dropship':
    case 'jumpship':
    case 'warship':
    case 'spacestation':
      return 'none';
    default:
      return undefined;
  }
}

function movementTerrainProfileFromUnitData(
  unitData: Record<string, unknown>,
): MovementTerrainProfile | undefined {
  const unitType = normalizedKey(unitData.unitType);
  if (unitType !== 'infantry' && unitType !== 'battlearmor') {
    return undefined;
  }

  const movement = recordField(unitData.movement);
  const raw =
    stringField(unitData, 'motionType', 'motiveType', 'movementType') ??
    stringField(movement, 'motionType', 'motiveType', 'movementType');
  const normalized = normalizedKey(raw);
  switch (normalized) {
    case 'tracked':
    case 'mechanizedtracked':
    case 'inftracked':
    case 'wheeled':
    case 'mechanizedwheeled':
    case 'infwheeled':
    case 'hover':
    case 'mechanizedhover':
    case 'infhover':
    case 'vtol':
    case 'mechanizedvtol':
    case 'infvtol':
    case 'submarine':
      return undefined;
    default:
      return 'infantry';
  }
}

function pavementRoadBonusProfileFromUnitData(
  unitData: Record<string, unknown>,
): MovementPavementRoadBonusProfile | undefined {
  if (normalizedKey(unitData.unitType) !== 'infantry') {
    return undefined;
  }

  const movement = recordField(unitData.movement);
  const raw =
    stringField(unitData, 'motionType', 'motiveType', 'movementType') ??
    stringField(movement, 'motionType', 'motiveType', 'movementType');
  switch (normalizedKey(raw)) {
    case 'motorized':
    case 'infmotorized':
    case 'tracked':
    case 'mechanizedtracked':
    case 'inftracked':
    case 'wheeled':
    case 'mechanizedwheeled':
    case 'infwheeled':
    case 'hover':
    case 'mechanizedhover':
    case 'infhover':
      return 'tacops_infantry';
    default:
      return undefined;
  }
}

function waterCapabilityFromUnitData(
  unitData: Record<string, unknown>,
): IMovementWaterCapability | undefined {
  const frogmanSpecialist = booleanField(
    unitData,
    'frogman',
    'hasFrogman',
    'isFrogman',
    'frogmanSpecialist',
  );
  const waterCapability: IMovementWaterCapability = {
    fullyAmphibious: booleanField(
      unitData,
      'isAmphibious',
      'amphibious',
      'fullyAmphibious',
      'isFullyAmphibious',
    ),
    limitedAmphibious: booleanField(
      unitData,
      'limitedAmphibious',
      'isLimitedAmphibious',
    ),
    flotationHull: booleanField(unitData, 'hasFlotationHull', 'flotationHull'),
    ...(frogmanSpecialist ? { frogmanSpecialist } : {}),
  };
  return waterCapability.fullyAmphibious ||
    waterCapability.limitedAmphibious ||
    waterCapability.flotationHull ||
    waterCapability.frogmanSpecialist
    ? waterCapability
    : undefined;
}

function standUpCapabilityFromUnitData(
  unitData: Record<string, unknown>,
): IMovementStandUpCapability | undefined {
  const movement = recordField(unitData.movement);
  const source =
    recordField(unitData.standUpCapability) ??
    recordField(movement?.standUpCapability);
  const armActuators =
    standUpArmActuatorsFromSource(source) ??
    standUpArmActuatorsFromSource(movement) ??
    standUpArmActuatorsFromSource(unitData);
  const noMinimalArmsQuirk = stringArrayField(unitData, 'quirks').some(
    (quirk) => normalizedKey(quirk) === normalizedKey(UNIT_QUIRK_IDS.NO_ARMS),
  );
  const tacOpsAttemptingStand =
    booleanField(unitData, ...TAC_OPS_ATTEMPTING_STAND_FIELDS) ||
    booleanField(movement, ...TAC_OPS_ATTEMPTING_STAND_FIELDS) ||
    booleanField(source, ...TAC_OPS_ATTEMPTING_STAND_FIELDS);

  const standUpCapability: IMovementStandUpCapability = {
    ...(noMinimalArmsQuirk ? { noMinimalArmsQuirk } : {}),
    ...(tacOpsAttemptingStand ? { tacOpsAttemptingStand } : {}),
    ...(armActuators ? { armActuators } : {}),
  };

  return standUpCapability.noMinimalArmsQuirk ||
    standUpCapability.tacOpsAttemptingStand ||
    standUpCapability.armActuators !== undefined
    ? standUpCapability
    : undefined;
}

function booleanField(
  source: Record<string, unknown> | undefined,
  ...fieldNames: readonly string[]
): boolean {
  return fieldNames.some((fieldName) => source?.[fieldName] === true);
}

const TAC_OPS_ATTEMPTING_STAND_FIELDS = [
  'tacOpsAttemptingStand',
  'tacops_attempting_stand',
  'advancedGroundMovementTacOpsAttemptingStand',
] as const;

function standUpArmActuatorsFromSource(
  source: Record<string, unknown> | undefined,
): IMovementStandUpCapability['armActuators'] | undefined {
  const armActuators = recordField(source?.armActuators);
  const left =
    standUpArmActuatorField(armActuators, 'left') ??
    standUpArmActuatorField(source, 'leftArmActuator', 'left_arm_actuator');
  const right =
    standUpArmActuatorField(armActuators, 'right') ??
    standUpArmActuatorField(source, 'rightArmActuator', 'right_arm_actuator');

  return left || right
    ? {
        ...(left ? { left } : {}),
        ...(right ? { right } : {}),
      }
    : undefined;
}

function standUpArmActuatorField(
  source: Record<string, unknown> | undefined,
  ...fieldNames: readonly string[]
): MovementStandUpArmActuator | undefined {
  switch (normalizedKey(stringField(source, ...fieldNames))) {
    case 'hand':
      return 'hand';
    case 'lower':
    case 'lowerarm':
      return 'lower_arm';
    case 'upper':
    case 'upperarm':
      return 'upper_arm';
    case 'shoulder':
      return 'shoulder';
    default:
      return undefined;
  }
}

function movementModeFromUnitData(
  unitData: Record<string, unknown>,
): MovementMotiveMode | undefined {
  const movement = recordField(unitData.movement);
  const raw =
    stringField(unitData, 'motionType', 'motiveType', 'movementType') ??
    stringField(movement, 'motionType', 'motiveType', 'movementType');
  if (typeof raw !== 'string') return undefined;
  const normalized = normalizedKey(raw);
  switch (normalized) {
    case 'biped':
    case 'tripod':
    case 'quad':
    case 'foot':
    case 'ground':
    case 'leg':
    case 'infleg':
    case 'infantryleg':
    case 'jump':
    case 'infjump':
    case 'infantryjump':
      return 'walk';
    case 'tracked':
    case 'mechanizedtracked':
    case 'inftracked':
      return 'tracked';
    case 'wheeled':
    case 'motorized':
    case 'infmotorized':
    case 'mechanizedwheeled':
    case 'infwheeled':
      return 'wheeled';
    case 'hover':
    case 'mechanizedhover':
    case 'infhover':
      return 'hover';
    case 'vtol':
    case 'mechanizedvtol':
    case 'infvtol':
      return 'vtol';
    case 'naval':
      return 'naval';
    case 'hydrofoil':
      return 'hydrofoil';
    case 'submarine':
      return 'submarine';
    case 'umu':
    case 'infumu':
    case 'infantryumu':
    case 'scuba':
    case 'infscuba':
    case 'infantryscuba':
      return 'umu';
    case 'bipedswim':
    case 'bipedumu':
      return 'biped_swim';
    case 'quadswim':
    case 'quadumu':
      return 'quad_swim';
    case 'wige':
    case 'wingingroundeffect':
      return 'wige';
    case 'rail':
      return 'rail';
    case 'maglev':
      return 'maglev';
    default:
      return undefined;
  }
}

function stringField(
  source: Record<string, unknown> | undefined,
  ...fieldNames: readonly string[]
): string | undefined {
  for (const fieldName of fieldNames) {
    const value = source?.[fieldName];
    if (typeof value === 'string') {
      return value;
    }
  }
  return undefined;
}

function stringArrayField(
  source: Record<string, unknown> | undefined,
  ...fieldNames: readonly string[]
): readonly string[] {
  for (const fieldName of fieldNames) {
    const value = source?.[fieldName];
    if (Array.isArray(value)) {
      return value.filter(
        (entry): entry is string => typeof entry === 'string',
      );
    }
  }
  return [];
}

function normalizedKey(value: unknown): string {
  return typeof value === 'string'
    ? value.toLowerCase().replace(/[^a-z0-9]+/g, '')
    : '';
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
  const {
    walkMP,
    runMP,
    jumpMP,
    movementMode,
    movementHeatProfile,
    movementTerrainProfile,
    pavementRoadBonusProfile,
    unitHeight,
    waterCapability,
    standUpCapability,
  } = calculateMovement(unitData);

  // Ammo — provide one ton of ammo per ballistic/missile weapon type
  const ammo: Record<string, number> = {};
  for (const w of weapons) {
    if (w.ammoPerTon > 0) {
      ammo[w.id] = w.ammoPerTon;
    }
  }

  const adapted: IAdaptedUnit = {
    id: fullUnit.id,
    side,
    position,
    facing,
    heat: 0,
    movementThisTurn: MovementType.Stationary,
    hexesMovedThisTurn: 0,
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
    lockState: LockState.Pending,
    weapons,
    walkMP,
    runMP,
    jumpMP,
  };
  return {
    ...adapted,
    ...(movementMode ? { movementMode } : {}),
    ...(movementHeatProfile ? { movementHeatProfile } : {}),
    ...(movementTerrainProfile ? { movementTerrainProfile } : {}),
    ...(pavementRoadBonusProfile ? { pavementRoadBonusProfile } : {}),
    ...(unitHeight !== undefined ? { unitHeight } : {}),
    ...(waterCapability ? { waterCapability } : {}),
    ...(standUpCapability ? { standUpCapability } : {}),
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
