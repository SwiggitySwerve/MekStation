import type { IPilotSkills } from '../../types/pilot/PilotInterfaces';

import {
  CampaignPilotStatus,
  SKILL_IMPROVEMENT_COSTS,
  XP_REWARDS,
} from '../../types/campaign/CampaignInterfaces';
import {
  emitPilotInstanceDeceased,
  emitPilotInstanceKillRecorded,
  emitPilotInstanceMissionCompleted,
  emitPilotInstanceSkillImproved,
  emitPilotInstanceStatusChanged,
  emitPilotInstanceWounded,
  emitPilotInstanceXPGained,
  emitUnitInstancePilotUnassigned,
} from '../../utils/events/campaignInstanceEvents';
import { getCampaignInstanceService } from '../persistence/CampaignInstanceService';
import {
  calculateRecoveryTime,
  type IAwardXPOptions,
  type IApplyWoundsOptions,
  type IApplyWoundsResult,
  type ICampaignPilotInstance,
  type ICompleteMissionOptions,
  type IMissionCompletionResult,
  type IRecordKillOptions,
  type IXPAwardSource,
} from './CampaignInstanceStateTypes';

export async function awardXP(
  instanceId: string,
  xpAmount: number,
  source: IXPAwardSource,
  options: IAwardXPOptions = {},
): Promise<ICampaignPilotInstance> {
  const service = getCampaignInstanceService();
  const instance = await service.getPilotInstance(instanceId);

  if (!instance) {
    throw new Error(`Pilot instance not found: ${instanceId}`);
  }

  const newXP = instance.currentXP + xpAmount;
  const newCampaignXP = instance.campaignXPEarned + xpAmount;

  const updated = await service.updatePilotInstance(instanceId, {
    currentXP: newXP,
    campaignXPEarned: newCampaignXP,
  });

  emitPilotInstanceXPGained(
    {
      instanceId,
      campaignId: instance.campaignId,
      xpGained: xpAmount,
      totalXP: newXP,
      source,
      details: options.details,
      gameId: options.gameId,
    },
    options.causedBy,
  );

  return updated;
}

export async function applyWounds(
  instanceId: string,
  woundsReceived: number,
  cause: string,
  options: IApplyWoundsOptions = {},
): Promise<IApplyWoundsResult> {
  const service = getCampaignInstanceService();
  const instance = await service.getPilotInstance(instanceId);

  if (!instance) {
    throw new Error(`Pilot instance not found: ${instanceId}`);
  }

  const previousWounds = instance.wounds;
  const totalWounds = previousWounds + woundsReceived;
  const deceased = totalWounds >= 6;
  const recoveryTime = deceased ? 0 : calculateRecoveryTime(totalWounds);

  let newStatus: CampaignPilotStatus;
  if (deceased) {
    newStatus = CampaignPilotStatus.KIA;
  } else if (totalWounds >= 4) {
    newStatus = CampaignPilotStatus.Critical;
  } else if (totalWounds >= 1) {
    newStatus = CampaignPilotStatus.Wounded;
  } else {
    newStatus = CampaignPilotStatus.Active;
  }

  const statusChanged = newStatus !== instance.status;

  let updated = await service.updatePilotInstance(instanceId, {
    wounds: totalWounds,
    status: newStatus,
    recoveryTime,
  });

  const woundEvent = emitPilotInstanceWounded(
    {
      instanceId,
      campaignId: instance.campaignId,
      woundsReceived,
      totalWounds,
      cause,
      recoveryTime,
      gameId: options.gameId,
    },
    options.causedBy,
  );

  if (statusChanged) {
    emitPilotInstanceStatusChanged(
      {
        instanceId,
        campaignId: instance.campaignId,
        previousStatus: instance.status,
        newStatus,
        reason: deceased ? 'Fatal wounds' : 'Wounds received',
      },
      { eventId: woundEvent.id, relationship: 'triggered' },
    );
  }

  if (deceased) {
    if (instance.assignedUnitInstanceId) {
      const unit = await service.getUnitInstance(
        instance.assignedUnitInstanceId,
      );
      if (unit) {
        await service.updateUnitInstance(unit.id, {
          assignedPilotInstanceId: null,
        });
        emitUnitInstancePilotUnassigned({
          unitInstanceId: unit.id,
          pilotInstanceId: instanceId,
          pilotName: instance.pilotName,
          campaignId: instance.campaignId,
          reason: 'pilot_kia',
        });
      }
    }

    emitPilotInstanceDeceased(
      {
        instanceId,
        campaignId: instance.campaignId,
        pilotName: instance.pilotName,
        cause,
        unitInstanceId: instance.assignedUnitInstanceId,
        totalKills: instance.killCount,
        totalMissions: instance.missionsParticipated,
        gameId: options.gameId,
      },
      { eventId: woundEvent.id, relationship: 'triggered' },
    );

    updated = (await service.getPilotInstance(instanceId))!;
  }

  return {
    instance: updated,
    previousWounds,
    totalWounds,
    statusChanged,
    deceased,
    eventId: woundEvent.id,
  };
}

