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
  hydrateC3EquipmentFromFullUnit,
  hydrateHeatSinksFromFullUnit,
  hydrateInitiativeEquipmentFromFullUnit,
  resolveCatalogDamage,
} from '@/simulation/runner/UnitHydration';
import {
  VehicleLocation,
  VTOLLocation,
} from '@/types/construction/UnitLocation';
import { GameSide, LockState } from '@/types/gameplay/GameSessionInterfaces';
import {
  Facing,
  type IMovementStandUpCapability,
  type IMovementWaterCapability,
  type MovementStandUpArmActuator,
  type MovementStandUpLegProfile,
  MovementType,
  type MovementHeatProfile,
  type MovementMotiveMode,
  type MovementPavementRoadBonusProfile,
  type MovementTerrainProfile,
  type MovementUnitHeightProfile,
} from '@/types/gameplay/HexGridInterfaces';
import { TurretType } from '@/types/unit/VehicleInterfaces';
import { WEAPON_CATALOG_FILES } from '@/utils/construction/equipmentBVCatalogData';
import { STANDARD_STRUCTURE_TABLE } from '@/utils/gameplay/damage';
import { UNIT_QUIRK_IDS } from '@/utils/gameplay/quirkModifiers';
import { getVehicleWeaponArcs } from '@/utils/gameplay/vehicleFiringArc';
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

type AdaptableEquipmentItem = Readonly<Record<string, unknown>> & {
  readonly id?: string;
  readonly equipmentId?: string;
  readonly name?: string;
  readonly location?: string;
};

function extractWeapons(
  equipment: readonly AdaptableEquipmentItem[],
  unitId: string,
  unitData: Record<string, unknown>,
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
    const sourceWeaponId = equipmentWeaponId(item);
    if (!sourceWeaponId) {
      logger.warn(
        `[CompendiumAdapter] Equipment mount on unit "${unitId}" has no ` +
          'weapon id/equipmentId/name field - skipping.',
      );
      continue;
    }

    const canonicalId = canonicalizeWeaponId(sourceWeaponId);
    const data = getWeaponData(sourceWeaponId);
    if (!data) {
      // Task 3.3: do not silently skip — surface the miss so data-pipeline
      // bugs are observable. Combat resilience is preserved because the
      // weapon simply isn't added to the unit's inventory, and the bot /
      // player cannot then declare it as a firing weapon.
      logger.warn(
        `[CompendiumAdapter] Weapon id "${sourceWeaponId}" on unit "${unitId}" ` +
          `(canonical: "${canonicalId}") has no official weapon catalog entry — ` +
          `skipping. Add it to the official catalog or WEAPON_ID_ALIASES.`,
      );
      continue;
    }

    const count = (idCounts.get(canonicalId) ?? 0) + 1;
    idCounts.set(canonicalId, count);

    // Keep the raw source mount label (e.g. `RIGHT_TORSO`, `Center Torso`)
    // — per the IWeapon contract, consumers normalize at the rule boundary.
    weapons.push({
      ...data,
      id: `${unitId}-${canonicalId}-${count}`,
      location: stringField(item, 'location', 'mountLocation', 'locationKey'),
      ...weaponMountArcsFromEquipment(item, unitData),
    });
  }

  return weapons;
}

function equipmentWeaponId(item: AdaptableEquipmentItem): string | undefined {
  const candidates = [
    stringField(item, 'equipmentId'),
    stringField(item, 'weaponId'),
    stringField(item, 'id'),
    stringField(item, 'name'),
  ].filter((candidate): candidate is string => candidate !== undefined);
  // Prefer the first candidate that resolves against the official catalog or
  // legacy DB, so represented mounts whose `id` is only a slot id (e.g.
  // "mount-0") still import via their equipmentId/name fields.
  return (
    candidates.find((candidate) => getWeaponData(candidate) !== undefined) ??
    candidates[0]
  );
}

