/**
 * Campaign Instance Interfaces
 *
 * Defines campaign unit and pilot instances - the deployed versions of
 * vault designs that track gameplay state (damage, XP, wounds) within
 * a specific campaign context.
 *
 * Key distinction:
 * - Vault units/pilots are "templates" or "designs" with version history
 * - Campaign instances are "deployed" versions that track gameplay history
 *
 * @spec openspec/changes/add-campaign-instances/specs/campaign-instances/spec.md
 */

import type { IPilotSkills, IPilotStatblock } from '../pilot/PilotInterfaces';

import { CampaignUnitStatus, CampaignPilotStatus } from './CampaignInterfaces';

// =============================================================================
// Enums
// =============================================================================

/**
 * Component damage status for tracking destroyed equipment.
 */
export enum ComponentStatus {
  /** Fully operational */
  Operational = 'operational',
  /** Damaged but functional (reduced performance) */
  Damaged = 'damaged',
  /** Destroyed and non-functional */
  Destroyed = 'destroyed',
}

// =============================================================================
// Damage State Interfaces
// =============================================================================

/**
 * Damage state for a single location (head, torso, arm, leg).
 */
export interface ILocationDamageState {
  /** Location identifier (e.g., 'head', 'center_torso', 'left_arm') */
  readonly location: string;
  /** Current armor points remaining */
  readonly armorCurrent: number;
  /** Maximum armor points for this location */
  readonly armorMax: number;
  /** Rear armor current (for torso locations) */
  readonly rearArmorCurrent?: number;
  /** Rear armor maximum (for torso locations) */
  readonly rearArmorMax?: number;
  /** Current internal structure points remaining */
  readonly structureCurrent: number;
  /** Maximum internal structure points for this location */
  readonly structureMax: number;
  /** Component damage status for equipment in this location */
  readonly components: readonly IComponentDamage[];
}

/**
 * Damage state for a specific component/equipment.
 */
export interface IComponentDamage {
  /** Component name or ID */
  readonly componentId: string;
  /** Component display name */
  readonly componentName: string;
  /** Current status */
  readonly status: ComponentStatus;
  /** Critical hit slots affected (if applicable) */
  readonly criticalSlots?: number;
}

/**
 * Complete unit damage state tracking all locations.
 */
export interface IUnitDamageState {
  /** Damage per location */
  readonly locations: readonly ILocationDamageState[];
  /** Ammunition expended (keyed by ammo type ID) */
  readonly ammoExpended: Readonly<Record<string, number>>;
  /** Current heat level */
  readonly currentHeat: number;
  /** Engine hits (0-3, 3 = destroyed) */
  readonly engineHits: number;
  /** Gyro hits (0-2, 2 = destroyed) */
  readonly gyroHits: number;
  /** Sensor hits (0-2, 2 = destroyed) */
  readonly sensorHits: number;
  /** Life support hits (0-1) */
  readonly lifeSupportHits: number;
  /** Is the unit immobilized (leg/hip damage) */
  readonly isImmobilized: boolean;
  /** Last damage applied timestamp */
  readonly lastDamageAt?: string;
}

// =============================================================================
// Campaign Unit Instance
// =============================================================================

/**
 * Campaign unit instance - a deployed unit within a campaign that tracks
 * gameplay state independently from the vault design.
 *
 * Created when a vault unit is assigned to a campaign force.
 * Persists damage, status, and history across missions.
 */
