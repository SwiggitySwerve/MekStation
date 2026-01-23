/**
 * Campaign Instance Event Factory Functions
 *
 * Utility functions for creating and emitting campaign instance events.
 *
 * @spec openspec/changes/add-campaign-instances/specs/campaign-instances/spec.md
 */

import { createCampaignEvent } from './eventFactory';
import { getEventStore } from '@/services/events';
import {
  CampaignInstanceEventTypes,
  type IUnitInstanceCreatedPayload,
  type IUnitInstanceDamageAppliedPayload,
  type IUnitInstanceStatusChangedPayload,
  type IUnitInstancePilotAssignedPayload,
  type IUnitInstancePilotUnassignedPayload,
  type IUnitInstanceDestroyedPayload,
  type IUnitInstanceRepairStartedPayload,
  type IUnitInstanceRepairCompletedPayload,
  type IPilotInstanceCreatedPayload,
  type IPilotInstanceXPGainedPayload,
  type IPilotInstanceSkillImprovedPayload,
  type IPilotInstanceWoundedPayload,
  type IPilotInstanceStatusChangedPayload,
  type IPilotInstanceKillRecordedPayload,
  type IPilotInstanceMissionCompletedPayload,
  type IPilotInstanceDeceasedPayload,
  type ICausedBy,
  type IBaseEvent,
} from '@/types/events';
import type { CampaignUnitStatus, CampaignPilotStatus } from '@/types/campaign/CampaignInterfaces';
import type { IUnitDamageState } from '@/types/campaign/CampaignInstanceInterfaces';
import type { IPilotSkills } from '@/types/pilot/PilotInterfaces';

// =============================================================================
// Unit Instance Events
// =============================================================================

/**
 * Create and emit a unit_instance_created event.
 */
export function emitUnitInstanceCreated(
  params: {
    instanceId: string;
    campaignId: string;
    vaultUnitId: string;
    vaultUnitVersion: number;
    unitName: string;
    unitChassis: string;
    unitVariant: string;
    status: CampaignUnitStatus;
    forceId?: string;
    forceSlot?: number;
    missionId?: string;
  },
  emit = true
): IBaseEvent<IUnitInstanceCreatedPayload> {
  const payload: IUnitInstanceCreatedPayload = {
    instanceId: params.instanceId,
    campaignId: params.campaignId,
    vaultUnitId: params.vaultUnitId,
    vaultUnitVersion: params.vaultUnitVersion,
    unitName: params.unitName,
    unitChassis: params.unitChassis,
    unitVariant: params.unitVariant,
    status: params.status,
    forceId: params.forceId,
    forceSlot: params.forceSlot,
  };

  const event = createCampaignEvent(
    CampaignInstanceEventTypes.UNIT_INSTANCE_CREATED,
    payload,
    params.campaignId,
    params.missionId,
    { unitId: params.instanceId }
  );

  if (emit) {
    getEventStore().append(event);
  }

  return event;
}

/**
 * Create and emit a unit_instance_damage_applied event.
 */
export function emitUnitInstanceDamageApplied(
  params: {
    instanceId: string;
    campaignId: string;
    previousDamageState: IUnitDamageState;
    newDamageState: IUnitDamageState;
    damagePercentageChange: number;
    damageSource?: string;
    attackerUnitId?: string;
    gameId?: string;
  },
  causedBy?: ICausedBy,
  emit = true
): IBaseEvent<IUnitInstanceDamageAppliedPayload> {
  const payload: IUnitInstanceDamageAppliedPayload = {
    instanceId: params.instanceId,
    previousDamageState: params.previousDamageState,
    newDamageState: params.newDamageState,
    damagePercentageChange: params.damagePercentageChange,
    damageSource: params.damageSource,
    attackerUnitId: params.attackerUnitId,
  };

  const event = createCampaignEvent(
    CampaignInstanceEventTypes.UNIT_INSTANCE_DAMAGE_APPLIED,
    payload,
    params.campaignId,
    undefined,
    { unitId: params.instanceId, gameId: params.gameId },
    causedBy
  );

  if (emit) {
    getEventStore().append(event);
  }

  return event;
}

/**
 * Create and emit a unit_instance_status_changed event.
 */
