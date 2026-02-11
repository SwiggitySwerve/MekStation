/**
 * Encounter Service
 *
 * Business logic layer for encounter management.
 * Provides high-level operations for encounter setup and launch.
 *
 * @spec openspec/changes/add-encounter-system/specs/encounter-system/spec.md
 */

import {
  IEncounter,
  ICreateEncounterInput,
  IUpdateEncounterInput,
  IEncounterValidationResult,
  EncounterStatus,
  validateEncounter,
  SCENARIO_TEMPLATES,
  ScenarioTemplateType,
} from '@/types/encounter';

import {
  createSingleton,
  type SingletonFactory,
} from '../core/createSingleton';
import { getForceRepository } from '../forces/ForceRepository';
import {
  getEncounterRepository,
  EncounterRepository,
  IEncounterOperationResult,
} from './EncounterRepository';

// =============================================================================
// Service Interface
// =============================================================================

export interface IEncounterService {
  // Encounter CRUD
  createEncounter(input: ICreateEncounterInput): IEncounterOperationResult;
  getEncounter(id: string): IEncounter | null;
  getAllEncounters(): readonly IEncounter[];
  getReadyEncounters(): readonly IEncounter[];
  getDraftEncounters(): readonly IEncounter[];
  updateEncounter(
    id: string,
    input: IUpdateEncounterInput,
  ): IEncounterOperationResult;
  deleteEncounter(id: string): IEncounterOperationResult;

  // Configuration
  setPlayerForce(
    encounterId: string,
    forceId: string,
  ): IEncounterOperationResult;
  setOpponentForce(
    encounterId: string,
    forceId: string,
  ): IEncounterOperationResult;
  clearOpponentForce(encounterId: string): IEncounterOperationResult;
  applyTemplate(
    encounterId: string,
    template: ScenarioTemplateType,
  ): IEncounterOperationResult;

  // Validation
  validateEncounter(id: string): IEncounterValidationResult;
  canLaunch(id: string): boolean;

  // Launch
  launchEncounter(id: string): IEncounterOperationResult;

  // Cloning
  cloneEncounter(id: string, newName: string): IEncounterOperationResult;
}

// =============================================================================
// Service Implementation
// =============================================================================

export class EncounterService implements IEncounterService {
  private readonly repository: EncounterRepository;

  constructor() {
    this.repository = getEncounterRepository();
  }

  // ===========================================================================
  // Encounter CRUD
  // ===========================================================================

  createEncounter(input: ICreateEncounterInput): IEncounterOperationResult {
    // Validate input
    if (!input.name || input.name.trim().length === 0) {
      return {
        success: false,
        error: 'Encounter name is required',
      };
    }

    return this.repository.createEncounter(input);
  }

  getEncounter(id: string): IEncounter | null {
    const encounter = this.repository.getEncounterById(id);
    if (!encounter) return null;

    // Hydrate force references with current data
    return this.hydrateEncounter(encounter);
  }

  getAllEncounters(): readonly IEncounter[] {
    return this.repository
      .getAllEncounters()
      .map((e) => this.hydrateEncounter(e));
  }

  getReadyEncounters(): readonly IEncounter[] {
    return this.repository
      .getEncountersByStatus(EncounterStatus.Ready)
      .map((e) => this.hydrateEncounter(e));
  }

  getDraftEncounters(): readonly IEncounter[] {
    return this.repository
      .getEncountersByStatus(EncounterStatus.Draft)
      .map((e) => this.hydrateEncounter(e));
  }

  updateEncounter(
    id: string,
    input: IUpdateEncounterInput,
  ): IEncounterOperationResult {
    return this.repository.updateEncounter(id, input);
  }

  deleteEncounter(id: string): IEncounterOperationResult {
    return this.repository.deleteEncounter(id);
  }

  // ===========================================================================
  // Configuration
  // ===========================================================================

  setPlayerForce(
    encounterId: string,
    forceId: string,
  ): IEncounterOperationResult {
    // Validate force exists
    const forceRepo = getForceRepository();
    const force = forceRepo.getForceById(forceId);
    if (!force) {
      return {
        success: false,
        error: 'Force not found',
      };
    }

    return this.repository.updateEncounter(encounterId, {
      playerForceId: forceId,
    });
  }

  setOpponentForce(
    encounterId: string,
    forceId: string,
  ): IEncounterOperationResult {
    // Validate force exists
    const forceRepo = getForceRepository();
    const force = forceRepo.getForceById(forceId);
    if (!force) {
      return {
        success: false,
        error: 'Force not found',
      };
    }

    return this.repository.updateEncounter(encounterId, {
      opponentForceId: forceId,
      opForConfig: undefined, // Clear OpFor config when setting explicit force
    });
  }