export interface ICampaignUnitInstance {
  /** Unique instance identifier */
  readonly id: string;
  /** Campaign this instance belongs to */
  readonly campaignId: string;
  /** Reference to the vault unit design */
  readonly vaultUnitId: string;
  /** Version of the vault unit at time of assignment (snapshot) */
  readonly vaultUnitVersion: number;
  /** Cached unit name for display */
  readonly unitName: string;
  /** Cached unit chassis for display */
  readonly unitChassis: string;
  /** Cached unit variant for display */
  readonly unitVariant: string;
  /** Current operational status */
  readonly status: CampaignUnitStatus;
  /** Current damage state */
  readonly damageState: IUnitDamageState;
  /** Assigned pilot instance ID (if any) */
  readonly assignedPilotInstanceId?: string;
  /** Force ID this unit is assigned to (if any) */
  readonly forceId?: string;
  /** Force slot number (if assigned to force) */
  readonly forceSlot?: number;
  /** Total kills by this unit in campaign */
  readonly totalKills: number;
  /** Total missions this unit participated in */
  readonly missionsParticipated: number;
  /** Estimated repair cost (C-Bills) */
  readonly estimatedRepairCost: number;
  /** Estimated repair time (in campaign days/cycles) */
  readonly estimatedRepairTime: number;
  /** Notes about this instance */
  readonly notes?: string;
  /** Instance creation timestamp */
  readonly createdAt: string;
  /** Instance last update timestamp */
  readonly updatedAt: string;
}

// =============================================================================
// Campaign Pilot Instance
// =============================================================================

/**
 * Campaign pilot instance - a deployed pilot within a campaign that tracks
 * XP, wounds, and career history independently from the vault pilot.
 *
 * Can be created from:
 * 1. A vault pilot (vaultPilotId reference)
 * 2. A statblock (inline data, no vault reference) for quick NPCs
 */
export interface ICampaignPilotInstance {
  /** Unique instance identifier */
  readonly id: string;
  /** Campaign this instance belongs to */
  readonly campaignId: string;
  /** Reference to vault pilot (null for statblock pilots) */
  readonly vaultPilotId: string | null;
  /** Inline pilot data for statblock pilots (null for vault pilots) */
  readonly statblockData: IPilotStatblock | null;
  /** Cached pilot name for display */
  readonly pilotName: string;
  /** Cached pilot callsign for display */
  readonly pilotCallsign?: string;
  /** Current operational status */
  readonly status: CampaignPilotStatus;
  /** Current skills (may differ from vault due to campaign progression) */
  readonly currentSkills: IPilotSkills;
  /** Current wounds (0-6, 6 = deceased) */
  readonly wounds: number;
  /** Current XP available to spend */
  readonly currentXP: number;
  /** Total XP earned in this campaign */
  readonly campaignXPEarned: number;
  /** Total kills in this campaign */
  readonly killCount: number;
  /** Total missions participated in this campaign */
  readonly missionsParticipated: number;
  /** Assigned unit instance ID (if any) */
  readonly assignedUnitInstanceId?: string;
  /** Recovery time remaining (in campaign days/cycles) */
  readonly recoveryTime: number;
  /** Notes about this instance */
  readonly notes?: string;
  /** Instance creation timestamp */
  readonly createdAt: string;
  /** Instance last update timestamp */
  readonly updatedAt: string;
}

// =============================================================================
// Instance Creation Types
// =============================================================================

/**
 * Input for creating a campaign unit instance from a vault unit.
 */
export interface ICreateUnitInstanceInput {
  /** Campaign to add instance to */
  readonly campaignId: string;
  /** Vault unit ID to create instance from */
  readonly vaultUnitId: string;
  /** Force ID to assign to (optional) */
  readonly forceId?: string;
  /** Force slot number (optional) */
  readonly forceSlot?: number;
  /** Initial notes (optional) */
  readonly notes?: string;
}

/**
 * Input for creating a campaign pilot instance from a vault pilot.
 */
export interface ICreatePilotInstanceFromVaultInput {
  /** Campaign to add instance to */
  readonly campaignId: string;
  /** Vault pilot ID to create instance from */
  readonly vaultPilotId: string;
  /** Initial notes (optional) */
  readonly notes?: string;
}

/**
 * Input for creating a campaign pilot instance from a statblock.
 */
export interface ICreatePilotInstanceFromStatblockInput {
  /** Campaign to add instance to */
  readonly campaignId: string;
  /** Statblock data for the pilot */
  readonly statblock: IPilotStatblock;
  /** Initial notes (optional) */
  readonly notes?: string;
}

// =============================================================================
// Instance Update Types
// =============================================================================

