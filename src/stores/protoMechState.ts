/**
 * ProtoMech State Interface
 *
 * Defines the complete state for ProtoMech units.
 * ProtoMechs are small, Clan-tech combat walkers operating in points.
 *
 * @spec openspec/changes/add-multi-unit-type-support/tasks.md Phase 5.3
 * @spec openspec/changes/add-protomech-construction/tasks.md §1
 */

import { ProtoMechLocation } from '@/types/construction/UnitLocation';
import { RulesLevel } from '@/types/enums/RulesLevel';
import { TechBase } from '@/types/enums/TechBase';
import { IEquipmentItem } from '@/types/equipment';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { IProtoMechMountedEquipment } from '@/types/unit/PersonnelInterfaces';
import {
  ProtoChassis,
  ProtoLocation,
  ProtoWeightClass,
  type IProtoArmorByLocation,
  type IProtoMechMountedEquipment as IProtoMechMountedEquipmentV2,
  type IProtoMechUnit,
} from '@/types/unit/ProtoMechInterfaces';
import {
  getProtoWeightClass,
  getProtoMPCaps,
  effectiveWalkMP,
} from '@/utils/construction/protomech';
import {
  calculateProtoMechBV,
  type IProtoMechBVBreakdown,
} from '@/utils/construction/protomech/protoMechBV';
import { generateUnitId as generateUUID } from '@/utils/uuid';

// =============================================================================
// ProtoMech Armor/Structure Allocation
// =============================================================================

/**
 * ProtoMech armor allocation by location
 */
export interface IProtoMechArmorAllocation {
  /** Index signature for dynamic access */
  [key: string]: number;

  [ProtoMechLocation.HEAD]: number;
  [ProtoMechLocation.TORSO]: number;
  [ProtoMechLocation.LEFT_ARM]: number;
  [ProtoMechLocation.RIGHT_ARM]: number;
  [ProtoMechLocation.LEGS]: number;
  [ProtoMechLocation.MAIN_GUN]: number;
}

/**
 * Create empty ProtoMech armor allocation
 */
export function createEmptyProtoMechArmorAllocation(): IProtoMechArmorAllocation {
  return {
    [ProtoMechLocation.HEAD]: 0,
    [ProtoMechLocation.TORSO]: 0,
    [ProtoMechLocation.LEFT_ARM]: 0,
    [ProtoMechLocation.RIGHT_ARM]: 0,
    [ProtoMechLocation.LEGS]: 0,
    [ProtoMechLocation.MAIN_GUN]: 0,
  };
}

/**
 * Calculate total ProtoMech armor
 */
export function getTotalProtoMechArmor(
  allocation: IProtoMechArmorAllocation,
): number {
  return (
    (allocation[ProtoMechLocation.HEAD] || 0) +
    (allocation[ProtoMechLocation.TORSO] || 0) +
    (allocation[ProtoMechLocation.LEFT_ARM] || 0) +
    (allocation[ProtoMechLocation.RIGHT_ARM] || 0) +
    (allocation[ProtoMechLocation.LEGS] || 0) +
    (allocation[ProtoMechLocation.MAIN_GUN] || 0)
  );
}

// =============================================================================
// ProtoMech Mounted Equipment
// =============================================================================

/**
 * Create mounted equipment instance for ProtoMech
 */
export function createProtoMechMountedEquipment(
  item: IEquipmentItem,
  instanceId: string,
  location?: ProtoMechLocation,
): IProtoMechMountedEquipment {
  return {
    id: instanceId,
    equipmentId: item.id,
    name: item.name,
    location: location ?? ProtoMechLocation.TORSO,
    linkedAmmoId: undefined,
  };
}

// =============================================================================
// ProtoMech State Interface
// =============================================================================

/**
 * Complete state for a single ProtoMech unit
 */
export interface ProtoMechState {
  // =========================================================================
  // Identity
  // =========================================================================

  /** Unique unit identifier */
  readonly id: string;

  /** Display name (chassis + variant) */
  name: string;

  /** Base chassis name */
  chassis: string;

  /** Model/variant designation */
  model: string;

