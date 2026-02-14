import type {
  IAssignPilotResult,
  ICampaignPilotInstance,
  IUnassignReason,
} from './CampaignInstanceStateTypes';

import {
  emitUnitInstancePilotAssigned,
  emitUnitInstancePilotUnassigned,
} from '../../utils/events/campaignInstanceEvents';
import { getCampaignInstanceService } from '../persistence/CampaignInstanceService';

export async function assignPilotToUnit(
  pilotInstanceId: string,
  unitInstanceId: string,
): Promise<IAssignPilotResult> {
  const service = getCampaignInstanceService();

  const pilot = await service.getPilotInstance(pilotInstanceId);
  const unit = await service.getUnitInstance(unitInstanceId);

  if (!pilot) {
    throw new Error(`Pilot instance not found: ${pilotInstanceId}`);
  }
  if (!unit) {
    throw new Error(`Unit instance not found: ${unitInstanceId}`);
  }

  const previousPilotId = unit.assignedPilotInstanceId;

  if (previousPilotId && previousPilotId !== pilotInstanceId) {
    const previousPilot = await service.getPilotInstance(previousPilotId);
    if (previousPilot) {
      emitUnitInstancePilotUnassigned({
        unitInstanceId,
        pilotInstanceId: previousPilotId,
        pilotName: previousPilot.pilotName,
        campaignId: unit.campaignId,
        reason: 'manual',
      });
    }
  }

  await service.assignPilotToUnit(pilotInstanceId, unitInstanceId);

  emitUnitInstancePilotAssigned({
    unitInstanceId,
    pilotInstanceId,
    pilotName: pilot.pilotName,
    campaignId: unit.campaignId,
    previousPilotInstanceId: previousPilotId,
  });

  const updatedPilot = (await service.getPilotInstance(pilotInstanceId))!;
  const updatedUnit = (await service.getUnitInstance(unitInstanceId))!;

  return { pilot: updatedPilot, unit: updatedUnit };
}

export async function unassignPilot(
  pilotInstanceId: string,
  reason: IUnassignReason = 'manual',
): Promise<ICampaignPilotInstance> {
  const service = getCampaignInstanceService();
  const pilot = await service.getPilotInstance(pilotInstanceId);

  if (!pilot) {
    throw new Error(`Pilot instance not found: ${pilotInstanceId}`);
  }

  if (!pilot.assignedUnitInstanceId) {
    return pilot;
  }

  const unitId = pilot.assignedUnitInstanceId;
  await service.unassignPilot(pilotInstanceId);

  emitUnitInstancePilotUnassigned({
    unitInstanceId: unitId,
    pilotInstanceId,
    pilotName: pilot.pilotName,
    campaignId: pilot.campaignId,
    reason,
  });

  return (await service.getPilotInstance(pilotInstanceId))!;
}