export async function recordKill(
  instanceId: string,
  targetName: string,
  weaponUsed: string,
  options: IRecordKillOptions = {},
): Promise<ICampaignPilotInstance> {
  const service = getCampaignInstanceService();
  const instance = await service.getPilotInstance(instanceId);

  if (!instance) {
    throw new Error(`Pilot instance not found: ${instanceId}`);
  }

  const newKillCount = instance.killCount + 1;

  await service.updatePilotInstance(instanceId, {
    killCount: newKillCount,
  });

  const killEvent = emitPilotInstanceKillRecorded(
    {
      instanceId,
      campaignId: instance.campaignId,
      targetName,
      targetUnitId: options.targetUnitId,
      weaponUsed,
      totalKills: newKillCount,
      gameId: options.gameId,
    },
    options.causedBy,
  );

  await awardXP(instanceId, XP_REWARDS.KILL, 'kill', {
    details: `Destroyed ${targetName}`,
    gameId: options.gameId,
    causedBy: { eventId: killEvent.id, relationship: 'derived' },
  });

  return (await service.getPilotInstance(instanceId))!;
}

export async function improveSkill(
  instanceId: string,
  skill: 'gunnery' | 'piloting',
): Promise<ICampaignPilotInstance> {
  const service = getCampaignInstanceService();
  const instance = await service.getPilotInstance(instanceId);

  if (!instance) {
    throw new Error(`Pilot instance not found: ${instanceId}`);
  }

  const currentValue = instance.currentSkills[skill];
  const xpCost =
    skill === 'gunnery'
      ? SKILL_IMPROVEMENT_COSTS.GUNNERY_IMPROVEMENT
      : SKILL_IMPROVEMENT_COSTS.PILOTING_IMPROVEMENT;

  if (currentValue <= SKILL_IMPROVEMENT_COSTS.MIN_SKILL) {
    throw new Error(
      `${skill} is already at maximum (${SKILL_IMPROVEMENT_COSTS.MIN_SKILL})`,
    );
  }
  if (instance.currentXP < xpCost) {
    throw new Error(
      `Not enough XP. Need ${xpCost}, have ${instance.currentXP}`,
    );
  }

  const newValue = currentValue - 1;
  const newSkills: IPilotSkills = {
    ...instance.currentSkills,
    [skill]: newValue,
  };

  const updated = await service.updatePilotInstance(instanceId, {
    currentSkills: newSkills,
    currentXP: instance.currentXP - xpCost,
  });

  emitPilotInstanceSkillImproved({
    instanceId,
    campaignId: instance.campaignId,
    skill,
    previousValue: currentValue,
    newValue,
    xpSpent: xpCost,
  });

  return updated;
}

export async function completeMission(
  instanceId: string,
  missionId: string,
  missionName: string,
  outcome: 'victory' | 'defeat' | 'draw',
  kills: number,
  options: ICompleteMissionOptions = {},
): Promise<IMissionCompletionResult> {
  const service = getCampaignInstanceService();
  const instance = await service.getPilotInstance(instanceId);

  if (!instance) {
    throw new Error(`Pilot instance not found: ${instanceId}`);
  }

  const eventIds: string[] = [];

  let xpEarned = XP_REWARDS.MISSION_PARTICIPATION;
  if (outcome === 'victory') {
    xpEarned += XP_REWARDS.VICTORY_BONUS;
  }
  if (options.survivedCritical) {
    xpEarned += XP_REWARDS.SURVIVAL_BONUS;
  }
  if (options.optionalObjectivesCompleted) {
    xpEarned +=
      options.optionalObjectivesCompleted * XP_REWARDS.OPTIONAL_OBJECTIVE;
  }

  const newMissionCount = instance.missionsParticipated + 1;
  await service.updatePilotInstance(instanceId, {
    missionsParticipated: newMissionCount,
  });

  const missionEvent = emitPilotInstanceMissionCompleted({
    instanceId,
    campaignId: instance.campaignId,
    missionId,
    missionName,
    outcome,
    kills,
    xpEarned,
    totalMissions: newMissionCount,
  });
  eventIds.push(missionEvent.id);

  const xpUpdated = await awardXP(
    instanceId,
    xpEarned,
    'mission_participation',
    {
      details: `${missionName} - ${outcome}`,
      causedBy: { eventId: missionEvent.id, relationship: 'derived' },
    },
  );

  return {
    instance: xpUpdated,
    xpEarned,
    eventIds,
  };
}