  /** Master Unit List ID (-1 for custom) */
  mulId: string;

  /** Introduction year */
  year: number;

  /** Rules level */
  rulesLevel: RulesLevel;

  // =========================================================================
  // Classification
  // =========================================================================

  /** Tech base (always Clan for ProtoMechs) */
  techBase: TechBase;

  /** Unit type (always PROTOMECH) */
  unitType: UnitType.PROTOMECH;

  /** Weight per unit in tons (2–15 tons; Ultraheavy up to 15) */
  tonnage: number;

  /** Derived weight class from tonnage */
  weightClass: ProtoWeightClass;

  /** Chassis type (Biped / Quad / Glider / Ultraheavy) — canonical field */
  chassisType: ProtoChassis;

  /** Point size (typically 5 ProtoMechs per point) */
  pointSize: number;

  /** @deprecated Use chassisType === ProtoChassis.QUAD. Kept for backward compat. */
  isQuad: boolean;

  /** @deprecated Use chassisType === ProtoChassis.GLIDER. Kept for backward compat. */
  isGlider: boolean;

  // =========================================================================
  // Movement
  // =========================================================================

  /** Engine rating */
  engineRating: number;

  /**
   * Base walk MP (before Myomer Booster). This is the canonical field used by
   * VAL-PROTO-MP. Cruise MP is an alias for walk MP on ground ProtoMechs.
   */
  walkMP: number;

  /** Cruise MP — kept for backward compat; equals walkMP */
  cruiseMP: number;

  /** Flank MP (walk + 1 after booster, then +1 run) */
  flankMP: number;

  /** Jump MP */
  jumpMP: number;

  // =========================================================================
  // Structure & Armor
  // =========================================================================

  /** Internal structure per location */
  structureByLocation: IProtoMechArmorAllocation;

  /** Armor per location */
  armorByLocation: IProtoMechArmorAllocation;

  /** Armor type (typically standard for ProtoMechs) */
  armorType: number;

  // =========================================================================
  // Main Gun
  // =========================================================================

  /** Has main gun mount */
  hasMainGun: boolean;

  /**
   * Equipment ID of the weapon installed in the MainGun location.
   * undefined when hasMainGun is false or no weapon has been assigned.
   */
  mainGunWeaponId: string | undefined;

  // =========================================================================
  // Special Systems
  // =========================================================================

  /** Has myomer booster */
  hasMyomerBooster: boolean;

  /**
   * Gliding wings: only legal on Glider chassis (Light class). Adds +2 jump MP
   * via effectiveJumpMP; the base jumpMP is stored separately.
   */
  glidingWings: boolean;

  /** Has magnetic clamps */
  hasMagneticClamps: boolean;

  /** Has extended torso twist */
  hasExtendedTorsoTwist: boolean;

  // =========================================================================
  // Equipment
  // =========================================================================

  /** Equipment mounted on this ProtoMech */
  equipment: IProtoMechMountedEquipment[];

  // =========================================================================
  // Metadata
  // =========================================================================

  /** Unit has been modified from original */
  isModified: boolean;

  /** Timestamp when unit was created */
  createdAt: number;

  /** Timestamp of last modification */
  lastModifiedAt: number;

  // =========================================================================
  // Battle Value
  // =========================================================================

  /**
   * Last-computed BV 2.0 breakdown for this ProtoMech. Kept on the state
   * (not just the selectors) so the parity harness, force-level tools, and
   * the status bar can read the breakdown without recomputing.
   *
   * Refreshed on every BV-affecting mutation via `recomputeBV` from the
   * store actions. Optional because legacy persisted state may predate this
   * field; the first mutation (or an explicit `recomputeBV()` call) fills it.
   *
   * @spec openspec/changes/add-protomech-battle-value/specs/protomech-unit-system/spec.md
   *       — Requirement: ProtoMech BV Breakdown on Unit State
   */
  bvBreakdown?: IProtoMechBVBreakdown;
}

// =============================================================================
// ProtoMech Store Actions
// =============================================================================

/**
 * Actions available on a ProtoMech store
 */