function weaponMountArcsFromEquipment(
  item: AdaptableEquipmentItem,
  unitData: Record<string, unknown>,
): Pick<
  IWeapon,
  | 'mountingArc'
  | 'mountingArcs'
  | 'vehicleMountLocation'
  | 'vehicleIsTurretMounted'
> {
  if (!isVehicleLikeUnitData(unitData)) return {};

  const mountLocation = vehicleMountLocationFromEquipment(item);
  if (!mountLocation) return {};
  const isTurretMounted =
    equipmentBooleanField(item, 'isTurretMounted') ||
    locationHas(item, 'turret', 'chin');
  const isSponsonMounted =
    equipmentBooleanField(item, 'isSponsonMounted') ||
    locationHas(item, 'sponson');

  const arcs = getVehicleWeaponArcs({
    mountLocation,
    isTurretMounted,
    isSponsonMounted,
    turretType: primaryTurretTypeFromUnitData(unitData),
    turretLocked: false,
    isSecondary: locationHas(item, 'turret2', 'turret 2', 'secondary turret'),
    secondaryTurretType: secondaryTurretTypeFromUnitData(unitData),
    secondaryTurretLocked: false,
  });

  const vehicleMountMetadata = {
    vehicleMountLocation: mountLocation,
    vehicleIsTurretMounted: isTurretMounted,
  };
  if (arcs.length === 0) {
    return { ...vehicleMountMetadata, mountingArcs: [] };
  }
  if (arcs.length === 1) {
    return {
      ...vehicleMountMetadata,
      mountingArc: arcs[0],
      mountingArcs: arcs,
    };
  }
  return { ...vehicleMountMetadata, mountingArcs: arcs };
}

function isVehicleLikeUnitData(unitData: Record<string, unknown>): boolean {
  switch (normalizedKey(stringField(unitData, 'unitType', 'type'))) {
    case 'vehicle':
    case 'tank':
    case 'supportvehicle':
    case 'supporttank':
    case 'supportvtol':
    case 'vtol':
    case 'naval':
      return true;
    default:
      return false;
  }
}

function vehicleMountLocationFromEquipment(
  item: AdaptableEquipmentItem,
): VehicleLocation | VTOLLocation | undefined {
  const normalized = normalizedKey(
    stringField(item, 'location', 'mountLocation', 'locationKey'),
  );
  if (!normalized) return undefined;

  if (normalized.includes('turret2') || normalized.includes('turretsecond')) {
    return VehicleLocation.TURRET_2;
  }
  if (normalized.includes('turret') || normalized.includes('chin')) {
    return VehicleLocation.TURRET;
  }
  if (normalized.includes('front')) return VehicleLocation.FRONT;
  if (normalized.includes('left')) return VehicleLocation.LEFT;
  if (normalized.includes('right')) return VehicleLocation.RIGHT;
  if (normalized.includes('rear')) return VehicleLocation.REAR;
  if (normalized.includes('rotor')) return VTOLLocation.ROTOR;
  if (normalized.includes('body')) return VehicleLocation.BODY;
  return undefined;
}

function locationHas(
  item: AdaptableEquipmentItem,
  ...needles: readonly string[]
): boolean {
  const normalized = normalizedKey(
    stringField(item, 'location', 'mountLocation', 'locationKey'),
  );
  return needles.some((needle) => normalized.includes(normalizedKey(needle)));
}

function equipmentBooleanField(
  item: AdaptableEquipmentItem,
  ...fieldNames: readonly string[]
): boolean {
  return fieldNames.some((fieldName) => item[fieldName] === true);
}

function primaryTurretTypeFromUnitData(
  unitData: Record<string, unknown>,
): TurretType | undefined {
  return (
    turretTypeFromRecord(recordField(unitData.turret)) ??
    turretTypeFromRecord(recordField(unitData.chinTurret)) ??
    defaultTurretTypeForUnitData(unitData)
  );
}

