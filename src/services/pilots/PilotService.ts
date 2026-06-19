import { pickRandomSPA } from '@/lib/spa/random';
import {
  IPilot,
  IPilotAbilityDesignation,
  ICreatePilotOptions,
  IPilotIdentity,
  IPilotStatblock,
  ISPADesignation,
  PilotType,
  PilotStatus,
  PilotExperienceLevel,
  PILOT_TEMPLATES,
  getGunneryImprovementCost,
  getPilotingImprovementCost,
  isValidSkillValue,
  isValidWoundsValue,
  MIN_SKILL_VALUE,
  MAX_SKILL_VALUE,
  XP_AWARDS,
} from '@/types/pilot';

import type { IPilotService } from './PilotService.types';

import {
  createSingleton,
  type SingletonFactory,
} from '../core/createSingleton';
import {
  getPilotRepository,
  IPilotOperationResult,
  PilotErrorCode,
} from './PilotRepository';
import {
  getPilotSPADesignation,
  purchasePilotSPA,
  removePilotSPA,
} from './PilotService.spa';
export type { IPilotService } from './PilotService.types';
export class PilotService implements IPilotService {
  private repo = getPilotRepository();
  createPilot = (options: ICreatePilotOptions): IPilotOperationResult => {
    const errors = this.validateCreateOptions(options);
    if (errors.length > 0) {
      return {
        success: false,
        error: errors.join('; '),
        errorCode: PilotErrorCode.ValidationError,
      };
    }
    return this.repo.create(options);
  };
  createFromTemplate = (
    level: PilotExperienceLevel,
    identity: IPilotIdentity,
  ): IPilotOperationResult => {
    const template = PILOT_TEMPLATES[level];
    return this.repo.create({
      identity,
      type: PilotType.Persistent,
      skills: template.skills,
      startingXp: template.startingXp,
      rank: this.getRankForLevel(level),
    });
  };
  createRandom = (
    identity: IPilotIdentity,
    randomFn: () => number = Math.random,
  ): IPilotOperationResult => {
    const gunneryRoll = this.rollSkill();
    const pilotingRoll = this.rollSkill();
    const hasAbility = randomFn() < 0.2;
    const spa = hasAbility ? pickRandomSPA(randomFn) : null;
    const abilityIds = spa ? [spa.id] : undefined;
    return this.repo.create({
      identity,
      type: PilotType.Persistent,
      skills: { gunnery: gunneryRoll, piloting: pilotingRoll },
      startingXp: 0,
      abilityIds,
    });
  };
  createStatblock = (statblock: IPilotStatblock): IPilot => {
    const now = new Date().toISOString();
    return {
      id: `statblock-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      name: statblock.name,
      type: PilotType.Statblock,
      status: PilotStatus.Active,
      skills: {
        gunnery: statblock.gunnery,
        piloting: statblock.piloting,
      },
      wounds: 0,
      abilities: (statblock.abilityIds || []).map((id) => ({
        abilityId: id,
        acquiredDate: now,
      })),
      createdAt: now,
      updatedAt: now,
    };
  };
  updatePilot = (
    id: string,
    updates: Partial<IPilot>,
  ): IPilotOperationResult => {
    return this.repo.update(id, updates);
  };
  deletePilot = (id: string): IPilotOperationResult => {
    return this.repo.delete(id);
  };
  getPilot = (id: string): IPilot | null => {
    return this.repo.getById(id);
  };
  listPilots = (): readonly IPilot[] => {
    return this.repo.list();
  };
  listActivePilots = (): readonly IPilot[] => {
    return this.repo.listByStatus(PilotStatus.Active);
  };
  canImproveGunnery = (
    pilot: IPilot,
  ): {
    canImprove: boolean;
    cost: number | null;
  } => {
    const cost = getGunneryImprovementCost(pilot.skills.gunnery);
    if (cost === null) {
      return { canImprove: false, cost: null };
    }
    const hasXp = pilot.career && pilot.career.xp >= cost;
    return { canImprove: hasXp || false, cost };
  };
  canImprovePiloting = (
    pilot: IPilot,
  ): {
    canImprove: boolean;
    cost: number | null;
  } => {
    const cost = getPilotingImprovementCost(pilot.skills.piloting);
    if (cost === null) {
      return { canImprove: false, cost: null };
    }
    const hasXp = pilot.career && pilot.career.xp >= cost;
    return { canImprove: hasXp || false, cost };
  };
  improveGunnery = (pilotId: string): IPilotOperationResult => {
    const pilot = this.repo.getById(pilotId);
    if (!pilot) {
      return {
        success: false,
        error: `Pilot ${pilotId} not found`,
        errorCode: PilotErrorCode.NotFound,
      };
    }
    const { canImprove, cost } = this.canImproveGunnery(pilot);
    if (!canImprove || cost === null) {
      return {
        success: false,
        error:
          cost === null
            ? 'Gunnery is already at maximum (1)'
            : `Insufficient XP. Need ${cost}, have ${pilot.career?.xp || 0}`,
        errorCode:
          cost === null
            ? PilotErrorCode.ValidationError
            : PilotErrorCode.InsufficientXp,
      };
    }
    const spendResult = this.repo.spendXp(pilotId, cost);
    if (!spendResult.success) {
      return spendResult;
    }
    return this.repo.update(pilotId, {
      skills: {
        gunnery: pilot.skills.gunnery - 1,
        piloting: pilot.skills.piloting,
      },
    });
  };
  improvePiloting = (pilotId: string): IPilotOperationResult => {
    const pilot = this.repo.getById(pilotId);
    if (!pilot) {
      return {
        success: false,
        error: `Pilot ${pilotId} not found`,
        errorCode: PilotErrorCode.NotFound,
      };
    }
    const { canImprove, cost } = this.canImprovePiloting(pilot);
    if (!canImprove || cost === null) {
      return {
        success: false,
        error:
          cost === null
            ? 'Piloting is already at maximum (1)'
            : `Insufficient XP. Need ${cost}, have ${pilot.career?.xp || 0}`,
        errorCode:
          cost === null
            ? PilotErrorCode.ValidationError
            : PilotErrorCode.InsufficientXp,
      };
    }
    const spendResult = this.repo.spendXp(pilotId, cost);
    if (!spendResult.success) {
      return spendResult;
    }
    return this.repo.update(pilotId, {
      skills: {
        gunnery: pilot.skills.gunnery,
        piloting: pilot.skills.piloting - 1,
      },
    });
  };
  awardMissionXp = (
    pilotId: string,
    outcome: 'victory' | 'defeat' | 'draw',
    kills: number,
    bonuses?: { firstBlood?: boolean; higherBVOpponent?: boolean },
  ): IPilotOperationResult => {
    let totalXp = XP_AWARDS.missionSurvival;
    totalXp += kills * XP_AWARDS.kill;
    if (outcome === 'victory') {
      totalXp += XP_AWARDS.victoryBonus;
    }
    if (bonuses?.firstBlood) {
      totalXp += XP_AWARDS.firstBlood;
    }
    if (bonuses?.higherBVOpponent) {
      totalXp += XP_AWARDS.higherBVOpponent;
    }
    return this.repo.recordMission(pilotId, {
      gameId: `mission-${Date.now()}`,
      missionName: 'Combat Mission',
      outcome,
      xpEarned: totalXp,
      kills,
    });
  };
  applyWound = (pilotId: string): IPilotOperationResult => {
    const pilot = this.repo.getById(pilotId);
    if (!pilot) {
      return {
        success: false,
        error: `Pilot ${pilotId} not found`,
        errorCode: PilotErrorCode.NotFound,
      };
    }
    const newWounds = pilot.wounds + 1;
    if (newWounds >= 6) {
      return this.repo.update(pilotId, {
        wounds: 6,
        status: PilotStatus.KIA,
      });
    }
    const newStatus = newWounds >= 3 ? PilotStatus.Injured : pilot.status;
    return this.repo.update(pilotId, {
      wounds: newWounds,
      status: newStatus,
    });
  };
  healWounds = (pilotId: string): IPilotOperationResult => {
    const pilot = this.repo.getById(pilotId);
    if (!pilot) {
      return {
        success: false,
        error: `Pilot ${pilotId} not found`,
        errorCode: PilotErrorCode.NotFound,
      };
    }
    if (pilot.status === PilotStatus.KIA) {
      return {
        success: false,
        error: 'Cannot heal a KIA pilot',
        errorCode: PilotErrorCode.ValidationError,
      };
    }
    return this.repo.update(pilotId, {
      wounds: 0,
      status: PilotStatus.Active,
    });
  };

  purchaseSPA = (
    pilotId: string,
    spaId: string,
    options?: {
      designation?: IPilotAbilityDesignation;
      isCreationFlow?: boolean;
    },
  ): IPilotOperationResult => {
    return purchasePilotSPA(this.repo, pilotId, spaId, options);
  };
  removeSPA = (
    pilotId: string,
    spaId: string,
    options?: { isCreationFlow?: boolean },
  ): IPilotOperationResult => {
    return removePilotSPA(this.repo, pilotId, spaId, options);
  };
  getPilotDesignation = (
    pilot: IPilot,
    spaId: string,
  ): ISPADesignation | undefined => {
    return getPilotSPADesignation(pilot, spaId);
  };
  validatePilot = (pilot: Partial<IPilot>): string[] => {
    const errors: string[] = [];
    if (pilot.skills) {
      if (!isValidSkillValue(pilot.skills.gunnery)) {
        errors.push(
          `Gunnery must be between ${MIN_SKILL_VALUE} and ${MAX_SKILL_VALUE}`,
        );
      }
      if (!isValidSkillValue(pilot.skills.piloting)) {
        errors.push(
          `Piloting must be between ${MIN_SKILL_VALUE} and ${MAX_SKILL_VALUE}`,
        );
      }
    }
    if (pilot.wounds !== undefined && !isValidWoundsValue(pilot.wounds)) {
      errors.push('Wounds must be between 0 and 6');
    }
    if (pilot.name !== undefined && pilot.name.trim().length === 0) {
      errors.push('Pilot name is required');
    }
    return errors;
  };
  private validateCreateOptions(options: ICreatePilotOptions): string[] {
    const errors: string[] = [];
    if (!options.identity.name || options.identity.name.trim().length === 0) {
      errors.push('Pilot name is required');
    }
    if (options.skills) {
      if (!isValidSkillValue(options.skills.gunnery)) {
        errors.push(
          `Gunnery must be between ${MIN_SKILL_VALUE} and ${MAX_SKILL_VALUE}`,
        );
      }
      if (!isValidSkillValue(options.skills.piloting)) {
        errors.push(
          `Piloting must be between ${MIN_SKILL_VALUE} and ${MAX_SKILL_VALUE}`,
        );
      }
    }
    return errors;
  }
  private rollSkill(): number {
    const roll = Math.random();
    if (roll < 0.1) return 3; // 10% veteran
    if (roll < 0.3) return 6; // 20% untrained
    if (roll < 0.6) return 5; // 30% green
    return 4; // 40% regular
  }
  private getRankForLevel(level: PilotExperienceLevel): string {
    switch (level) {
      case PilotExperienceLevel.Green:
        return 'Cadet';
      case PilotExperienceLevel.Regular:
        return 'MechWarrior';
      case PilotExperienceLevel.Veteran:
        return 'Sergeant';
      case PilotExperienceLevel.Elite:
        return 'Lieutenant';
    }
  }
}
const pilotServiceFactory: SingletonFactory<PilotService> = createSingleton(
  (): PilotService => new PilotService(),
);
export function getPilotService(): PilotService {
  return pilotServiceFactory.get();
}
export function resetPilotService(): void {
  pilotServiceFactory.reset();
}