export interface ProtoMechStoreActions {
  // Identity Actions
  setName: (name: string) => void;
  setChassis: (chassis: string) => void;
  setModel: (model: string) => void;
  setMulId: (mulId: string) => void;
  setYear: (year: number) => void;
  setRulesLevel: (level: RulesLevel) => void;

  // Classification Actions
  setTonnage: (tonnage: number) => void;
  setPointSize: (size: number) => void;
  setQuad: (isQuad: boolean) => void;
  setGlider: (isGlider: boolean) => void;
  /**
   * Set the chassis type. Re-derives weight class + MP caps; resets glidingWings
   * if the new chassis is not Glider, and clears jump MP for Ultraheavy.
   */
  setChassisType: (chassis: ProtoChassis) => void;

  // Movement Actions
  setEngineRating: (rating: number) => void;
  setCruiseMP: (mp: number) => void;
  /**
   * Set base walk MP. Validates against the weight-class cap and re-derives
   * engine rating. Does NOT apply the Myomer Booster — use effectiveWalkMP()
   * for display purposes.
   */
  setWalkMP: (mp: number) => void;
  setJumpMP: (mp: number) => void;

  // Structure & Armor Actions
  setArmorType: (type: number) => void;
  setLocationArmor: (location: ProtoMechLocation, points: number) => void;
  setLocationStructure: (location: ProtoMechLocation, points: number) => void;
  autoAllocateArmor: () => void;
  clearAllArmor: () => void;

  // Main Gun Actions
  setMainGun: (hasMainGun: boolean) => void;
  /**
   * Assign or clear the weapon in the MainGun location.
   * The weapon ID is validated against PROTO_MAIN_GUN_APPROVED_WEAPON_IDS in
   * VAL-PROTO-MAIN-GUN; this action stores the value unconditionally so the
   * UI can show validation errors without blocking the user.
   */
  setMainGunWeaponId: (weaponId: string | null) => void;

  // Special System Actions
  setMyomerBooster: (value: boolean) => void;
  setMagneticClamps: (value: boolean) => void;
  setExtendedTorsoTwist: (value: boolean) => void;
  /**
   * Enable or disable Glider Wings. Only legal when chassisType is GLIDER
   * (Light class). Storing the value unconditionally lets validation surface
   * the error rather than silently refusing the set.
   */
  setGlidingWings: (enabled: boolean) => void;

  // Equipment Actions
  addEquipment: (item: IEquipmentItem, location?: ProtoMechLocation) => string;
  removeEquipment: (instanceId: string) => void;
  updateEquipmentLocation: (
    instanceId: string,
    location: ProtoMechLocation,
  ) => void;
  linkAmmo: (
    weaponInstanceId: string,
    ammoInstanceId: string | undefined,
  ) => void;
  clearAllEquipment: () => void;

  // Metadata Actions
  markModified: (modified?: boolean) => void;

  // BV Actions

  /**
   * Recompute the BV breakdown from the current state and persist it on
   * `state.bvBreakdown`. Called automatically by every BV-affecting setter;
   * exposed on the store so callers can force a refresh after bulk updates
   * (e.g. after importing a serialized unit).
   *
   * @spec openspec/changes/add-protomech-battle-value/specs/protomech-unit-system/spec.md
   *       — Requirement: ProtoMech BV Breakdown on Unit State
   */
  recomputeBV: () => void;
}

/**
 * Complete ProtoMech store type
 */
export type ProtoMechStore = ProtoMechState & ProtoMechStoreActions;

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Options for creating a new ProtoMech
 */
export interface CreateProtoMechOptions {
  id?: string;
  name?: string;
  chassis?: string;
  model?: string;
  tonnage?: number;
  isQuad?: boolean;
}

/**
 * Get default internal structure for ProtoMech tonnage
 */