function secondaryTurretTypeFromUnitData(
  unitData: Record<string, unknown>,
): TurretType | undefined {
  return turretTypeFromRecord(recordField(unitData.secondaryTurret));
}

function turretTypeFromRecord(
  record: Record<string, unknown> | undefined,
): TurretType | undefined {
  switch (normalizedKey(stringField(record, 'type', 'turretType'))) {
    case 'single':
      return TurretType.SINGLE;
    case 'dual':
      return TurretType.DUAL;
    case 'chin':
      return TurretType.CHIN;
    case 'sponsonleft':
      return TurretType.SPONSON_LEFT;
    case 'sponsonright':
      return TurretType.SPONSON_RIGHT;
    case 'none':
      return TurretType.NONE;
    default:
      return undefined;
  }
}

function defaultTurretTypeForUnitData(
  unitData: Record<string, unknown>,
): TurretType | undefined {
  return normalizedKey(stringField(unitData, 'unitType', 'type')).includes(
    'vtol',
  )
    ? TurretType.CHIN
    : TurretType.SINGLE;
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
  unitHeightProfile?: MovementUnitHeightProfile;
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
  const unitHeightProfile = movementUnitHeightProfileFromUnitData(unitData);
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
    ...(unitHeightProfile ? { unitHeightProfile } : {}),
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

const UNIT_TYPE_IDENTITY_FIELDS = [
  'unitType',
  'blkUnitType',
  'rawUnitType',
  'sourceUnitType',
  'megamekUnitType',
  'entityType',
  'configuration',
  'mechConfiguration',
  'mekConfiguration',
  'chassisConfiguration',
  'chassisType',
] as const;

const CONVERSION_MODE_FIELDS = [
  'conversionMode',
  'currentConversionMode',
  'entityConversionMode',
  'megamekConversionMode',
  'convertedMode',
  'mode',
] as const;

const INFANTRY_MOUNT_HEIGHT_FIELDS = [
  'infantryMountHeight',
  'mountHeight',
  'beastMountHeight',
  'infantryMountSizeHeight',
  'mountSizeHeight',
  'beastSizeHeight',
] as const;

const INFANTRY_MOUNT_RECORD_FIELDS = [
  'infantryMount',
  'beastMount',
  'mount',
  'beast',
] as const;

const INFANTRY_MOUNT_SIZE_FIELDS = [
  'infantryMountSize',
  'mountSize',
  'beastSize',
] as const;

const INFANTRY_MOUNT_RECORD_SIZE_FIELDS = [
  ...INFANTRY_MOUNT_SIZE_FIELDS,
  'size',
] as const;

const INFANTRY_MOUNT_NAME_FIELDS = [
  'infantryMountName',
  'mountName',
  'beastMountName',
  'beastName',
] as const;

const INFANTRY_MOUNT_RECORD_NAME_FIELDS = [
  ...INFANTRY_MOUNT_NAME_FIELDS,
  'name',
] as const;

const MEGAMEK_INFANTRY_BEAST_SIZE_HEIGHT: Readonly<Record<string, number>> = {
  large: 0,
  verylarge: 1,
  monstrous: 1,
};

const MEGAMEK_SAMPLE_INFANTRY_MOUNT_SIZE: Readonly<Record<string, string>> = {
  donkey: 'large',
  coventrykangaroo: 'large',
  horse: 'large',
  camel: 'large',
  branth: 'large',
  odessanraxx: 'large',
  tabiranth: 'large',
  tariq: 'large',
  elephant: 'verylarge',
  orca: 'verylarge',
  hipposaur: 'monstrous',
};

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

  const unitTypeKeys = normalizedUnitTypeKeys(unitData);
  const convertibleHeight = convertibleUnitHeightFromUnitData(
    unitData,
    unitTypeKeys,
  );
  if (convertibleHeight !== undefined) {
    return convertibleHeight;
  }

  if (unitTypeKeys.some(isMekUnitType)) {
    return isSuperHeavyRepresentedUnit(unitData) ? 2 : 1;
  }

  const infantryMountHeight = infantryMountHeightFromUnitData(
    unitData,
    unitTypeKeys,
  );
  if (infantryMountHeight !== undefined) {
    return infantryMountHeight;
  }

  const nonMekHeight = nonMekUnitHeightFromUnitData(unitData, unitTypeKeys);
  if (nonMekHeight !== undefined) {
    return nonMekHeight;
  }

  return undefined;
}