export function emitUnitInstanceStatusChanged(
  params: {
    instanceId: string;
    campaignId: string;
    previousStatus: CampaignUnitStatus;
    newStatus: CampaignUnitStatus;
    reason?: string;
  },
  causedBy?: ICausedBy,
  emit = true
): IBaseEvent<IUnitInstanceStatusChangedPayload> {
  const payload: IUnitInstanceStatusChangedPayload = {
    instanceId: params.instanceId,
    previousStatus: params.previousStatus,
    newStatus: params.newStatus,
    reason: params.reason,
  };

  const event = createCampaignEvent(
    CampaignInstanceEventTypes.UNIT_INSTANCE_STATUS_CHANGED,
    payload,
    params.campaignId,
    undefined,
    { unitId: params.instanceId },
    causedBy
  );

  if (emit) {
    getEventStore().append(event);
  }

  return event;
}

/**
 * Create and emit a unit_instance_pilot_assigned event.
 */
export function emitUnitInstancePilotAssigned(
  params: {
    unitInstanceId: string;
    pilotInstanceId: string;
    pilotName: string;
    campaignId: string;
    previousPilotInstanceId?: string;
  },
  emit = true
): IBaseEvent<IUnitInstancePilotAssignedPayload> {
  const payload: IUnitInstancePilotAssignedPayload = {
    unitInstanceId: params.unitInstanceId,
    pilotInstanceId: params.pilotInstanceId,
    pilotName: params.pilotName,
    previousPilotInstanceId: params.previousPilotInstanceId,
  };

  const event = createCampaignEvent(
    CampaignInstanceEventTypes.UNIT_INSTANCE_PILOT_ASSIGNED,
    payload,
    params.campaignId,
    undefined,
    { unitId: params.unitInstanceId, pilotId: params.pilotInstanceId }
  );

  if (emit) {
    getEventStore().append(event);
  }

  return event;
}

/**
 * Create and emit a unit_instance_pilot_unassigned event.
 */
export function emitUnitInstancePilotUnassigned(
  params: {
    unitInstanceId: string;
    pilotInstanceId: string;
    pilotName: string;
    campaignId: string;
    reason?: 'manual' | 'pilot_wounded' | 'pilot_kia' | 'unit_destroyed';
  },
  emit = true
): IBaseEvent<IUnitInstancePilotUnassignedPayload> {
  const payload: IUnitInstancePilotUnassignedPayload = {
    unitInstanceId: params.unitInstanceId,
    pilotInstanceId: params.pilotInstanceId,
    pilotName: params.pilotName,
    reason: params.reason,
  };

  const event = createCampaignEvent(
    CampaignInstanceEventTypes.UNIT_INSTANCE_PILOT_UNASSIGNED,
    payload,
    params.campaignId,
    undefined,
    { unitId: params.unitInstanceId, pilotId: params.pilotInstanceId }
  );

  if (emit) {
    getEventStore().append(event);
  }

  return event;
}

/**
 * Create and emit a unit_instance_destroyed event.
 */
export function emitUnitInstanceDestroyed(
  params: {
    instanceId: string;
    campaignId: string;
    unitName: string;
    cause: string;
    pilotInstanceId?: string;
    pilotFate?: 'survived' | 'wounded' | 'kia';
    gameId?: string;
  },
  causedBy?: ICausedBy,
  emit = true
): IBaseEvent<IUnitInstanceDestroyedPayload> {
  const payload: IUnitInstanceDestroyedPayload = {
    instanceId: params.instanceId,
    unitName: params.unitName,
    cause: params.cause,
    pilotInstanceId: params.pilotInstanceId,
    pilotFate: params.pilotFate,
  };

  const event = createCampaignEvent(
    CampaignInstanceEventTypes.UNIT_INSTANCE_DESTROYED,
    payload,
    params.campaignId,
    undefined,
    { unitId: params.instanceId, gameId: params.gameId },
    causedBy
  );

  if (emit) {
    getEventStore().append(event);
  }

  return event;
}

/**
 * Create and emit a unit_instance_repair_started event.
 */
export function emitUnitInstanceRepairStarted(
  params: {
    instanceId: string;
    campaignId: string;
    estimatedCost: number;
    estimatedTime: number;
    repairItems: readonly string[];
  },
  emit = true
): IBaseEvent<IUnitInstanceRepairStartedPayload> {
  const payload: IUnitInstanceRepairStartedPayload = {
    instanceId: params.instanceId,
    estimatedCost: params.estimatedCost,
    estimatedTime: params.estimatedTime,
    repairItems: params.repairItems,
  };

  const event = createCampaignEvent(
    CampaignInstanceEventTypes.UNIT_INSTANCE_REPAIR_STARTED,
    payload,
    params.campaignId,
    undefined,
    { unitId: params.instanceId }
  );

  if (emit) {
    getEventStore().append(event);
  }

  return event;
}

/**
 * Create and emit a unit_instance_repair_completed event.
 */