function getDefaultProtoMechStructure(
  tonnage: number,
): IProtoMechArmorAllocation {
  // Simplified structure based on tonnage
  const base = Math.ceil(tonnage / 2);
  return {
    [ProtoMechLocation.HEAD]: Math.max(1, Math.floor(base * 0.5)),
    [ProtoMechLocation.TORSO]: base + 2,
    [ProtoMechLocation.LEFT_ARM]: Math.max(1, Math.floor(base * 0.75)),
    [ProtoMechLocation.RIGHT_ARM]: Math.max(1, Math.floor(base * 0.75)),
    [ProtoMechLocation.LEGS]: base + 1,
    [ProtoMechLocation.MAIN_GUN]: 1,
  };
}

/**
 * Create a default ProtoMech state
 */
export function createDefaultProtoMechState(
  options: CreateProtoMechOptions = {},
): ProtoMechState {
  const now = Date.now();
  const id = options.id ?? generateUUID();
  const chassis = options.chassis ?? 'New ProtoMech';
  const model = options.model ?? '';
  const tonnage = options.tonnage ?? 5;
  const chassisType = options.isQuad ? ProtoChassis.QUAD : ProtoChassis.BIPED;
  const weightClass = getProtoWeightClass(tonnage);

  // Default walk MP to the minimum 1 — the user sets it via setWalkMP
  const walkMP = Math.max(1, Math.min(getProtoMPCaps(weightClass).walkMax, 4));
  // Cruise MP mirrors walk MP for ProtoMechs
  const cruiseMP = walkMP;
  // Effective walk (with booster = false by default) drives flank MP
  const effWalk = effectiveWalkMP(walkMP, false);
  const flankMP = effWalk + 1;

  return {
    // Identity
    id,
    name: `${chassis}${model ? ' ' + model : ''}`,
    chassis,
    model,
    mulId: '-1',
    year: 3060,
    rulesLevel: RulesLevel.ADVANCED,

    // Classification
    techBase: TechBase.CLAN, // ProtoMechs are always Clan tech
    unitType: UnitType.PROTOMECH,
    tonnage,
    weightClass,
    chassisType,
    pointSize: 5,
    isQuad: options.isQuad ?? false,
    isGlider: false,

    // Movement
    engineRating: tonnage * walkMP,
    walkMP,
    cruiseMP,
    flankMP,
    jumpMP: 0,

    // Structure & Armor
    structureByLocation: getDefaultProtoMechStructure(tonnage),
    armorByLocation: createEmptyProtoMechArmorAllocation(),
    armorType: 0, // Standard ProtoMech armor

    // Main Gun
    hasMainGun: false,
    mainGunWeaponId: undefined,

    // Special Systems
    hasMyomerBooster: false,
    hasMagneticClamps: false,
    hasExtendedTorsoTwist: false,
    glidingWings: false,

    // Equipment
    equipment: [],

    // Metadata
    isModified: false,
    createdAt: now,
    lastModifiedAt: now,
  };
}

// =============================================================================
// BV recomputation
// =============================================================================

/**
 * Mapping from the ProtoMechLocation store enum ('Head', 'Torso', ...) to the
 * ProtoLocation enum used by the BV calculator. Both use identical string
 * values today, but we keep an explicit map so that any future divergence is
 * localized here rather than relying on value-equality by accident.
 */
const STATE_LOC_TO_BV_LOC: Record<ProtoMechLocation, ProtoLocation> = {
  [ProtoMechLocation.HEAD]: ProtoLocation.HEAD,
  [ProtoMechLocation.TORSO]: ProtoLocation.TORSO,
  [ProtoMechLocation.LEFT_ARM]: ProtoLocation.LEFT_ARM,
  [ProtoMechLocation.RIGHT_ARM]: ProtoLocation.RIGHT_ARM,
  [ProtoMechLocation.LEGS]: ProtoLocation.LEGS,
  [ProtoMechLocation.MAIN_GUN]: ProtoLocation.MAIN_GUN,
};

/**
 * Project the {@link ProtoMechState} store shape onto the canonical
 * {@link IProtoMechUnit} expected by {@link calculateProtoMechBV}.
 *
 * This is a pure, synchronous adapter: it does not mutate state and does not
 * depend on external services. The calculator only reads a subset of the
 * unit's fields (armor/structure/equipment/MP/chassis/tonnage) so we fill
 * the other identity fields with the closest store equivalents.
 */