function movementUnitHeightProfileFromUnitData(
  unitData: Record<string, unknown>,
): MovementUnitHeightProfile | undefined {
  const unitTypeKeys = normalizedUnitTypeKeys(unitData);
  if (unitTypeKeys.some(isLamUnitType)) {
    return { kind: 'lam', standingHeight: standingMekHeight(unitData) };
  }

  if (unitTypeKeys.some(isQuadVeeUnitType)) {
    return { kind: 'quadvee', standingHeight: standingMekHeight(unitData) };
  }

  const mountedHeight = infantryMountHeightFromUnitData(unitData, unitTypeKeys);
  if (
    unitTypeKeys.some(isConventionalInfantryUnitType) &&
    mountedHeight !== undefined
  ) {
    return { kind: 'infantry_mount', mountedHeight };
  }

  return undefined;
}

function normalizedUnitHeight(height: number): number {
  return Math.max(0, Math.floor(height));
}

function normalizedUnitTypeKeys(
  unitData: Record<string, unknown>,
): readonly string[] {
  const movement = recordField(unitData.movement);
  return Array.from(
    new Set([
      ...normalizedStringFields(unitData, ...UNIT_TYPE_IDENTITY_FIELDS),
      ...normalizedStringFields(movement, ...UNIT_TYPE_IDENTITY_FIELDS),
    ]),
  );
}

