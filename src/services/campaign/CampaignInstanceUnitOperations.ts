import type {
  IApplyDamageOptions,
  IApplyDamageResult,
  ICampaignUnitInstance,
  IUnitDamageState,
  IUnassignPilot,
} from './CampaignInstanceStateTypes';

import {
  calculateDamagePercentage,
  determineUnitStatus,
} from '../../types/campaign/CampaignInstanceInterfaces';
import {
  CampaignPilotStatus,
  CampaignUnitStatus,
} from '../../types/campaign/CampaignInterfaces';
import {
  emitPilotInstanceDeceased,
  emitUnitInstanceDamageApplied,
  emitUnitInstanceDestroyed,
  emitUnitInstanceRepairCompleted,
  emitUnitInstanceRepairStarted,
  emitUnitInstanceStatusChanged,
} from '../../utils/events/campaignInstanceEvents';
import { getCampaignInstanceService } from '../persistence/CampaignInstanceService';

export async function applyDamage(
  instanceId: string,
  newDamageState: IUnitDamageState,
  unassignPilot: IUnassignPilot,
  options: IApplyDamageOptions = {},
): Promise<IApplyDamageResult> {
  const service = getCampaignInstanceService();
  const instance = await service.getUnitInstance(instanceId);

  if (!instance) {
    throw new Error(`Unit instance not found: ${instanceId}`);
  }

  const previousDamagePercentage = calculateDamagePercentage(
    instance.damageState,
  );
  const newDamagePercentage = calculateDamagePercentage(newDamageState);
  const damagePercentageChange = newDamagePercentage - previousDamagePercentage;

  const damageEvent = emitUnitInstanceDamageApplied(
    {
      instanceId,
      campaignId: instance.campaignId,
      previousDamageState: instance.damageState,
      newDamageState,
      damagePercentageChange,
      damageSource: options.damageSource,
      attackerUnitId: options.attackerUnitId,
      gameId: options.gameId,
    },
    options.causedBy,
  );

  const newStatus = determineUnitStatus(newDamageState);
  const statusChanged = newStatus !== instance.status;
  const destroyed = newStatus === CampaignUnitStatus.Destroyed;

  let updated = await service.updateUnitInstance(instanceId, {
    damageState: newDamageState,
    status: newStatus,
  });

  if (statusChanged) {
    emitUnitInstanceStatusChanged(
      {
        instanceId,
        campaignId: instance.campaignId,
        previousStatus: instance.status,
        newStatus,
        reason: destroyed ? 'Structure destroyed' : 'Damage received',
      },
      { eventId: damageEvent.id, relationship: 'triggered' },
    );
  }

  if (destroyed) {
    let pilotFate: 'survived' | 'wounded' | 'kia' | undefined;

    if (instance.assignedPilotInstanceId) {
      const pilot = await service.getPilotInstance(
        instance.assignedPilotInstanceId,
      );
      if (pilot) {
        if (pilot.wounds >= 5) {
          pilotFate = 'kia';
        } else if (pilot.wounds >= 2) {
          pilotFate = 'wounded';
        } else {
          pilotFate = 'survived';
        }

        await unassignPilot(pilot.id, 'unit_destroyed');

        if (pilotFate === 'kia') {
          await service.updatePilotInstance(pilot.id, {
            status: CampaignPilotStatus.KIA,
          });
          emitPilotInstanceDeceased(
            {
              instanceId: pilot.id,
              campaignId: pilot.campaignId,
              pilotName: pilot.pilotName,
              cause: 'Unit destroyed',
              unitInstanceId: instanceId,
              unitName: instance.unitName,
              totalKills: pilot.killCount,
              totalMissions: pilot.missionsParticipated,
              gameId: options.gameId,
            },
            { eventId: damageEvent.id, relationship: 'triggered' },
          );
        }
      }
    }

    emitUnitInstanceDestroyed(
      {
        instanceId,
        campaignId: instance.campaignId,
        unitName: instance.unitName,
        cause: options.damageSource ?? 'Combat damage',
        pilotInstanceId: instance.assignedPilotInstanceId,
        pilotFate,
        gameId: options.gameId,
      },
      { eventId: damageEvent.id, relationship: 'triggered' },
    );

    updated = (await service.getUnitInstance(instanceId))!;
  }

  return {
    instance: updated,
    previousDamagePercentage,
    newDamagePercentage,
    statusChanged,
    destroyed,
    eventId: damageEvent.id,
  };
}

export async function startRepair(
  instanceId: string,
  repairItems: readonly string[],
  estimatedCost: number,
  estimatedTime: number,
): Promise<ICampaignUnitInstance> {
  const service = getCampaignInstanceService();
  const instance = await service.getUnitInstance(instanceId);

  if (!instance) {
    throw new Error(`Unit instance not found: ${instanceId}`);
  }

  if (instance.status === CampaignUnitStatus.Destroyed) {
    throw new Error('Cannot repair a destroyed unit');
  }

  const updated = await service.updateUnitInstance(instanceId, {
    status: CampaignUnitStatus.Repairing,
    estimatedRepairCost: estimatedCost,
    estimatedRepairTime: estimatedTime,
  });

  const repairEvent = emitUnitInstanceRepairStarted({
    instanceId,
    campaignId: instance.campaignId,
    estimatedCost,
    estimatedTime,
    repairItems,
  });

  emitUnitInstanceStatusChanged(
    {
      instanceId,
      campaignId: instance.campaignId,
      previousStatus: instance.status,
      newStatus: CampaignUnitStatus.Repairing,
      reason: 'Repair initiated',
    },
    { eventId: repairEvent.id, relationship: 'triggered' },
  );

  return updated;
}

export async function completeRepair(
  instanceId: string,
  actualCost: number,
  actualTime: number,
  newDamageState: IUnitDamageState,
): Promise<ICampaignUnitInstance> {
  const service = getCampaignInstanceService();
  const instance = await service.getUnitInstance(instanceId);

  if (!instance) {
    throw new Error(`Unit instance not found: ${instanceId}`);
  }

  if (instance.status !== CampaignUnitStatus.Repairing) {
    throw new Error('Unit is not currently being repaired');
  }

  const newStatus = determineUnitStatus(newDamageState);
  const updated = await service.updateUnitInstance(instanceId, {
    status: newStatus,
    damageState: newDamageState,
    estimatedRepairCost: 0,
    estimatedRepairTime: 0,
  });

  const repairEvent = emitUnitInstanceRepairCompleted({
    instanceId,
    campaignId: instance.campaignId,
    actualCost,
    actualTime,
    newStatus,
  });

  emitUnitInstanceStatusChanged(
    {
      instanceId,
      campaignId: instance.campaignId,
      previousStatus: CampaignUnitStatus.Repairing,
      newStatus,
      reason: 'Repair completed',
    },
    { eventId: repairEvent.id, relationship: 'triggered' },
  );

  return updated;
}
