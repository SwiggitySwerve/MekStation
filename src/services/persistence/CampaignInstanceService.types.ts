import type {
  ICampaignPilotInstance,
  ICampaignUnitInstance,
  ICreatePilotInstanceFromStatblockInput,
  ICreatePilotInstanceFromVaultInput,
  ICreateUnitInstanceInput,
  IUnitDamageState,
} from '@/types/campaign/CampaignInstanceInterfaces';
import type {
  CampaignPilotStatus,
  CampaignUnitStatus,
} from '@/types/campaign/CampaignInterfaces';
import type { IPilotSkills } from '@/types/pilot/PilotInterfaces';

export interface IInstanceQueryOptions {
  readonly campaignId?: string;
  readonly status?: CampaignUnitStatus | CampaignPilotStatus;
  readonly forceId?: string;
  readonly availableOnly?: boolean;
}

export interface IUpdateUnitInstanceInput {
  readonly status?: CampaignUnitStatus;
  readonly damageState?: IUnitDamageState;
  readonly assignedPilotInstanceId?: string | null;
  readonly forceId?: string | null;
  readonly forceSlot?: number | null;
  readonly totalKills?: number;
  readonly missionsParticipated?: number;
  readonly estimatedRepairCost?: number;
  readonly estimatedRepairTime?: number;
  readonly notes?: string;
}

export interface IUpdatePilotInstanceInput {
  readonly status?: CampaignPilotStatus;
  readonly currentSkills?: IPilotSkills;
  readonly wounds?: number;
  readonly currentXP?: number;
  readonly campaignXPEarned?: number;
  readonly killCount?: number;
  readonly missionsParticipated?: number;
  readonly assignedUnitInstanceId?: string | null;
  readonly recoveryTime?: number;
  readonly notes?: string;
}

export interface ICampaignInstanceService {
  createUnitInstance(
    input: ICreateUnitInstanceInput,
    unitData: {
      version: number;
      name: string;
      chassis: string;
      variant: string;
      damageState?: IUnitDamageState;
    },
  ): Promise<ICampaignUnitInstance>;
  getUnitInstance(id: string): Promise<ICampaignUnitInstance | undefined>;
  updateUnitInstance(
    id: string,
    updates: IUpdateUnitInstanceInput,
  ): Promise<ICampaignUnitInstance>;
  deleteUnitInstance(id: string): Promise<void>;
  listUnitInstances(
    options?: IInstanceQueryOptions,
  ): Promise<ICampaignUnitInstance[]>;

  createPilotInstanceFromVault(
    input: ICreatePilotInstanceFromVaultInput,
    pilotData: {
      name: string;
      callsign?: string;
      skills: IPilotSkills;
    },
  ): Promise<ICampaignPilotInstance>;
  createPilotInstanceFromStatblock(
    input: ICreatePilotInstanceFromStatblockInput,
  ): Promise<ICampaignPilotInstance>;
  getPilotInstance(id: string): Promise<ICampaignPilotInstance | undefined>;
  updatePilotInstance(
    id: string,
    updates: IUpdatePilotInstanceInput,
  ): Promise<ICampaignPilotInstance>;
  deletePilotInstance(id: string): Promise<void>;
  listPilotInstances(
    options?: IInstanceQueryOptions,
  ): Promise<ICampaignPilotInstance[]>;

  assignPilotToUnit(
    pilotInstanceId: string,
    unitInstanceId: string,
  ): Promise<void>;
  unassignPilot(pilotInstanceId: string): Promise<void>;
  deleteInstancesForCampaign(campaignId: string): Promise<void>;
}