function normalizedStringFields(
  source: Record<string, unknown> | undefined,
  ...fieldNames: readonly string[]
): readonly string[] {
  const values: string[] = [];
  for (const fieldName of fieldNames) {
    const normalized = normalizedKey(source?.[fieldName]);
    if (normalized && !values.includes(normalized)) {
      values.push(normalized);
    }
  }
  return values;
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

function convertibleUnitHeightFromUnitData(
  unitData: Record<string, unknown>,
  unitTypeKeys: readonly string[],
): number | undefined {
  if (unitTypeKeys.some(isLamUnitType)) {
    const mode = lamConversionModeFromUnitData(unitData);
    return mode === 'mek' ? standingMekHeight(unitData) : 0;
  }

  if (unitTypeKeys.some(isQuadVeeUnitType)) {
    const mode = quadVeeConversionModeFromUnitData(unitData);
    return mode === 'vehicle' ? 0 : standingMekHeight(unitData);
  }

  return undefined;
}

function standingMekHeight(unitData: Record<string, unknown>): number {
  return isSuperHeavyRepresentedUnit(unitData) ? 2 : 1;
}

function isLamUnitType(unitType: string): boolean {
  return (
    unitType === 'lam' ||
    unitType === 'landairmek' ||
    unitType === 'landairmech'
  );
}

function isQuadVeeUnitType(unitType: string): boolean {
  return unitType === 'quadvee';
}

function isQuadMekStandUpUnitType(unitType: string): boolean {
  switch (unitType) {
    case 'quad':
    case 'quadmech':
    case 'quadmek':
    case 'quadomnimech':
    case 'quadomnimek':
      return true;
    default:
      return false;
  }
}

function isConventionalInfantryUnitType(unitType: string): boolean {
  return unitType === 'infantry' || unitType === 'conventionalinfantry';
}

function infantryMountHeightFromUnitData(
  unitData: Record<string, unknown>,
  unitTypeKeys: readonly string[],
): number | undefined {
  if (!unitTypeKeys.some(isConventionalInfantryUnitType)) {
    return undefined;
  }

  const movement = recordField(unitData.movement);
  const directHeight =
    numberField(unitData, ...INFANTRY_MOUNT_HEIGHT_FIELDS) ??
    numberField(movement, ...INFANTRY_MOUNT_HEIGHT_FIELDS);
  if (directHeight !== undefined) {
    return normalizedUnitHeight(directHeight);
  }

  for (const source of [unitData, movement]) {
    const heightFromSize =
      infantryMountHeightFromSizeFields(source) ??
      infantryMountHeightFromNameFields(source) ??
      infantryMountHeightFromRecordFields(source);
    if (heightFromSize !== undefined) {
      return heightFromSize;
    }
  }

  return undefined;
}

function infantryMountHeightFromRecordFields(
  source: Record<string, unknown> | undefined,
): number | undefined {
  for (const fieldName of INFANTRY_MOUNT_RECORD_FIELDS) {
    const value = source?.[fieldName];
    const record = recordField(value);
    if (record) {
      const directHeight = numberField(
        record,
        'height',
        ...INFANTRY_MOUNT_HEIGHT_FIELDS,
      );
      if (directHeight !== undefined) {
        return normalizedUnitHeight(directHeight);
      }

      const derivedHeight =
        infantryMountHeightFromSizeFields(
          record,
          INFANTRY_MOUNT_RECORD_SIZE_FIELDS,
        ) ??
        infantryMountHeightFromNameFields(
          record,
          INFANTRY_MOUNT_RECORD_NAME_FIELDS,
        );
      if (derivedHeight !== undefined) {
        return derivedHeight;
      }
    }

    const stringHeight = infantryMountHeightFromString(value);
    if (stringHeight !== undefined) {
      return stringHeight;
    }
  }

  return undefined;
}

function infantryMountHeightFromSizeFields(
  source: Record<string, unknown> | undefined,
  fieldNames: readonly string[] = INFANTRY_MOUNT_SIZE_FIELDS,
): number | undefined {
  for (const fieldName of fieldNames) {
    const value = source?.[fieldName];
    const record = recordField(value);
    if (record) {
      const nestedHeight = numberField(record, 'height');
      if (nestedHeight !== undefined) {
        return normalizedUnitHeight(nestedHeight);
      }
    }

    const height = infantryMountHeightFromSizeValue(value);
    if (height !== undefined) {
      return height;
    }
  }

  return undefined;
}

function infantryMountHeightFromNameFields(
  source: Record<string, unknown> | undefined,
  fieldNames: readonly string[] = INFANTRY_MOUNT_NAME_FIELDS,
): number | undefined {
  for (const fieldName of fieldNames) {
    const height = infantryMountHeightFromString(source?.[fieldName]);
    if (height !== undefined) {
      return height;
    }
  }
  return undefined;
}

function infantryMountHeightFromString(value: unknown): number | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const customSize = value.match(/^Beast:Custom:[^,]*,([^,]+)/i)?.[1];
  if (customSize) {
    return infantryMountHeightFromSizeValue(customSize);
  }

  const withoutPrefix = value.trim().replace(/^Beast:/i, '');
  const sampleSize =
    MEGAMEK_SAMPLE_INFANTRY_MOUNT_SIZE[normalizedKey(withoutPrefix)];
  if (sampleSize) {
    return infantryMountHeightFromSizeValue(sampleSize);
  }

  return infantryMountHeightFromSizeValue(value);
}

function infantryMountHeightFromSizeValue(value: unknown): number | undefined {
  const key = normalizedKey(value);
  return key ? MEGAMEK_INFANTRY_BEAST_SIZE_HEIGHT[key] : undefined;
}

