/**
 * Pilot Service
 *
 * Business logic layer for pilot operations.
 * Handles skill advancement, XP calculations, and pilot creation modes.
 *
 * @spec openspec/changes/add-pilot-system/specs/pilot-system/spec.md
 */

import { getSPADefinition } from '@/lib/spa';
import { pickRandomSPA } from '@/lib/spa/random';
import {
  IPilot,
  IPilotAbilityDesignation,
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
  createSingleton,
  type SingletonFactory,
} from '../core/createSingleton';
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

  // Skill advancement
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

  // XP operations
  awardMissionXp(
    pilotId: string,
    outcome: 'victory' | 'defeat' | 'draw',
    kills: number,
    bonuses?: { firstBlood?: boolean; higherBVOpponent?: boolean },
  ): IPilotOperationResult;

  // Wounds
  applyWound(pilotId: string): IPilotOperationResult;
  healWounds(pilotId: string): IPilotOperationResult;

  // SPA editor (Phase 5 Wave 2a)
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
        errorCode: PilotErrorCode.ValidationError,
      };
    }

    return this.repo.create(options);
  }

  /**
   * Create a pilot from a predefined template
   */
  createFromTemplate(
    level: PilotExperienceLevel,
    identity: IPilotIdentity,
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
   * Create a pilot with random skills.
   *
   * 20% chance of rolling up a single bonus SPA from the unified
   * catalog — positive, purchasable, non-origin-only. The RNG is
   * injectable (defaults to Math.random) so tests can pin down the
   * chosen ability deterministically.
   */
  createRandom(
    identity: IPilotIdentity,
    randomFn: () => number = Math.random,
  ): IPilotOperationResult {
    // Random skills weighted toward Regular (4/5)
    const gunneryRoll = this.rollSkill();
    const pilotingRoll = this.rollSkill();

    // ~20% chance of a bonus ability. If we roll one, draw a random
    // eligible SPA from the unified catalog; if the pool is empty for
    // any reason, fall back to no ability rather than an empty list.
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
  canImproveGunnery(pilot: IPilot): {
    canImprove: boolean;
    cost: number | null;
  } {
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
  canImprovePiloting(pilot: IPilot): {
    canImprove: boolean;
    cost: number | null;
  } {
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
    bonuses?: { firstBlood?: boolean; higherBVOpponent?: boolean },
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
        errorCode: PilotErrorCode.NotFound,
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
        errorCode: PilotErrorCode.NotFound,
      };
    }

    // Can't heal the dead
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
  }

  // ===========================================================================
  // SPA Editor (Phase 5 Wave 2a)
  // ===========================================================================

  /**
   * Purchase an SPA from the canonical catalog. Handles both standard
   * positive-cost SPAs (XP debited) and flaws (negative cost = XP credit).
   *
   * Validation order matches the spec delta:
   *   1. Pilot exists.
   *   2. SPA id resolves in the canonical catalog.
   *   3. Pilot doesn't already own it.
   *   4. Origin-only SPAs require `isCreationFlow === true`.
   *   5. For positive-cost purchases, pilot has the required XP.
   *   6. Flaws CANNOT be taken outside the creation flow per spec
   *      task 4.3 — campaign XP rules don't yet allow it.
   *
   * On success the SPA is appended to the pilot, XP is deducted (or
   * credited for flaws), and the operation result carries the pilot id.
   */
  purchaseSPA(
    pilotId: string,
    spaId: string,
    options?: {
      designation?: IPilotAbilityDesignation;
      isCreationFlow?: boolean;
    },
  ): IPilotOperationResult {
    const pilot = this.repo.getById(pilotId);
    if (!pilot) {
      return {
        success: false,
        error: `Pilot ${pilotId} not found`,
        errorCode: PilotErrorCode.NotFound,
      };
    }

    const spa = getSPADefinition(spaId);
    if (!spa) {
      return {
        success: false,
        error: `Unknown SPA: ${spaId}`,
        errorCode: PilotErrorCode.ValidationError,
      };
    }

    // No-op guard — preserves the caller's idempotency expectations.
    const alreadyOwned = pilot.abilities.some((a) => a.abilityId === spa.id);
    if (alreadyOwned) {
      return {
        success: false,
        error: `Pilot already has SPA: ${spa.displayName}`,
        errorCode: PilotErrorCode.ValidationError,
      };
    }

    const isCreationFlow = options?.isCreationFlow === true;

    // Origin-only entries are character-creation territory.
    if (spa.isOriginOnly && !isCreationFlow) {
      return {
        success: false,
        error: `${spa.displayName} can only be taken at pilot creation`,
        errorCode: PilotErrorCode.ValidationError,
      };
    }

    // Flaws need the creation flow window for now (per task 4.3 — the
    // future campaign XP rules will lift this).
    if (spa.isFlaw && !isCreationFlow) {
      return {
        success: false,
        error: `Flaws can only be taken at pilot creation`,
        errorCode: PilotErrorCode.ValidationError,
      };
    }

    const xpCost = spa.xpCost ?? 0;

    // Positive-cost purchases burn XP from the pool.
    if (xpCost > 0) {
      const availableXp = pilot.career?.xp ?? 0;
      if (availableXp < xpCost) {
        return {
          success: false,
          error: `Insufficient XP. Need ${xpCost}, have ${availableXp}`,
          errorCode: PilotErrorCode.InsufficientXp,
        };
      }
      const spendResult = this.repo.spendXp(pilotId, xpCost);
      if (!spendResult.success) return spendResult;
    } else if (xpCost < 0) {
      // Negative cost = flaw grant. Refund credits the spendable pool
      // without inflating totalXpEarned (this isn't earned XP).
      const refund = Math.abs(xpCost);
      const refundResult = this.repo.refundXp(pilotId, refund);
      if (!refundResult.success) return refundResult;
    }
    // xpCost === 0 (origin-only at creation) — no XP movement.

    const addResult = this.repo.addAbility(
      pilotId,
      spa.id,
      undefined,
      options?.designation,
      xpCost,
    );

    if (!addResult.success) {
      // Roll back the XP move so the pilot isn't left in a half-applied state.
      if (xpCost > 0) {
        this.repo.refundXp(pilotId, xpCost);
      } else if (xpCost < 0) {
        // The flaw refund failed to attach — re-debit the credit we issued.
        this.repo.spendXp(pilotId, Math.abs(xpCost));
      }
      return addResult;
    }

    return { success: true, id: pilotId };
  }

  /**
   * Remove an SPA from the pilot. Allowed only during the creation flow
   * per spec task 6.1 — abilities are permanent once the campaign starts.
   *
   * On removal during creation, refunds the exact XP spent at purchase
   * (recorded in `xpSpent` on the ability row). For flaws this returns
   * the credited XP back to the pool; for purchases it tops up the pool
   * by the original cost. Falls back to the canonical SPA cost when an
   * older ability row predates the Wave 2a `xpSpent` column.
   */
  removeSPA(
    pilotId: string,
    spaId: string,
    options?: { isCreationFlow?: boolean },
  ): IPilotOperationResult {
    if (options?.isCreationFlow !== true) {
      return {
        success: false,
        error: 'Abilities cannot be removed after pilot creation',
        errorCode: PilotErrorCode.ValidationError,
      };
    }

    const pilot = this.repo.getById(pilotId);
    if (!pilot) {
      return {
        success: false,
        error: `Pilot ${pilotId} not found`,
        errorCode: PilotErrorCode.NotFound,
      };
    }

    const ref = pilot.abilities.find((a) => a.abilityId === spaId);
    if (!ref) {
      return {
        success: false,
        error: `Pilot does not have SPA: ${spaId}`,
        errorCode: PilotErrorCode.ValidationError,
      };
    }

    // Compute the refund amount. Prefer the recorded xpSpent (Wave 2a
    // accuracy); fall back to the catalog cost for legacy rows.
    const fallback = getSPADefinition(spaId)?.xpCost ?? 0;
    const recorded = ref.xpSpent ?? fallback;

    const removeResult = this.repo.removeAbility(pilotId, spaId);
    if (!removeResult.success) return removeResult;

    if (recorded > 0) {
      // Standard purchase — refund the XP into the pool.
      const refundResult = this.repo.refundXp(pilotId, recorded);
      if (!refundResult.success) return refundResult;
    } else if (recorded < 0) {
      // Flaw removal — claw back the credit we granted on purchase.
      const debitResult = this.repo.spendXp(pilotId, Math.abs(recorded));
      if (!debitResult.success) return debitResult;
    }

    return { success: true, id: pilotId };
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
const pilotServiceFactory: SingletonFactory<PilotService> = createSingleton(
  (): PilotService => new PilotService(),
);

/**
 * Get or create the PilotService singleton
 */
export function getPilotService(): PilotService {
  return pilotServiceFactory.get();
}

/**
 * Reset the singleton (for testing)
 */
export function resetPilotService(): void {
  pilotServiceFactory.reset();
}
