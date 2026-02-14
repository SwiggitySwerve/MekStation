import type { IUnitDamageState } from '@/types/campaign/CampaignInstanceInterfaces';
import type { CampaignUnitStatus } from '@/types/campaign/CampaignInterfaces';

import { getEventStore } from '@/services/events';
import {
  CampaignInstanceEventTypes,
  type IBaseEvent,
  type ICausedBy,
  type IUnitInstanceCreatedPayload,
  type IUnitInstanceDamageAppliedPayload,
  type IUnitInstanceDestroyedPayload,
  type IUnitInstancePilotAssignedPayload,
  type IUnitInstancePilotUnassignedPayload,
  type IUnitInstanceRepairCompletedPayload,
  type IUnitInstanceRepairStartedPayload,
  type IUnitInstanceStatusChangedPayload,
} from '@/types/events';

import { createCampaignEvent } from './eventFactory';

function appendWhenEnabled<T>(event: IBaseEvent<T>, emit: boolean): void {
  if (emit) {
    getEventStore().append(event);
  }
}

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
  emit = true,
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
    { unitId: params.instanceId },
  );

  appendWhenEnabled(event, emit);
  return event;
}

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
  emit = true,
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
    causedBy,
  );

  appendWhenEnabled(event, emit);
  return event;
}

export function emitUnitInstanceStatusChanged(
  params: {
    instanceId: string;
    campaignId: string;
    previousStatus: CampaignUnitStatus;
    newStatus: CampaignUnitStatus;
    reason?: string;
  },
  causedBy?: ICausedBy,
  emit = true,
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
    causedBy,
  );

  appendWhenEnabled(event, emit);
  return event;
}

export function emitUnitInstancePilotAssigned(
  params: {
    unitInstanceId: string;
    pilotInstanceId: string;
    pilotName: string;
    campaignId: string;
    previousPilotInstanceId?: string;
  },
  emit = true,
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
    { unitId: params.unitInstanceId, pilotId: params.pilotInstanceId },
  );

  appendWhenEnabled(event, emit);
  return event;
}

export function emitUnitInstancePilotUnassigned(
  params: {
    unitInstanceId: string;
    pilotInstanceId: string;
    pilotName: string;
    campaignId: string;
    reason?: 'manual' | 'pilot_wounded' | 'pilot_kia' | 'unit_destroyed';
  },
  emit = true,
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
    { unitId: params.unitInstanceId, pilotId: params.pilotInstanceId },
  );

  appendWhenEnabled(event, emit);
  return event;
}

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
  emit = true,
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
    causedBy,
  );

  appendWhenEnabled(event, emit);
  return event;
}

export function emitUnitInstanceRepairStarted(
  params: {
    instanceId: string;
    campaignId: string;
    estimatedCost: number;
    estimatedTime: number;
    repairItems: readonly string[];
  },
  emit = true,
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
    { unitId: params.instanceId },
  );

  appendWhenEnabled(event, emit);
  return event;
}

export function emitUnitInstanceRepairCompleted(
  params: {
    instanceId: string;
    campaignId: string;
    actualCost: number;
    actualTime: number;
    newStatus: CampaignUnitStatus;
  },
  causedBy?: ICausedBy,
  emit = true,
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
    causedBy,
  );

  appendWhenEnabled(event, emit);
  return event;
}
