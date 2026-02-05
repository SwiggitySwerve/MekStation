/**
 * Campaign Instance Event Types
 *
 * Event payload interfaces for campaign unit and pilot instance state changes.
 * These events are emitted when instances are created, modified, or destroyed.
 *
 * @spec openspec/changes/add-campaign-instances/specs/campaign-instances/spec.md
 */

import type { IUnitDamageState } from '../campaign/CampaignInstanceInterfaces';
import type {
  CampaignUnitStatus,
  CampaignPilotStatus,
} from '../campaign/CampaignInterfaces';
import type { IPilotSkills } from '../pilot/PilotInterfaces';

// =============================================================================
// Unit Instance Event Types
// =============================================================================

/**
 * Event type constants for campaign instance events.
 */
export const CampaignInstanceEventTypes = {
  // Unit instance events
  UNIT_INSTANCE_CREATED: 'unit_instance_created',
  UNIT_INSTANCE_DAMAGE_APPLIED: 'unit_instance_damage_applied',
  UNIT_INSTANCE_STATUS_CHANGED: 'unit_instance_status_changed',
  UNIT_INSTANCE_PILOT_ASSIGNED: 'unit_instance_pilot_assigned',
  UNIT_INSTANCE_PILOT_UNASSIGNED: 'unit_instance_pilot_unassigned',
  UNIT_INSTANCE_DESTROYED: 'unit_instance_destroyed',
  UNIT_INSTANCE_REPAIR_STARTED: 'unit_instance_repair_started',
  UNIT_INSTANCE_REPAIR_COMPLETED: 'unit_instance_repair_completed',

  // Pilot instance events
  PILOT_INSTANCE_CREATED: 'pilot_instance_created',
  PILOT_INSTANCE_XP_GAINED: 'pilot_instance_xp_gained',
  PILOT_INSTANCE_SKILL_IMPROVED: 'pilot_instance_skill_improved',
  PILOT_INSTANCE_WOUNDED: 'pilot_instance_wounded',
  PILOT_INSTANCE_STATUS_CHANGED: 'pilot_instance_status_changed',
  PILOT_INSTANCE_KILL_RECORDED: 'pilot_instance_kill_recorded',
  PILOT_INSTANCE_MISSION_COMPLETED: 'pilot_instance_mission_completed',
  PILOT_INSTANCE_DECEASED: 'pilot_instance_deceased',
} as const;

export type CampaignInstanceEventType =
  (typeof CampaignInstanceEventTypes)[keyof typeof CampaignInstanceEventTypes];

// =============================================================================
// Unit Instance Event Payloads
// =============================================================================

/**
 * Payload for unit_instance_created event.
 */
export interface IUnitInstanceCreatedPayload {
  /** Instance ID */
  readonly instanceId: string;
  /** Campaign ID */
  readonly campaignId: string;
  /** Reference to vault unit */
  readonly vaultUnitId: string;
  /** Vault unit version at creation */
  readonly vaultUnitVersion: number;
  /** Unit display name */
  readonly unitName: string;
  /** Unit chassis */
  readonly unitChassis: string;
  /** Unit variant */
  readonly unitVariant: string;
  /** Initial status */
  readonly status: CampaignUnitStatus;
  /** Force assignment (if any) */
  readonly forceId?: string;
  /** Force slot (if assigned) */
  readonly forceSlot?: number;
}

/**
 * Payload for unit_instance_damage_applied event.
 */
export interface IUnitInstanceDamageAppliedPayload {
  /** Instance ID */
  readonly instanceId: string;
  /** Damage state before */
  readonly previousDamageState: IUnitDamageState;
  /** Damage state after */
  readonly newDamageState: IUnitDamageState;
  /** Damage percentage change */
  readonly damagePercentageChange: number;
  /** Source of damage (weapon, collision, etc.) */
  readonly damageSource?: string;
  /** Attacker unit ID (if applicable) */
  readonly attackerUnitId?: string;
}

/**
 * Payload for unit_instance_status_changed event.
 */
export interface IUnitInstanceStatusChangedPayload {
  /** Instance ID */
  readonly instanceId: string;
  /** Previous status */
  readonly previousStatus: CampaignUnitStatus;
  /** New status */
  readonly newStatus: CampaignUnitStatus;
  /** Reason for change */
  readonly reason?: string;
}

/**
 * Payload for unit_instance_pilot_assigned event.
 */
export interface IUnitInstancePilotAssignedPayload {
  /** Unit instance ID */
  readonly unitInstanceId: string;
  /** Pilot instance ID */
  readonly pilotInstanceId: string;
  /** Pilot name (for display) */
  readonly pilotName: string;
  /** Previous pilot instance ID (if replacing) */
  readonly previousPilotInstanceId?: string;
}

/**
 * Payload for unit_instance_pilot_unassigned event.
 */
export interface IUnitInstancePilotUnassignedPayload {
  /** Unit instance ID */
  readonly unitInstanceId: string;
  /** Pilot instance ID being unassigned */
  readonly pilotInstanceId: string;
  /** Pilot name (for display) */
  readonly pilotName: string;
  /** Reason for unassignment */
  readonly reason?: 'manual' | 'pilot_wounded' | 'pilot_kia' | 'unit_destroyed';
}

/**
 * Payload for unit_instance_destroyed event.
 */
export interface IUnitInstanceDestroyedPayload {
  /** Instance ID */
  readonly instanceId: string;
  /** Unit name */
  readonly unitName: string;
  /** Cause of destruction */
  readonly cause: string;
  /** Pilot instance ID (if piloted) */
  readonly pilotInstanceId?: string;
  /** Pilot fate (survived, wounded, kia) */
  readonly pilotFate?: 'survived' | 'wounded' | 'kia';
}

