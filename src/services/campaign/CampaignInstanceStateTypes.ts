import type {
  ICampaignPilotInstance,
  ICampaignUnitInstance,
  IUnitDamageState,
} from '../../types/campaign/CampaignInstanceInterfaces';
import type { ICausedBy } from '../../types/events';

export interface IApplyDamageOptions {
  damageSource?: string;
  attackerUnitId?: string;
  gameId?: string;
  causedBy?: ICausedBy;
}

export interface IApplyDamageResult {
  readonly instance: ICampaignUnitInstance;
  readonly previousDamagePercentage: number;
  readonly newDamagePercentage: number;
  readonly statusChanged: boolean;
  readonly destroyed: boolean;
  readonly eventId: string;
}

export type IXPAwardSource =
  | 'mission_participation'
  | 'kill'
  | 'victory'
  | 'objective'
  | 'survival'
  | 'other';

export interface IAwardXPOptions {
  details?: string;
  gameId?: string;
  causedBy?: ICausedBy;
}

export interface IApplyWoundsOptions {
  gameId?: string;
  causedBy?: ICausedBy;
}

export interface IApplyWoundsResult {
  readonly instance: ICampaignPilotInstance;
  readonly previousWounds: number;
  readonly totalWounds: number;
  readonly statusChanged: boolean;
  readonly deceased: boolean;
  readonly eventId: string;
}

export interface IRecordKillOptions {
  targetUnitId?: string;
  gameId?: string;
  causedBy?: ICausedBy;
}

export interface ICompleteMissionOptions {
  survivedCritical?: boolean;
  optionalObjectivesCompleted?: number;
}

export interface IMissionCompletionResult {
  readonly instance: ICampaignPilotInstance;
  readonly xpEarned: number;
  readonly eventIds: readonly string[];
}

export interface IAssignPilotResult {
  pilot: ICampaignPilotInstance;
  unit: ICampaignUnitInstance;
}

export type IUnassignReason =
  | 'manual'
  | 'pilot_wounded'
  | 'pilot_kia'
  | 'unit_destroyed';

export type IUnassignPilot = (
  pilotInstanceId: string,
  reason?: IUnassignReason,
) => Promise<ICampaignPilotInstance>;

export function calculateRecoveryTime(wounds: number): number {
  return wounds * 7;
}

export type { ICampaignPilotInstance, ICampaignUnitInstance, IUnitDamageState };
