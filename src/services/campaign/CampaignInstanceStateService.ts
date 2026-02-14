import type {
  ICampaignPilotInstance,
  ICampaignUnitInstance,
} from '../../types/campaign/CampaignInstanceInterfaces';
import type {
  IApplyDamageOptions,
  IApplyDamageResult,
  IApplyWoundsOptions,
  IApplyWoundsResult,
  IAssignPilotResult,
  IAwardXPOptions,
  ICompleteMissionOptions,
  IMissionCompletionResult,
  IRecordKillOptions,
  IUnitDamageState,
  IUnassignReason,
  IXPAwardSource,
} from './CampaignInstanceStateTypes';

import {
  createSingleton,
  type SingletonFactory,
} from '../core/createSingleton';
import {
  assignPilotToUnit,
  unassignPilot,
} from './CampaignInstanceAssignmentOperations';
import {
  applyWounds,
  awardXP,
  completeMission,
  improveSkill,
  recordKill,
} from './CampaignInstancePilotOperations';
import {
  applyDamage,
  completeRepair,
  startRepair,
} from './CampaignInstanceUnitOperations';

export type {
  IApplyDamageResult,
  IApplyWoundsResult,
  IMissionCompletionResult,
} from './CampaignInstanceStateTypes';

export interface ICampaignInstanceStateService {
  applyDamage(
    instanceId: string,
    newDamageState: IUnitDamageState,
    options?: IApplyDamageOptions,
  ): Promise<IApplyDamageResult>;

  startRepair(
    instanceId: string,
    repairItems: readonly string[],
    estimatedCost: number,
    estimatedTime: number,
  ): Promise<ICampaignUnitInstance>;

  completeRepair(
    instanceId: string,
    actualCost: number,
    actualTime: number,
    newDamageState: IUnitDamageState,
  ): Promise<ICampaignUnitInstance>;

  awardXP(
    instanceId: string,
    xpAmount: number,
    source: IXPAwardSource,
    options?: IAwardXPOptions,
  ): Promise<ICampaignPilotInstance>;

  applyWounds(
    instanceId: string,
    woundsReceived: number,
    cause: string,
    options?: IApplyWoundsOptions,
  ): Promise<IApplyWoundsResult>;

  recordKill(
    instanceId: string,
    targetName: string,
    weaponUsed: string,
    options?: IRecordKillOptions,
  ): Promise<ICampaignPilotInstance>;

  improveSkill(
    instanceId: string,
    skill: 'gunnery' | 'piloting',
  ): Promise<ICampaignPilotInstance>;

  completeMission(
    instanceId: string,
    missionId: string,
    missionName: string,
    outcome: 'victory' | 'defeat' | 'draw',
    kills: number,
    options?: ICompleteMissionOptions,
  ): Promise<IMissionCompletionResult>;

  assignPilotToUnit(
    pilotInstanceId: string,
    unitInstanceId: string,
  ): Promise<IAssignPilotResult>;

  unassignPilot(
    pilotInstanceId: string,
    reason?: IUnassignReason,
  ): Promise<ICampaignPilotInstance>;
}

export class CampaignInstanceStateService implements ICampaignInstanceStateService {
  async applyDamage(
    instanceId: string,
    newDamageState: IUnitDamageState,
    options: IApplyDamageOptions = {},
  ): Promise<IApplyDamageResult> {
    return applyDamage(
      instanceId,
      newDamageState,
      (pilotId, reason) => this.unassignPilot(pilotId, reason),
      options,
    );
  }

  async startRepair(
    instanceId: string,
    repairItems: readonly string[],
    estimatedCost: number,
    estimatedTime: number,
  ): Promise<ICampaignUnitInstance> {
    return startRepair(instanceId, repairItems, estimatedCost, estimatedTime);
  }

  async completeRepair(
    instanceId: string,
    actualCost: number,
    actualTime: number,
    newDamageState: IUnitDamageState,
  ): Promise<ICampaignUnitInstance> {
    return completeRepair(instanceId, actualCost, actualTime, newDamageState);
  }

  async awardXP(
    instanceId: string,
    xpAmount: number,
    source: IXPAwardSource,
    options: IAwardXPOptions = {},
  ): Promise<ICampaignPilotInstance> {
    return awardXP(instanceId, xpAmount, source, options);
  }

  async applyWounds(
    instanceId: string,
    woundsReceived: number,
    cause: string,
    options: IApplyWoundsOptions = {},
  ): Promise<IApplyWoundsResult> {
    return applyWounds(instanceId, woundsReceived, cause, options);
  }

  async recordKill(
    instanceId: string,
    targetName: string,
    weaponUsed: string,
    options: IRecordKillOptions = {},
  ): Promise<ICampaignPilotInstance> {
    return recordKill(instanceId, targetName, weaponUsed, options);
  }

  async improveSkill(
    instanceId: string,
    skill: 'gunnery' | 'piloting',
  ): Promise<ICampaignPilotInstance> {
    return improveSkill(instanceId, skill);
  }

  async completeMission(
    instanceId: string,
    missionId: string,
    missionName: string,
    outcome: 'victory' | 'defeat' | 'draw',
    kills: number,
    options: ICompleteMissionOptions = {},
  ): Promise<IMissionCompletionResult> {
    return completeMission(
      instanceId,
      missionId,
      missionName,
      outcome,
      kills,
      options,
    );
  }

  async assignPilotToUnit(
    pilotInstanceId: string,
    unitInstanceId: string,
  ): Promise<IAssignPilotResult> {
    return assignPilotToUnit(pilotInstanceId, unitInstanceId);
  }

  async unassignPilot(
    pilotInstanceId: string,
    reason: IUnassignReason = 'manual',
  ): Promise<ICampaignPilotInstance> {
    return unassignPilot(pilotInstanceId, reason);
  }
}

const campaignInstanceStateServiceFactory: SingletonFactory<CampaignInstanceStateService> =
  createSingleton(
    (): CampaignInstanceStateService => new CampaignInstanceStateService(),
  );

export function getCampaignInstanceStateService(): CampaignInstanceStateService {
  return campaignInstanceStateServiceFactory.get();
}

export function resetCampaignInstanceStateService(): void {
  campaignInstanceStateServiceFactory.reset();
}

export function _resetCampaignInstanceStateService(): void {
  campaignInstanceStateServiceFactory.reset();
}