export function emitUnitInstanceRepairCompleted(
  params: {
    instanceId: string;
    campaignId: string;
    actualCost: number;
    actualTime: number;
    newStatus: CampaignUnitStatus;
  },
  causedBy?: ICausedBy,
  emit = true
): IBaseEvent<IUnitInstanceRepairCompletedPayload> {
  const payload: IUnitInstanceRepairCompletedPayload = {
    instanceId: params.instanceId,
    actualCost: params.actualCost,
    actualTime: params.actualTime,
    newStatus: params.newStatus,
  };

  const event = createCampaignEvent(
    CampaignInstanceEventTypes.UNIT_INSTANCE_REPAIR_COMPLETED,
    payload,
    params.campaignId,
    undefined,
    { unitId: params.instanceId },
    causedBy
  );

  if (emit) {
    getEventStore().append(event);
  }

  return event;
}

// =============================================================================
// Pilot Instance Events
// =============================================================================

/**
 * Create and emit a pilot_instance_created event.
 */
export function emitPilotInstanceCreated(
  params: {
    instanceId: string;
    campaignId: string;
    vaultPilotId: string | null;
    pilotName: string;
    pilotCallsign?: string;
    skills: IPilotSkills;
    missionId?: string;
  },
  emit = true
): IBaseEvent<IPilotInstanceCreatedPayload> {
  const payload: IPilotInstanceCreatedPayload = {
    instanceId: params.instanceId,
    campaignId: params.campaignId,
    vaultPilotId: params.vaultPilotId,
    isStatblock: params.vaultPilotId === null,
    pilotName: params.pilotName,
    pilotCallsign: params.pilotCallsign,
    skills: params.skills,
  };

  const event = createCampaignEvent(
    CampaignInstanceEventTypes.PILOT_INSTANCE_CREATED,
    payload,
    params.campaignId,
    params.missionId,
    { pilotId: params.instanceId }
  );

  if (emit) {
    getEventStore().append(event);
  }

  return event;
}

/**
 * Create and emit a pilot_instance_xp_gained event.
 */
export function emitPilotInstanceXPGained(
  params: {
    instanceId: string;
    campaignId: string;
    xpGained: number;
    totalXP: number;
    source: 'mission_participation' | 'kill' | 'victory' | 'objective' | 'survival' | 'other';
    details?: string;
    gameId?: string;
  },
  causedBy?: ICausedBy,
  emit = true
): IBaseEvent<IPilotInstanceXPGainedPayload> {
  const payload: IPilotInstanceXPGainedPayload = {
    instanceId: params.instanceId,
    xpGained: params.xpGained,
    totalXP: params.totalXP,
    source: params.source,
    details: params.details,
  };

  const event = createCampaignEvent(
    CampaignInstanceEventTypes.PILOT_INSTANCE_XP_GAINED,
    payload,
    params.campaignId,
    undefined,
    { pilotId: params.instanceId, gameId: params.gameId },
    causedBy
  );

  if (emit) {
    getEventStore().append(event);
  }

  return event;
}

/**
 * Create and emit a pilot_instance_skill_improved event.
 */
export function emitPilotInstanceSkillImproved(
  params: {
    instanceId: string;
    campaignId: string;
    skill: 'gunnery' | 'piloting';
    previousValue: number;
    newValue: number;
    xpSpent: number;
  },
  emit = true
): IBaseEvent<IPilotInstanceSkillImprovedPayload> {
  const payload: IPilotInstanceSkillImprovedPayload = {
    instanceId: params.instanceId,
    skill: params.skill,
    previousValue: params.previousValue,
    newValue: params.newValue,
    xpSpent: params.xpSpent,
  };

  const event = createCampaignEvent(
    CampaignInstanceEventTypes.PILOT_INSTANCE_SKILL_IMPROVED,
    payload,
    params.campaignId,
    undefined,
    { pilotId: params.instanceId }
  );

  if (emit) {
    getEventStore().append(event);
  }

  return event;
}

/**
 * Create and emit a pilot_instance_wounded event.
 */
export function emitPilotInstanceWounded(
  params: {
    instanceId: string;
    campaignId: string;
    woundsReceived: number;
    totalWounds: number;
    cause: string;
    recoveryTime: number;
    gameId?: string;
  },
  causedBy?: ICausedBy,
  emit = true
): IBaseEvent<IPilotInstanceWoundedPayload> {
  const payload: IPilotInstanceWoundedPayload = {
    instanceId: params.instanceId,
    woundsReceived: params.woundsReceived,
    totalWounds: params.totalWounds,
    cause: params.cause,
    recoveryTime: params.recoveryTime,
  };

  const event = createCampaignEvent(
    CampaignInstanceEventTypes.PILOT_INSTANCE_WOUNDED,
    payload,
    params.campaignId,
    undefined,
    { pilotId: params.instanceId, gameId: params.gameId },
    causedBy
  );

  if (emit) {
    getEventStore().append(event);
  }

  return event;
}

