import type {
  IPilot,
  IPilotAbilityDesignation,
  ICreatePilotOptions,
  IPilotIdentity,
  IPilotStatblock,
  ISPADesignation,
  PilotExperienceLevel,
} from '@/types/pilot';

import type { IPilotOperationResult } from './PilotRepository';

export interface IPilotService {
  createPilot(options: ICreatePilotOptions): IPilotOperationResult;
  createFromTemplate(
    level: PilotExperienceLevel,
    identity: IPilotIdentity,
  ): IPilotOperationResult;
  createRandom(
    identity: IPilotIdentity,
    randomFn?: () => number,
  ): IPilotOperationResult;
  createStatblock(statblock: IPilotStatblock): IPilot;
  updatePilot(id: string, updates: Partial<IPilot>): IPilotOperationResult;
  deletePilot(id: string): IPilotOperationResult;
  getPilot(id: string): IPilot | null;
  listPilots(): readonly IPilot[];
  listActivePilots(): readonly IPilot[];
  improveGunnery(pilotId: string): IPilotOperationResult;
  improvePiloting(pilotId: string): IPilotOperationResult;
  canImproveGunnery(pilot: IPilot): {
    canImprove: boolean;
    cost: number | null;
  };
  canImprovePiloting(pilot: IPilot): {
    canImprove: boolean;
    cost: number | null;
  };
  awardMissionXp(
    pilotId: string,
    outcome: 'victory' | 'defeat' | 'draw',
    kills: number,
    bonuses?: { firstBlood?: boolean; higherBVOpponent?: boolean },
  ): IPilotOperationResult;
  applyWound(pilotId: string): IPilotOperationResult;
  healWounds(pilotId: string): IPilotOperationResult;
  purchaseSPA(
    pilotId: string,
    spaId: string,
    options?: {
      designation?: IPilotAbilityDesignation;
      isCreationFlow?: boolean;
    },
  ): IPilotOperationResult;
  removeSPA(
    pilotId: string,
    spaId: string,
    options?: { isCreationFlow?: boolean },
  ): IPilotOperationResult;
  getPilotDesignation(
    pilot: IPilot,
    spaId: string,
  ): ISPADesignation | undefined;
  validatePilot(pilot: Partial<IPilot>): string[];
}