function lamConversionModeFromUnitData(
  unitData: Record<string, unknown>,
): 'mek' | 'airmek' | 'fighter' {
  const explicitMode = explicitConversionModeFromUnitData(unitData, 'lam');
  if (explicitMode === 'airmek' || explicitMode === 'fighter') {
    return explicitMode;
  }
  if (explicitMode === 'mek') {
    return 'mek';
  }

  const movementMode = movementModeKeyFromUnitData(unitData);
  if (
    movementMode === 'aerodyne' ||
    movementMode === 'aerospace' ||
    movementMode === 'fighter' ||
    movementMode === 'wheeled'
  ) {
    return 'fighter';
  }
  if (movementMode === 'wige' || movementMode === 'airmek') {
    return 'airmek';
  }

  return 'mek';
}

function quadVeeConversionModeFromUnitData(
  unitData: Record<string, unknown>,
): 'mek' | 'vehicle' {
  const explicitMode = explicitConversionModeFromUnitData(unitData, 'quadvee');
  if (explicitMode === 'vehicle') {
    return 'vehicle';
  }
  if (explicitMode === 'mek') {
    return 'mek';
  }

  const movementMode = movementModeKeyFromUnitData(unitData);
  if (movementMode === 'tracked' || movementMode === 'wheeled') {
    return 'vehicle';
  }

  return 'mek';
}

function explicitConversionModeFromUnitData(
  unitData: Record<string, unknown>,
  family: 'lam' | 'quadvee',
): 'mek' | 'airmek' | 'fighter' | 'vehicle' | undefined {
  const movement = recordField(unitData.movement);
  const numericMode =
    numberField(unitData, ...CONVERSION_MODE_FIELDS) ??
    numberField(movement, ...CONVERSION_MODE_FIELDS);
  if (numericMode !== undefined) {
    return numericConversionMode(family, numericMode);
  }

  const modeKeys = [
    ...normalizedStringFields(unitData, ...CONVERSION_MODE_FIELDS),
    ...normalizedStringFields(movement, ...CONVERSION_MODE_FIELDS),
  ];
  for (const modeKey of modeKeys) {
    const converted = stringConversionMode(family, modeKey);
    if (converted !== undefined) {
      return converted;
    }
  }

  return undefined;
}

function numericConversionMode(
  family: 'lam' | 'quadvee',
  mode: number,
): 'mek' | 'airmek' | 'fighter' | 'vehicle' | undefined {
  if (mode === 0) {
    return 'mek';
  }
  if (family === 'lam') {
    if (mode === 1) return 'airmek';
    if (mode === 2) return 'fighter';
  }
  if (family === 'quadvee' && mode === 1) {
    return 'vehicle';
  }
  return undefined;
}

function stringConversionMode(
  family: 'lam' | 'quadvee',
  modeKey: string,
): 'mek' | 'airmek' | 'fighter' | 'vehicle' | undefined {
  if (modeKey === '0' || modeKey === 'mek' || modeKey === 'mech') {
    return 'mek';
  }
  if (modeKey === '1') {
    return family === 'quadvee' ? 'vehicle' : 'airmek';
  }
  if (modeKey.includes('airmek') || modeKey.includes('airmech')) {
    return 'airmek';
  }
  if (
    (family === 'lam' && modeKey === '2') ||
    modeKey.includes('fighter') ||
    modeKey.includes('aerodyne')
  ) {
    return 'fighter';
  }
  if (modeKey.includes('vehicle')) {
    return 'vehicle';
  }
  return undefined;
}

function movementModeKeyFromUnitData(
  unitData: Record<string, unknown>,
): string {
  const movement = recordField(unitData.movement);
  return (
    normalizedKey(
      stringField(unitData, 'motionType', 'motiveType', 'movementType'),
    ) ||
    normalizedKey(
      stringField(movement, 'motionType', 'motiveType', 'movementType'),
    )
  );
}