  clearOpponentForce(encounterId: string): IEncounterOperationResult {
    return this.repository.updateEncounter(encounterId, {
      opponentForceId: undefined,
    });
  }

  applyTemplate(
    encounterId: string,
    template: ScenarioTemplateType,
  ): IEncounterOperationResult {
    const templateDef = SCENARIO_TEMPLATES.find((t) => t.type === template);
    if (!templateDef) {
      return {
        success: false,
        error: `Unknown template: ${template}`,
      };
    }

    return this.repository.updateEncounter(encounterId, {
      mapConfig: templateDef.defaultMapConfig,
      victoryConditions: templateDef.defaultVictoryConditions,
    });
  }

  // ===========================================================================
  // Validation
  // ===========================================================================

  validateEncounter(id: string): IEncounterValidationResult {
    const encounter = this.getEncounter(id);
    if (!encounter) {
      return {
        valid: false,
        errors: ['Encounter not found'],
        warnings: [],
      };
    }

    return validateEncounter(encounter);
  }

  canLaunch(id: string): boolean {
    const validation = this.validateEncounter(id);
    return validation.valid;
  }

  // ===========================================================================
  // Launch
  // ===========================================================================

  launchEncounter(id: string): IEncounterOperationResult {
    const encounter = this.getEncounter(id);
    if (!encounter) {
      return {
        success: false,
        error: 'Encounter not found',
      };
    }

    // Validate encounter is ready
    const validation = this.validateEncounter(id);
    if (!validation.valid) {
      return {
        success: false,
        error: `Cannot launch: ${validation.errors.join(', ')}`,
      };
    }

    // Cannot launch already launched encounters
    if (encounter.status === EncounterStatus.Launched) {
      return {
        success: false,
        error: 'Encounter is already launched',
      };
    }

    if (encounter.status === EncounterStatus.Completed) {
      return {
        success: false,
        error: 'Encounter is already completed',
      };
    }

    // TODO: Create game session from encounter
    // For now, just update status to launched
    // In full implementation:
    // 1. Create game session
    // 2. Initialize hex grid from map config
    // 3. Place units from forces
    // 4. Generate OpFor if using opForConfig
    // 5. Link game session to encounter

    // For MVP, just create a placeholder game session ID
    const gameSessionId = `session-${Date.now()}`;
    return this.repository.linkGameSession(id, gameSessionId);
  }

  // ===========================================================================
  // Cloning
  // ===========================================================================

  cloneEncounter(id: string, newName: string): IEncounterOperationResult {
    const encounter = this.getEncounter(id);
    if (!encounter) {
      return {
        success: false,
        error: 'Encounter not found',
      };
    }

    // Create new encounter with same settings
    const result = this.repository.createEncounter({
      name: newName,
      description: encounter.description
        ? `Cloned from ${encounter.name}`
        : undefined,
      template: encounter.template,
    });

    if (!result.success || !result.id) {
      return result;
    }

    // Copy configuration
    this.repository.updateEncounter(result.id, {
      playerForceId: encounter.playerForce?.forceId,
      opponentForceId: encounter.opponentForce?.forceId,
      opForConfig: encounter.opForConfig,
      mapConfig: encounter.mapConfig,
      victoryConditions: encounter.victoryConditions,
      optionalRules: encounter.optionalRules,
    });

    return result;
  }

  // ===========================================================================
  // Helper Methods
  // ===========================================================================

  /**
   * Hydrate encounter with current force data.
   */
  private hydrateEncounter(encounter: IEncounter): IEncounter {
    const forceRepo = getForceRepository();

    let playerForce = encounter.playerForce;
    let opponentForce = encounter.opponentForce;

    // Hydrate player force
    if (playerForce?.forceId) {
      const force = forceRepo.getForceById(playerForce.forceId);
      if (force) {
        playerForce = {
          forceId: force.id,
          forceName: force.name,
          totalBV: force.stats.totalBV,
          unitCount: force.stats.assignedUnits,
        };
      }
    }

    // Hydrate opponent force
    if (opponentForce?.forceId) {
      const force = forceRepo.getForceById(opponentForce.forceId);
      if (force) {
        opponentForce = {
          forceId: force.id,
          forceName: force.name,
          totalBV: force.stats.totalBV,
          unitCount: force.stats.assignedUnits,
        };
      }
    }

    return {
      ...encounter,
      playerForce,
      opponentForce,
    };
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

const encounterServiceFactory: SingletonFactory<EncounterService> =
  createSingleton((): EncounterService => new EncounterService());

export function getEncounterService(): EncounterService {
  return encounterServiceFactory.get();
}

export function resetEncounterService(): void {
  encounterServiceFactory.reset();
}
