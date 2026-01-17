/**
 * Pilot Service
 *
 * Business logic layer for pilot operations.
 * Handles skill advancement, XP calculations, and pilot creation modes.
 *
 * @spec openspec/changes/add-pilot-system/specs/pilot-system/spec.md
 */

import {
  IPilot,
  ICreatePilotOptions,
  IPilotIdentity,
  IPilotStatblock,
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
import {
  getPilotRepository,
  IPilotOperationResult,
  PilotErrorCode,
} from './PilotRepository';

// =============================================================================
// Service Interface
// =============================================================================

export interface IPilotService {
  // CRUD operations
  createPilot(options: ICreatePilotOptions): IPilotOperationResult;
  createFromTemplate(
    level: PilotExperienceLevel,
    identity: IPilotIdentity
  ): IPilotOperationResult;
  createRandom(identity: IPilotIdentity): IPilotOperationResult;
  createStatblock(statblock: IPilotStatblock): IPilot;
  updatePilot(id: string, updates: Partial<IPilot>): IPilotOperationResult;
  deletePilot(id: string): IPilotOperationResult;
  getPilot(id: string): IPilot | null;
  listPilots(): readonly IPilot[];
  listActivePilots(): readonly IPilot[];

  // Skill advancement
  improveGunnery(pilotId: string): IPilotOperationResult;
  improvePiloting(pilotId: string): IPilotOperationResult;
  canImproveGunnery(pilot: IPilot): { canImprove: boolean; cost: number | null };
  canImprovePiloting(pilot: IPilot): { canImprove: boolean; cost: number | null };

  // XP operations
  awardMissionXp(
    pilotId: string,
    outcome: 'victory' | 'defeat' | 'draw',
    kills: number,
    bonuses?: { firstBlood?: boolean; higherBVOpponent?: boolean }
  ): IPilotOperationResult;

  // Wounds
  applyWound(pilotId: string): IPilotOperationResult;
  healWounds(pilotId: string): IPilotOperationResult;

  // Validation
  validatePilot(pilot: Partial<IPilot>): string[];
}

// =============================================================================
// Service Implementation
// =============================================================================

export class PilotService implements IPilotService {
  private repo = getPilotRepository();

  // ===========================================================================
  // CRUD Operations
  // ===========================================================================

  /**
   * Create a new pilot with full options
   */
  createPilot(options: ICreatePilotOptions): IPilotOperationResult {
    const errors = this.validateCreateOptions(options);
    if (errors.length > 0) {
      return {
        success: false,
        error: errors.join('; '),
        errorCode: PilotErrorCode.VALIDATION_ERROR,
      };
    }

    return this.repo.create(options);
  }

  /**
   * Create a pilot from a predefined template
   */
  createFromTemplate(
    level: PilotExperienceLevel,
    identity: IPilotIdentity
  ): IPilotOperationResult {
    const template = PILOT_TEMPLATES[level];

    return this.repo.create({
      identity,
      type: PilotType.Persistent,
      skills: template.skills,
      startingXp: template.startingXp,
      rank: this.getRankForLevel(level),
    });
  }

  /**
   * Create a pilot with random skills
   */
  createRandom(identity: IPilotIdentity): IPilotOperationResult {
    // Random skills weighted toward Regular (4/5)
    const gunneryRoll = this.rollSkill();
    const pilotingRoll = this.rollSkill();

    // Small chance of a bonus ability
    const hasAbility = Math.random() < 0.2;

    return this.repo.create({
      identity,
      type: PilotType.Persistent,
      skills: { gunnery: gunneryRoll, piloting: pilotingRoll },
      startingXp: 0,
      // TODO: Add random ability selection when abilities are implemented
      abilityIds: hasAbility ? [] : undefined,
    });
  }

  /**
   * Create a statblock pilot (not persisted)
   */
  createStatblock(statblock: IPilotStatblock): IPilot {
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
  }

  /**
   * Update a pilot
   */
  updatePilot(id: string, updates: Partial<IPilot>): IPilotOperationResult {
    return this.repo.update(id, updates);
  }

  /**
   * Delete a pilot
   */
  deletePilot(id: string): IPilotOperationResult {
    return this.repo.delete(id);
  }

  /**
   * Get a pilot by ID
   */
  getPilot(id: string): IPilot | null {
    return this.repo.getById(id);
  }

  /**
   * List all pilots
   */
  listPilots(): readonly IPilot[] {
    return this.repo.list();
  }

  /**
   * List only active pilots
   */
  listActivePilots(): readonly IPilot[] {
    return this.repo.listByStatus(PilotStatus.Active);
  }

  // ===========================================================================
  // Skill Advancement
  // ===========================================================================

  /**
   * Check if pilot can improve gunnery
   */
  canImproveGunnery(pilot: IPilot): { canImprove: boolean; cost: number | null } {
    const cost = getGunneryImprovementCost(pilot.skills.gunnery);
    if (cost === null) {
      return { canImprove: false, cost: null };
    }

    const hasXp = pilot.career && pilot.career.xp >= cost;
    return { canImprove: hasXp || false, cost };
  }

  /**
   * Check if pilot can improve piloting
   */
  canImprovePiloting(pilot: IPilot): { canImprove: boolean; cost: number | null } {
    const cost = getPilotingImprovementCost(pilot.skills.piloting);
    if (cost === null) {
      return { canImprove: false, cost: null };
    }

    const hasXp = pilot.career && pilot.career.xp >= cost;
    return { canImprove: hasXp || false, cost };
  }

  /**
   * Improve gunnery skill by spending XP
   */
  improveGunnery(pilotId: string): IPilotOperationResult {
    const pilot = this.repo.getById(pilotId);
    if (!pilot) {
      return {
        success: false,
        error: `Pilot ${pilotId} not found`,
        errorCode: PilotErrorCode.NOT_FOUND,
      };
    }

    const { canImprove, cost } = this.canImproveGunnery(pilot);
    if (!canImprove || cost === null) {
      return {
        success: false,
        error: cost === null 
          ? 'Gunnery is already at maximum (1)'
          : `Insufficient XP. Need ${cost}, have ${pilot.career?.xp || 0}`,
        errorCode: cost === null 
          ? PilotErrorCode.VALIDATION_ERROR 
          : PilotErrorCode.INSUFFICIENT_XP,
      };
    }

    // Spend XP
    const spendResult = this.repo.spendXp(pilotId, cost);
    if (!spendResult.success) {
      return spendResult;
    }

    // Improve skill
    return this.repo.update(pilotId, {
      skills: {
        gunnery: pilot.skills.gunnery - 1,
        piloting: pilot.skills.piloting,
      },
    });
  }

  /**
   * Improve piloting skill by spending XP
   */
  improvePiloting(pilotId: string): IPilotOperationResult {
    const pilot = this.repo.getById(pilotId);
    if (!pilot) {
      return {
        success: false,
        error: `Pilot ${pilotId} not found`,
        errorCode: PilotErrorCode.NOT_FOUND,
      };
    }

    const { canImprove, cost } = this.canImprovePiloting(pilot);
    if (!canImprove || cost === null) {
      return {
        success: false,
        error: cost === null 
          ? 'Piloting is already at maximum (1)'
          : `Insufficient XP. Need ${cost}, have ${pilot.career?.xp || 0}`,
        errorCode: cost === null 
          ? PilotErrorCode.VALIDATION_ERROR 
          : PilotErrorCode.INSUFFICIENT_XP,
      };
    }

    // Spend XP
    const spendResult = this.repo.spendXp(pilotId, cost);
    if (!spendResult.success) {
      return spendResult;
    }

    // Improve skill
    return this.repo.update(pilotId, {
      skills: {
        gunnery: pilot.skills.gunnery,
        piloting: pilot.skills.piloting - 1,
      },
    });
  }

  // ===========================================================================
  // XP Operations
  // ===========================================================================

  /**
   * Award XP for completing a mission
   */
  awardMissionXp(
    pilotId: string,
    outcome: 'victory' | 'defeat' | 'draw',
    kills: number,
    bonuses?: { firstBlood?: boolean; higherBVOpponent?: boolean }
  ): IPilotOperationResult {
    let totalXp = XP_AWARDS.missionSurvival;

    // Kill XP
    totalXp += kills * XP_AWARDS.kill;

    // Victory bonus
    if (outcome === 'victory') {
      totalXp += XP_AWARDS.victoryBonus;
    }

    // Optional bonuses
    if (bonuses?.firstBlood) {
      totalXp += XP_AWARDS.firstBlood;
    }
    if (bonuses?.higherBVOpponent) {
      totalXp += XP_AWARDS.higherBVOpponent;
    }

    // Record the mission (this also adds XP)
    return this.repo.recordMission(pilotId, {
      gameId: `mission-${Date.now()}`,
      missionName: 'Combat Mission',
      outcome,
      xpEarned: totalXp,
      kills,
    });
  }

  // ===========================================================================
  // Wounds
  // ===========================================================================

  /**
   * Apply a wound to a pilot
   */
  applyWound(pilotId: string): IPilotOperationResult {
    const pilot = this.repo.getById(pilotId);
    if (!pilot) {
      return {
        success: false,
        error: `Pilot ${pilotId} not found`,
        errorCode: PilotErrorCode.NOT_FOUND,
      };
    }

    const newWounds = pilot.wounds + 1;

    // Check for death
    if (newWounds >= 6) {
      return this.repo.update(pilotId, {
        wounds: 6,
        status: PilotStatus.KIA,
      });
    }

    // Check for injured status
    const newStatus = newWounds >= 3 ? PilotStatus.Injured : pilot.status;

    return this.repo.update(pilotId, {
      wounds: newWounds,
      status: newStatus,
    });
  }

  /**
   * Heal all wounds (between games)
   */
  healWounds(pilotId: string): IPilotOperationResult {
    const pilot = this.repo.getById(pilotId);
    if (!pilot) {
      return {
        success: false,
        error: `Pilot ${pilotId} not found`,
        errorCode: PilotErrorCode.NOT_FOUND,
      };
    }

    // Can't heal the dead
    if (pilot.status === PilotStatus.KIA) {
      return {
        success: false,
        error: 'Cannot heal a KIA pilot',
        errorCode: PilotErrorCode.VALIDATION_ERROR,
      };
    }

    return this.repo.update(pilotId, {
      wounds: 0,
      status: PilotStatus.Active,
    });
  }

  // ===========================================================================
  // Validation
  // ===========================================================================

  /**
   * Validate pilot data
   */
  validatePilot(pilot: Partial<IPilot>): string[] {
    const errors: string[] = [];

    if (pilot.skills) {
      if (!isValidSkillValue(pilot.skills.gunnery)) {
        errors.push(`Gunnery must be between ${MIN_SKILL_VALUE} and ${MAX_SKILL_VALUE}`);
      }
      if (!isValidSkillValue(pilot.skills.piloting)) {
        errors.push(`Piloting must be between ${MIN_SKILL_VALUE} and ${MAX_SKILL_VALUE}`);
      }
    }

    if (pilot.wounds !== undefined && !isValidWoundsValue(pilot.wounds)) {
      errors.push('Wounds must be between 0 and 6');
    }

    if (pilot.name !== undefined && pilot.name.trim().length === 0) {
      errors.push('Pilot name is required');
    }

    return errors;
  }

  // ===========================================================================
  // Private Helpers
  // ===========================================================================

  private validateCreateOptions(options: ICreatePilotOptions): string[] {
    const errors: string[] = [];

    if (!options.identity.name || options.identity.name.trim().length === 0) {
      errors.push('Pilot name is required');
    }

    if (options.skills) {
      if (!isValidSkillValue(options.skills.gunnery)) {
        errors.push(`Gunnery must be between ${MIN_SKILL_VALUE} and ${MAX_SKILL_VALUE}`);
      }
      if (!isValidSkillValue(options.skills.piloting)) {
        errors.push(`Piloting must be between ${MIN_SKILL_VALUE} and ${MAX_SKILL_VALUE}`);
      }
    }

    return errors;
  }

  private rollSkill(): number {
    // Weighted roll: mostly 4-5, occasionally 3 or 6
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

// Singleton instance
let pilotServiceInstance: PilotService | null = null;

/**
 * Get or create the PilotService singleton
 */
export function getPilotService(): PilotService {
  if (!pilotServiceInstance) {
    pilotServiceInstance = new PilotService();
  }
  return pilotServiceInstance;
}

/**
 * Reset the singleton (for testing)
 */
export function resetPilotService(): void {
  pilotServiceInstance = null;
}