/**
 * Payload for unit_instance_repair_started event.
 */
export interface IUnitInstanceRepairStartedPayload {
  /** Instance ID */
  readonly instanceId: string;
  /** Estimated repair cost (C-Bills) */
  readonly estimatedCost: number;
  /** Estimated repair time (campaign days) */
  readonly estimatedTime: number;
  /** Components being repaired */
  readonly repairItems: readonly string[];
}

/**
 * Payload for unit_instance_repair_completed event.
 */
export interface IUnitInstanceRepairCompletedPayload {
  /** Instance ID */
  readonly instanceId: string;
  /** Actual repair cost */
  readonly actualCost: number;
  /** Actual repair time */
  readonly actualTime: number;
  /** New status after repair */
  readonly newStatus: CampaignUnitStatus;
}

// =============================================================================
// Pilot Instance Event Payloads
// =============================================================================

/**
 * Payload for pilot_instance_created event.
 */
export interface IPilotInstanceCreatedPayload {
  /** Instance ID */
  readonly instanceId: string;
  /** Campaign ID */
  readonly campaignId: string;
  /** Reference to vault pilot (null for statblock) */
  readonly vaultPilotId: string | null;
  /** Is statblock pilot */
  readonly isStatblock: boolean;
  /** Pilot display name */
  readonly pilotName: string;
  /** Pilot callsign */
  readonly pilotCallsign?: string;
  /** Initial skills */
  readonly skills: IPilotSkills;
}

/**
 * Payload for pilot_instance_xp_gained event.
 */
export interface IPilotInstanceXPGainedPayload {
  /** Instance ID */
  readonly instanceId: string;
  /** XP gained */
  readonly xpGained: number;
  /** Total XP after gain */
  readonly totalXP: number;
  /** Source of XP */
  readonly source:
    | 'mission_participation'
    | 'kill'
    | 'victory'
    | 'objective'
    | 'survival'
    | 'other';
  /** Additional details */
  readonly details?: string;
}

/**
 * Payload for pilot_instance_skill_improved event.
 */
export interface IPilotInstanceSkillImprovedPayload {
  /** Instance ID */
  readonly instanceId: string;
  /** Skill improved */
  readonly skill: 'gunnery' | 'piloting';
  /** Previous value */
  readonly previousValue: number;
  /** New value */
  readonly newValue: number;
  /** XP spent */
  readonly xpSpent: number;
}

/**
 * Payload for pilot_instance_wounded event.
 */
export interface IPilotInstanceWoundedPayload {
  /** Instance ID */
  readonly instanceId: string;
  /** Wounds received */
  readonly woundsReceived: number;
  /** Total wounds after */
  readonly totalWounds: number;
  /** Cause of wounds */
  readonly cause: string;
  /** Recovery time required (campaign days) */
  readonly recoveryTime: number;
}

/**
 * Payload for pilot_instance_status_changed event.
 */
export interface IPilotInstanceStatusChangedPayload {
  /** Instance ID */
  readonly instanceId: string;
  /** Previous status */
  readonly previousStatus: CampaignPilotStatus;
  /** New status */
  readonly newStatus: CampaignPilotStatus;
  /** Reason for change */
  readonly reason?: string;
}

/**
 * Payload for pilot_instance_kill_recorded event.
 */
export interface IPilotInstanceKillRecordedPayload {
  /** Instance ID */
  readonly instanceId: string;
  /** Target unit name */
  readonly targetName: string;
  /** Target unit ID (if tracked) */
  readonly targetUnitId?: string;
  /** Weapon used */
  readonly weaponUsed: string;
  /** Total kills after this */
  readonly totalKills: number;
}

/**
 * Payload for pilot_instance_mission_completed event.
 */
export interface IPilotInstanceMissionCompletedPayload {
  /** Instance ID */
  readonly instanceId: string;
  /** Mission/game ID */
  readonly missionId: string;
  /** Mission name */
  readonly missionName: string;
  /** Outcome */
  readonly outcome: 'victory' | 'defeat' | 'draw';
  /** Kills this mission */
  readonly kills: number;
  /** XP earned this mission */
  readonly xpEarned: number;
  /** Total missions after */
  readonly totalMissions: number;
}

/**
 * Payload for pilot_instance_deceased event.
 */
export interface IPilotInstanceDeceasedPayload {
  /** Instance ID */
  readonly instanceId: string;
  /** Pilot name */
  readonly pilotName: string;
  /** Cause of death */
  readonly cause: string;
  /** Unit they were piloting */
  readonly unitInstanceId?: string;
  /** Unit name */
  readonly unitName?: string;
  /** Total kills at death */
  readonly totalKills: number;
  /** Total missions at death */
  readonly totalMissions: number;
}

// =============================================================================
// Type Union
// =============================================================================

/**
 * Union type of all campaign instance event payloads.
 */
export type CampaignInstanceEventPayload =
  | IUnitInstanceCreatedPayload
  | IUnitInstanceDamageAppliedPayload
  | IUnitInstanceStatusChangedPayload
  | IUnitInstancePilotAssignedPayload
  | IUnitInstancePilotUnassignedPayload
  | IUnitInstanceDestroyedPayload
  | IUnitInstanceRepairStartedPayload
  | IUnitInstanceRepairCompletedPayload
  | IPilotInstanceCreatedPayload
  | IPilotInstanceXPGainedPayload
  | IPilotInstanceSkillImprovedPayload
  | IPilotInstanceWoundedPayload
  | IPilotInstanceStatusChangedPayload
  | IPilotInstanceKillRecordedPayload
  | IPilotInstanceMissionCompletedPayload
  | IPilotInstanceDeceasedPayload;
