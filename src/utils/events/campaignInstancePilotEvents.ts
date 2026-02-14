import type { CampaignPilotStatus } from '@/types/campaign/CampaignInterfaces';
import type { IPilotSkills } from '@/types/pilot/PilotInterfaces';

import { getEventStore } from '@/services/events';
import {
  CampaignInstanceEventTypes,
  type IBaseEvent,
  type ICausedBy,
  type IPilotInstanceCreatedPayload,
  type IPilotInstanceDeceasedPayload,
  type IPilotInstanceKillRecordedPayload,
  type IPilotInstanceMissionCompletedPayload,
  type IPilotInstanceSkillImprovedPayload,
  type IPilotInstanceStatusChangedPayload,
  type IPilotInstanceWoundedPayload,
  type IPilotInstanceXPGainedPayload,
} from '@/types/events';

import { createCampaignEvent } from './eventFactory';

function appendWhenEnabled<T>(event: IBaseEvent<T>, emit: boolean): void {
  if (emit) {
    getEventStore().append(event);
  }
}

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
  emit = true,
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
    { pilotId: params.instanceId },
  );

  appendWhenEnabled(event, emit);
  return event;
}

export function emitPilotInstanceXPGained(
  params: {
    instanceId: string;
    campaignId: string;
    xpGained: number;
    totalXP: number;
    source:
      | 'mission_participation'
      | 'kill'
      | 'victory'
      | 'objective'
      | 'survival'
      | 'other';
    details?: string;
    gameId?: string;
  },
  causedBy?: ICausedBy,
  emit = true,
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
    causedBy,
  );

  appendWhenEnabled(event, emit);
  return event;
}

export function emitPilotInstanceSkillImproved(
  params: {
    instanceId: string;
    campaignId: string;
    skill: 'gunnery' | 'piloting';
    previousValue: number;
    newValue: number;
    xpSpent: number;
  },
  emit = true,
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
    { pilotId: params.instanceId },
  );

  appendWhenEnabled(event, emit);
  return event;
}

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
  emit = true,
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
    causedBy,
  );

  appendWhenEnabled(event, emit);
  return event;
}

export function emitPilotInstanceStatusChanged(
  params: {
    instanceId: string;
    campaignId: string;
    previousStatus: CampaignPilotStatus;
    newStatus: CampaignPilotStatus;
    reason?: string;
  },
  causedBy?: ICausedBy,
  emit = true,
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
    causedBy,
  );

  appendWhenEnabled(event, emit);
  return event;
}

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
  emit = true,
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
    causedBy,
  );

  appendWhenEnabled(event, emit);
  return event;
}

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
  emit = true,
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
    { pilotId: params.instanceId },
  );

  appendWhenEnabled(event, emit);
  return event;
}

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
  emit = true,
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
    causedBy,
  );

  appendWhenEnabled(event, emit);
  return event;
}