/**
 * Create and emit a pilot_instance_status_changed event.
 */
export function emitPilotInstanceStatusChanged(
  params: {
    instanceId: string;
    campaignId: string;
    previousStatus: CampaignPilotStatus;
    newStatus: CampaignPilotStatus;
    reason?: string;
  },
  causedBy?: ICausedBy,
  emit = true
): IBaseEvent<IPilotInstanceStatusChangedPayload> {
  const payload: IPilotInstanceStatusChangedPayload = {
    instanceId: params.instanceId,
    previousStatus: params.previousStatus,
    newStatus: params.newStatus,
    reason: params.reason,
  };

  const event = createCampaignEvent(
    CampaignInstanceEventTypes.PILOT_INSTANCE_STATUS_CHANGED,
    payload,
    params.campaignId,
    undefined,
    { pilotId: params.instanceId },
    causedBy
  );

  if (emit) {
    getEventStore().append(event);
  }

  return event;
}

/**
 * Create and emit a pilot_instance_kill_recorded event.
 */
export function emitPilotInstanceKillRecorded(
  params: {
    instanceId: string;
    campaignId: string;
    targetName: string;
    targetUnitId?: string;
    weaponUsed: string;
    totalKills: number;
    gameId?: string;
  },
  causedBy?: ICausedBy,
  emit = true
): IBaseEvent<IPilotInstanceKillRecordedPayload> {
  const payload: IPilotInstanceKillRecordedPayload = {
    instanceId: params.instanceId,
    targetName: params.targetName,
    targetUnitId: params.targetUnitId,
    weaponUsed: params.weaponUsed,
    totalKills: params.totalKills,
  };

  const event = createCampaignEvent(
    CampaignInstanceEventTypes.PILOT_INSTANCE_KILL_RECORDED,
    payload,
    params.campaignId,
    undefined,
    { pilotId: params.instanceId, gameId: params.gameId },
    causedBy
  );

  if (emit) {
    getEventStore().append(event);
  }

  return event;
}

/**
 * Create and emit a pilot_instance_mission_completed event.
 */
export function emitPilotInstanceMissionCompleted(
  params: {
    instanceId: string;
    campaignId: string;
    missionId: string;
    missionName: string;
    outcome: 'victory' | 'defeat' | 'draw';
    kills: number;
    xpEarned: number;
    totalMissions: number;
  },
  emit = true
): IBaseEvent<IPilotInstanceMissionCompletedPayload> {
  const payload: IPilotInstanceMissionCompletedPayload = {
    instanceId: params.instanceId,
    missionId: params.missionId,
    missionName: params.missionName,
    outcome: params.outcome,
    kills: params.kills,
    xpEarned: params.xpEarned,
    totalMissions: params.totalMissions,
  };

  const event = createCampaignEvent(
    CampaignInstanceEventTypes.PILOT_INSTANCE_MISSION_COMPLETED,
    payload,
    params.campaignId,
    params.missionId,
    { pilotId: params.instanceId }
  );

  if (emit) {
    getEventStore().append(event);
  }

  return event;
}

/**
 * Create and emit a pilot_instance_deceased event.
 */
export function emitPilotInstanceDeceased(
  params: {
    instanceId: string;
    campaignId: string;
    pilotName: string;
    cause: string;
    unitInstanceId?: string;
    unitName?: string;
    totalKills: number;
    totalMissions: number;
    gameId?: string;
  },
  causedBy?: ICausedBy,
  emit = true
): IBaseEvent<IPilotInstanceDeceasedPayload> {
  const payload: IPilotInstanceDeceasedPayload = {
    instanceId: params.instanceId,
    pilotName: params.pilotName,
    cause: params.cause,
    unitInstanceId: params.unitInstanceId,
    unitName: params.unitName,
    totalKills: params.totalKills,
    totalMissions: params.totalMissions,
  };

  const event = createCampaignEvent(
    CampaignInstanceEventTypes.PILOT_INSTANCE_DECEASED,
    payload,
    params.campaignId,
    undefined,
    { pilotId: params.instanceId, gameId: params.gameId },
    causedBy
  );

  if (emit) {
    getEventStore().append(event);
  }

  return event;
}