function toProtoMechUnit(state: ProtoMechState): IProtoMechUnit {
  const armorByLocation: IProtoArmorByLocation = {
    [ProtoLocation.HEAD]: state.armorByLocation[ProtoMechLocation.HEAD] ?? 0,
    [ProtoLocation.TORSO]: state.armorByLocation[ProtoMechLocation.TORSO] ?? 0,
    [ProtoLocation.LEFT_ARM]:
      state.armorByLocation[ProtoMechLocation.LEFT_ARM] ?? 0,
    [ProtoLocation.RIGHT_ARM]:
      state.armorByLocation[ProtoMechLocation.RIGHT_ARM] ?? 0,
    [ProtoLocation.LEGS]: state.armorByLocation[ProtoMechLocation.LEGS] ?? 0,
    [ProtoLocation.MAIN_GUN]:
      state.armorByLocation[ProtoMechLocation.MAIN_GUN] ?? 0,
  };
  const structureByLocation: IProtoArmorByLocation = {
    [ProtoLocation.HEAD]:
      state.structureByLocation[ProtoMechLocation.HEAD] ?? 0,
    [ProtoLocation.TORSO]:
      state.structureByLocation[ProtoMechLocation.TORSO] ?? 0,
    [ProtoLocation.LEFT_ARM]:
      state.structureByLocation[ProtoMechLocation.LEFT_ARM] ?? 0,
    [ProtoLocation.RIGHT_ARM]:
      state.structureByLocation[ProtoMechLocation.RIGHT_ARM] ?? 0,
    [ProtoLocation.LEGS]:
      state.structureByLocation[ProtoMechLocation.LEGS] ?? 0,
    [ProtoLocation.MAIN_GUN]:
      state.structureByLocation[ProtoMechLocation.MAIN_GUN] ?? 0,
  };

  const equipment: ReadonlyArray<IProtoMechMountedEquipmentV2> =
    state.equipment.map((mount) => ({
      id: mount.id,
      equipmentId: mount.equipmentId,
      name: mount.name,
      location: STATE_LOC_TO_BV_LOC[mount.location] ?? ProtoLocation.TORSO,
      linkedAmmoId: mount.linkedAmmoId,
      // A mount is treated as a main gun by the calculator when it sits in
      // the Main Gun location; the store does not carry an isMainGun flag.
      isMainGun: mount.location === ProtoMechLocation.MAIN_GUN,
    }));

  const walkMP = state.walkMP ?? state.cruiseMP ?? 1;
  const runMP = state.flankMP ?? walkMP + 1;

  return {
    id: state.id,
    name: state.name,
    chassis: state.chassis,
    model: state.model,
    mulId: state.mulId,
    year: state.year,
    unitType: UnitType.PROTOMECH,
    techBase: state.techBase,
    tonnage: state.tonnage,
    weightClass: state.weightClass,
    chassisType: state.chassisType,
    pointSize: state.pointSize,
    walkMP,
    runMP,
    jumpMP: state.jumpMP,
    engineRating: state.engineRating,
    engineWeight: state.engineRating * 0.025,
    myomerBooster: state.hasMyomerBooster,
    glidingWings: state.glidingWings,
    armorType: 'Standard',
    armorByLocation,
    structureByLocation,
    hasMainGun: state.hasMainGun,
    mainGunWeaponId: state.mainGunWeaponId,
    equipment,
    isModified: state.isModified,
    createdAt: state.createdAt,
    lastModifiedAt: state.lastModifiedAt,
  };
}

/**
 * Compute the BV 2.0 breakdown for a ProtoMech store state. Pure — does not
 * mutate the state. Used by the store's `recomputeBV` action and exported so
 * tests, selectors, and the parity harness can derive a breakdown from a raw
 * state snapshot.
 *
 * @spec openspec/changes/add-protomech-battle-value/specs/protomech-unit-system/spec.md
 *       — Requirement: ProtoMech BV Breakdown on Unit State
 */
export function computeProtoMechBVFromState(
  state: ProtoMechState,
): IProtoMechBVBreakdown {
  return calculateProtoMechBV(toProtoMechUnit(state));
}