/**
 * Input for applying damage to a unit instance.
 */
export interface IApplyDamageInput {
  /** Instance ID to apply damage to */
  readonly instanceId: string;
  /** Updated damage state */
  readonly damageState: Partial<IUnitDamageState>;
  /** Game/mission ID where damage occurred */
  readonly gameId?: string;
  /** Cause of damage (for event logging) */
  readonly cause?: string;
}

/**
 * Input for updating pilot instance after a mission.
 */
export interface IUpdatePilotInstanceInput {
  /** Instance ID to update */
  readonly instanceId: string;
  /** XP earned this mission */
  readonly xpEarned?: number;
  /** Kills this mission */
  readonly kills?: number;
  /** Wounds received this mission */
  readonly woundsReceived?: number;
  /** New status (if changed) */
  readonly status?: CampaignPilotStatus;
  /** Game/mission ID */
  readonly gameId?: string;
}

/**
 * Input for assigning a pilot instance to a unit instance.
 */
export interface IAssignPilotToUnitInput {
  /** Pilot instance ID */
  readonly pilotInstanceId: string;
  /** Unit instance ID */
  readonly unitInstanceId: string;
}

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Type guard for ICampaignUnitInstance.
 */
export function isCampaignUnitInstance(
  obj: unknown,
): obj is ICampaignUnitInstance {
  if (typeof obj !== 'object' || obj === null) return false;
  const instance = obj as ICampaignUnitInstance;
  return (
    typeof instance.id === 'string' &&
    typeof instance.campaignId === 'string' &&
    typeof instance.vaultUnitId === 'string' &&
    typeof instance.vaultUnitVersion === 'number' &&
    typeof instance.status === 'string' &&
    typeof instance.damageState === 'object' &&
    typeof instance.createdAt === 'string'
  );
}

/**
 * Type guard for ICampaignPilotInstance.
 */
export function isCampaignPilotInstance(
  obj: unknown,
): obj is ICampaignPilotInstance {
  if (typeof obj !== 'object' || obj === null) return false;
  const instance = obj as ICampaignPilotInstance;
  return (
    typeof instance.id === 'string' &&
    typeof instance.campaignId === 'string' &&
    typeof instance.status === 'string' &&
    typeof instance.currentSkills === 'object' &&
    typeof instance.wounds === 'number' &&
    typeof instance.currentXP === 'number' &&
    typeof instance.createdAt === 'string' &&
    // Must have either vaultPilotId OR statblockData (XOR)
    ((instance.vaultPilotId !== null && instance.statblockData === null) ||
      (instance.vaultPilotId === null && instance.statblockData !== null))
  );
}

/**
 * Type guard for IUnitDamageState.
 */