function nonMekUnitHeightFromUnitData(
  unitData: Record<string, unknown>,
  unitTypeKeys: readonly string[],
): number | undefined {
  const movementMode = movementModeFromUnitData(unitData);
  if (movementMode === 'vtol' || unitTypeKeys.some(isVtolUnitType)) {
    return isSuperHeavyVtolRepresentedUnit(unitData) ? 1 : 0;
  }

  if (isSuperHeavyTankUnit(unitData, unitTypeKeys)) {
    return 1;
  }

  if (unitTypeKeys.some(isSmallCraftUnitType)) {
    return isAirborneRepresentedUnit(unitData) ? 0 : 1;
  }

  if (unitTypeKeys.some(isDropshipUnitType)) {
    if (isAirborneRepresentedUnit(unitData)) {
      return 0;
    }
    const dropshipShape = aerospaceShapeFromUnitData(unitData);
    if (dropshipShape === 'spheroid') {
      return 9;
    }
    if (dropshipShape === 'aerodyne') {
      return 4;
    }
  }

  return undefined;
}

function isVtolUnitType(unitType: string): boolean {
  return unitType === 'vtol' || unitType === 'supportvtol';
}

function isSuperHeavyTankUnit(
  unitData: Record<string, unknown>,
  unitTypeKeys: readonly string[],
): boolean {
  if (
    unitTypeKeys.includes('superheavytank') ||
    unitTypeKeys.includes('largesupporttank')
  ) {
    return true;
  }

  if (
    unitTypeKeys.some((key) =>
      [
        'vehicle',
        'combatvehicle',
        'tank',
        'supportvehicle',
        'supporttank',
      ].includes(key),
    )
  ) {
    return isSuperHeavyRepresentedUnit(unitData);
  }

  return false;
}

function isSmallCraftUnitType(unitType: string): boolean {
  return unitType === 'smallcraft' || unitType === 'smallcrafts';
}

function isDropshipUnitType(unitType: string): boolean {
  return unitType === 'dropship' || unitType === 'dropships';
}

function isSuperHeavyRepresentedUnit(
  unitData: Record<string, unknown>,
): boolean {
  const tonnage = numberField(unitData, 'tonnage', 'mass');
  const weightClass = normalizedKey(
    stringField(unitData, 'weightClass', 'weight_class'),
  );
  return (
    booleanField(unitData, 'isSuperheavy', 'isSuperHeavy', 'superheavy') ||
    weightClass === 'superheavy' ||
    (tonnage !== undefined && tonnage > 100)
  );
}

function isSuperHeavyVtolRepresentedUnit(
  unitData: Record<string, unknown>,
): boolean {
  const tonnage = numberField(unitData, 'tonnage', 'mass');
  const weightClass = normalizedKey(
    stringField(unitData, 'weightClass', 'weight_class'),
  );
  return (
    booleanField(unitData, 'isSuperheavy', 'isSuperHeavy', 'superheavy') ||
    weightClass === 'superheavy' ||
    (tonnage !== undefined && tonnage > 30)
  );
}

function isAirborneRepresentedUnit(unitData: Record<string, unknown>): boolean {
  const movement = recordField(unitData.movement);
  const combatState = recordField(unitData.combatState);
  const aerospaceState = recordField(unitData.aerospaceState);
  const altitude =
    numberField(unitData, 'altitude') ??
    numberField(movement, 'altitude') ??
    numberField(combatState, 'altitude') ??
    numberField(aerospaceState, 'altitude');

  return (
    booleanField(unitData, 'isAirborne', 'airborne') ||
    booleanField(movement, 'isAirborne', 'airborne') ||
    booleanField(combatState, 'isAirborne', 'airborne') ||
    booleanField(aerospaceState, 'isAirborne', 'airborne') ||
    (altitude !== undefined && altitude > 0)
  );
}

function aerospaceShapeFromUnitData(
  unitData: Record<string, unknown>,
): 'aerodyne' | 'spheroid' | undefined {
  const movement = recordField(unitData.movement);
  const shapeKeys = [
    ...normalizedStringFields(
      unitData,
      'motionType',
      'configuration',
      'aerospaceMotionType',
      'shape',
      'aeroShape',
    ),
    ...normalizedStringFields(
      movement,
      'motionType',
      'configuration',
      'aerospaceMotionType',
      'shape',
      'aeroShape',
    ),
  ];
  if (shapeKeys.some((key) => key.includes('spheroid'))) {
    return 'spheroid';
  }
  if (shapeKeys.some((key) => key.includes('aerodyne'))) {
    return 'aerodyne';
  }
  return undefined;
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
  const explicitStandUpLegProfile =
    standUpLegProfileFromSource(source) ??
    standUpLegProfileFromSource(movement) ??
    standUpLegProfileFromSource(unitData);
  const unitTypeKeys = normalizedUnitTypeKeys(unitData);
  const standUpLegProfile =
    explicitStandUpLegProfile ??
    (unitTypeKeys.some(isQuadMekStandUpUnitType) ? 'quad' : undefined);

  const standUpCapability: IMovementStandUpCapability = {
    ...(standUpLegProfile ? { standUpLegProfile } : {}),
    ...(noMinimalArmsQuirk ? { noMinimalArmsQuirk } : {}),
    ...(tacOpsAttemptingStand ? { tacOpsAttemptingStand } : {}),
    ...(armActuators ? { armActuators } : {}),
  };

  return standUpCapability.standUpLegProfile ||
    standUpCapability.noMinimalArmsQuirk ||
    standUpCapability.tacOpsAttemptingStand ||
    standUpCapability.armActuators !== undefined
    ? standUpCapability
    : undefined;
}

function standUpLegProfileFromSource(
  source: Record<string, unknown> | undefined,
): MovementStandUpLegProfile | undefined {
  const normalized =
    normalizedKey(source?.standUpLegProfile) ||
    normalizedKey(source?.legProfile) ||
    normalizedKey(source?.megamekStandUpLegProfile);
  switch (normalized) {
    case 'biped':
    case 'bipedmek':
    case 'bipedmech':
      return 'biped';
    case 'quad':
    case 'quadmek':
    case 'quadmech':
      return 'quad';
    default:
      return undefined;
  }
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
    (unitData.equipment as AdaptableEquipmentItem[] | undefined) ?? [];
  const weapons = extractWeapons(rawEquipment, fullUnit.id, unitData);
  const initiativeEquipment = hydrateInitiativeEquipmentFromFullUnit(fullUnit);
  const c3Equipment = hydrateC3EquipmentFromFullUnit(fullUnit);

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
    unitHeightProfile,
    waterCapability,
    standUpCapability,
  } = calculateMovement(unitData);
  const gyroType = gyroTypeFromUnitData(unitData);

  // Ammo — provide one ton of ammo per ballistic/missile weapon type
  const ammo: Record<string, number> = {};
  for (const w of weapons) {
    if (w.ammoPerTon > 0) {
      ammo[w.id] = w.ammoPerTon;
    }
  }

  const adapted: IAdaptedUnit = {
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
    tonnage,
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
    ...(unitHeightProfile ? { unitHeightProfile } : {}),
    ...(waterCapability ? { waterCapability } : {}),
    ...(standUpCapability ? { standUpCapability } : {}),
    ...(gyroType ? { gyroType } : {}),
    ...(initiativeEquipment ? { initiativeEquipment } : {}),
    ...(c3Equipment.length > 0 ? { c3Equipment } : {}),
  };
}

function gyroTypeFromUnitData(
  unitData: Record<string, unknown>,
): string | undefined {
  const gyro = recordField(unitData.gyro);
  return (
    stringField(unitData, 'gyroType', 'gyro_type') ??
    stringField(gyro, 'type', 'gyroType', 'gyro_type')
  );
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