export function isUnitDamageState(obj: unknown): obj is IUnitDamageState {
  if (typeof obj !== 'object' || obj === null) return false;
  const state = obj as IUnitDamageState;
  return (
    Array.isArray(state.locations) &&
    typeof state.ammoExpended === 'object' &&
    typeof state.currentHeat === 'number' &&
    typeof state.engineHits === 'number' &&
    typeof state.gyroHits === 'number'
  );
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create an empty/pristine damage state for a new unit instance.
 * Actual armor/structure values should be populated from the unit design.
 */
export function createEmptyDamageState(): IUnitDamageState {
  return {
    locations: [],
    ammoExpended: {},
    currentHeat: 0,
    engineHits: 0,
    gyroHits: 0,
    sensorHits: 0,
    lifeSupportHits: 0,
    isImmobilized: false,
  };
}

/**
 * Create a new campaign unit instance.
 * Note: This creates the instance structure; actual creation should use
 * the campaign service to properly snapshot vault data.
 */
export function createUnitInstance(
  id: string,
  campaignId: string,
  vaultUnitId: string,
  vaultUnitVersion: number,
  unitName: string,
  unitChassis: string,
  unitVariant: string,
  damageState: IUnitDamageState,
): ICampaignUnitInstance {
  const now = new Date().toISOString();
  return {
    id,
    campaignId,
    vaultUnitId,
    vaultUnitVersion,
    unitName,
    unitChassis,
    unitVariant,
    status: CampaignUnitStatus.Operational,
    damageState,
    totalKills: 0,
    missionsParticipated: 0,
    estimatedRepairCost: 0,
    estimatedRepairTime: 0,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Create a new campaign pilot instance from a vault pilot.
 */
export function createPilotInstanceFromVault(
  id: string,
  campaignId: string,
  vaultPilotId: string,
  pilotName: string,
  pilotCallsign: string | undefined,
  skills: IPilotSkills,
): ICampaignPilotInstance {
  const now = new Date().toISOString();
  return {
    id,
    campaignId,
    vaultPilotId,
    statblockData: null,
    pilotName,
    pilotCallsign,
    status: CampaignPilotStatus.Active,
    currentSkills: skills,
    wounds: 0,
    currentXP: 0,
    campaignXPEarned: 0,
    killCount: 0,
    missionsParticipated: 0,
    recoveryTime: 0,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Create a new campaign pilot instance from a statblock.
 */
export function createPilotInstanceFromStatblock(
  id: string,
  campaignId: string,
  statblock: IPilotStatblock,
): ICampaignPilotInstance {
  const now = new Date().toISOString();
  return {
    id,
    campaignId,
    vaultPilotId: null,
    statblockData: statblock,
    pilotName: statblock.name,
    pilotCallsign: undefined,
    status: CampaignPilotStatus.Active,
    currentSkills: {
      gunnery: statblock.gunnery,
      piloting: statblock.piloting,
    },
    wounds: 0,
    currentXP: 0,
    campaignXPEarned: 0,
    killCount: 0,
    missionsParticipated: 0,
    recoveryTime: 0,
    createdAt: now,
    updatedAt: now,
  };
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Calculate total damage percentage for a unit instance.
 * Returns 0-100 representing overall damage level.
 */
export function calculateDamagePercentage(
  damageState: IUnitDamageState,
): number {
  if (damageState.locations.length === 0) return 0;

  let totalDamage = 0;
  let totalMax = 0;

  for (const loc of damageState.locations) {
    // Armor damage
    totalDamage += loc.armorMax - loc.armorCurrent;
    totalMax += loc.armorMax;

    // Rear armor (if present)
    if (loc.rearArmorMax !== undefined && loc.rearArmorCurrent !== undefined) {
      totalDamage += loc.rearArmorMax - loc.rearArmorCurrent;
      totalMax += loc.rearArmorMax;
    }

    // Structure damage
    totalDamage += loc.structureMax - loc.structureCurrent;
    totalMax += loc.structureMax;
  }

  if (totalMax === 0) return 0;
  return Math.round((totalDamage / totalMax) * 100);
}

/**
 * Determine unit status based on damage state.
 */
export function determineUnitStatus(
  damageState: IUnitDamageState,
): CampaignUnitStatus {
  // Check for destroyed (any location structure at 0)
  const hasDestroyedLocation = damageState.locations.some(
    (loc) => loc.structureCurrent <= 0,
  );
  if (hasDestroyedLocation) {
    return CampaignUnitStatus.Destroyed;
  }

  // Check for damage
  const damagePercentage = calculateDamagePercentage(damageState);
  if (damagePercentage > 0) {
    return CampaignUnitStatus.Damaged;
  }

  return CampaignUnitStatus.Operational;
}

/**
 * Check if a pilot instance is available for assignment.
 */
export function isPilotAvailable(instance: ICampaignPilotInstance): boolean {
  return (
    instance.status === CampaignPilotStatus.Active &&
    instance.recoveryTime === 0 &&
    instance.assignedUnitInstanceId === undefined
  );
}

/**
 * Check if a unit instance is available for deployment.
 */
export function isUnitAvailable(instance: ICampaignUnitInstance): boolean {
  return (
    instance.status === CampaignUnitStatus.Operational ||
    instance.status === CampaignUnitStatus.Damaged
  );
}
