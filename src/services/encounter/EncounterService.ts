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
import { createGameSession } from '@/utils/gameplay/gameSessionCore';
import { logger } from '@/utils/logger';

import {
  createSingleton,
  type SingletonFactory,
} from '../core/createSingleton';
import { getForceRepository } from '../forces/ForceRepository';
import { getPilotService } from '../pilots/PilotService';
import {
  getEncounterRepository,
  EncounterRepository,
  IEncounterOperationResult,
} from './EncounterRepository';
import {
  buildEncounterMeta,
  buildGameConfigFromEncounter,
  buildGameUnitsFromEncounter,
} from './encounterToGameSession';

// =============================================================================
// Launch Options
// =============================================================================

/**
 * Per `wire-encounter-to-campaign-round-trip` Wave 5: round-trip linkage
 * the campaign orchestrator passes when launching a scenario-generated
 * encounter. The fields are threaded onto the `IGameSession.config` so
 * `InteractiveSession.getOutcome()` can stamp the resulting
 * `ICombatOutcome` with the contract/scenario IDs the post-battle
 * processors need to advance contract status and award salvage.
 *
 * Standalone (non-campaign) encounters omit these — they default to null
 * on the config and the spec scenario "Standalone encounter has encounter
 * id only" passes naturally.
 */
export interface ILaunchEncounterOptions {
  readonly campaignId?: string | null;
  readonly contractId?: string | null;
  readonly scenarioId?: string | null;
}

function hasLaunchId(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function normalizeLaunchId(value: string | null | undefined): string | null {
  return hasLaunchId(value) ? value : null;
}

function validateContractLaunchLinkage(
  options: ILaunchEncounterOptions,
): string | null {
  if (options.contractId === undefined || options.contractId === null) {
    return null;
  }

  const missing: string[] = [];
  if (!hasLaunchId(options.campaignId)) missing.push('campaignId');
  if (!hasLaunchId(options.contractId)) missing.push('contractId');
  if (!hasLaunchId(options.scenarioId)) missing.push('scenarioId');

  if (missing.length === 0) {
    return null;
  }

  return `Cannot launch contract encounter without ${missing.join(', ')}`;
}

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
  launchEncounter(
    id: string,
    options?: ILaunchEncounterOptions,
  ): IEncounterOperationResult;

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

  createEncounter = (
    input: ICreateEncounterInput,
  ): IEncounterOperationResult => {
    // Validate input
    if (!input.name || input.name.trim().length === 0) {
      return {
        success: false,
        error: 'Encounter name is required',
      };
    }

    return this.repository.createEncounter(input);
  };

  getEncounter = (id: string): IEncounter | null => {
    const encounter = this.repository.getEncounterById(id);
    if (!encounter) return null;

    // Hydrate force references with current data
    return this.hydrateEncounter(encounter);
  };

  getAllEncounters = (): readonly IEncounter[] => {
    return this.repository
      .getAllEncounters()
      .map((e) => this.hydrateEncounter(e));
  };

  getReadyEncounters = (): readonly IEncounter[] => {
    return this.repository
      .getEncountersByStatus(EncounterStatus.Ready)
      .map((e) => this.hydrateEncounter(e));
  };

  getDraftEncounters = (): readonly IEncounter[] => {
    return this.repository
      .getEncountersByStatus(EncounterStatus.Draft)
      .map((e) => this.hydrateEncounter(e));
  };

  updateEncounter = (
    id: string,
    input: IUpdateEncounterInput,
  ): IEncounterOperationResult => {
    return this.repository.updateEncounter(id, input);
  };

  deleteEncounter = (id: string): IEncounterOperationResult => {
    return this.repository.deleteEncounter(id);
  };

  // ===========================================================================
  // Configuration
  // ===========================================================================

  setPlayerForce = (
    encounterId: string,
    forceId: string,
  ): IEncounterOperationResult => {
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
  };

  setOpponentForce = (
    encounterId: string,
    forceId: string,
  ): IEncounterOperationResult => {
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
  };

  clearOpponentForce = (encounterId: string): IEncounterOperationResult => {
    return this.repository.updateEncounter(encounterId, {
      opponentForceId: undefined,
    });
  };

  applyTemplate = (
    encounterId: string,
    template: ScenarioTemplateType,
  ): IEncounterOperationResult => {
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
  };

  // ===========================================================================
  // Validation
  // ===========================================================================

  validateEncounter = (id: string): IEncounterValidationResult => {
    const encounter = this.getEncounter(id);
    if (!encounter) {
      return {
        valid: false,
        errors: ['Encounter not found'],
        warnings: [],
      };
    }

    return validateEncounter(encounter);
  };

  canLaunch = (id: string): boolean => {
    const validation = this.validateEncounter(id);
    return validation.valid;
  };

  // ===========================================================================
  // Launch
  // ===========================================================================

  launchEncounter = (
    id: string,
    options: ILaunchEncounterOptions = {},
  ): IEncounterOperationResult => {
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

    const linkageError = validateContractLaunchLinkage(options);
    if (linkageError) {
      return {
        success: false,
        error: linkageError,
      };
    }

    // Build the game config and units from the encounter. Force/pilot
    // resolvers are injected so this helper stays trivially testable.
    const forceRepo = getForceRepository();
    const pilotService = getPilotService();
    const { units, errors } = buildGameUnitsFromEncounter(encounter, {
      getForceById: (forceId) => forceRepo.getForceById(forceId),
      getPilotById: (pilotId) => pilotService.getPilot(pilotId),
    });

    if (errors.length > 0) {
      return {
        success: false,
        error: `Cannot launch: ${errors.join(', ')}`,
      };
    }

    // createGameSession returns a fully-formed IGameSession with a fresh
    // uuid. The session object itself is ephemeral (no server-side store),
    // but its id is what we persist on the encounter — the UI rehydrates
    // play state from the encounter + forces, using this id as the handle.
    //
    // Per `wire-encounter-to-campaign-round-trip` Wave 5: thread campaign
    // linkage (campaignId, contractId, scenarioId) into the config so the
    // eventual `ICombatOutcome` is self-describing. The encounter id is always
    // stamped by `buildGameConfigFromEncounter`. Contract-bound launches
    // were validated above so incomplete linkage cannot produce a session.
    const config = buildGameConfigFromEncounter(encounter, {
      campaignId: normalizeLaunchId(options.campaignId),
      contractId: normalizeLaunchId(options.contractId),
      scenarioId: normalizeLaunchId(options.scenarioId),
    });

    // Per `link-encounters-to-replays` PR 3: stamp the encounter snapshot
    // onto the GameCreated event payload. This is what the replay-library
    // backfill scan reads when rebuilding the manifest from disk. The raw
    // force ids come from the repository so a broken-force encounter
    // (Change A territory) still pins which force used to be assigned.
    // The `getEncounterWithRawIds` lookup is optional — older repository
    // mocks (jest fixtures predating the cascade-broken-refs PR) do not
    // implement it; in that case the meta builder falls back to the
    // hydrated `playerForce` / `opponentForce` slots which is the
    // common-case path anyway.
    const withRawIds =
      typeof this.repository.getEncounterWithRawIds === 'function'
        ? this.repository.getEncounterWithRawIds(id)
        : null;
    const encounterMeta = buildEncounterMeta(
      encounter,
      withRawIds?.rawForceIds,
    );

    const session = createGameSession(config, units, { encounterMeta });
    return this.repository.linkGameSession(id, session.id);
  };

  // ===========================================================================
  // Cloning
  // ===========================================================================

  cloneEncounter = (id: string, newName: string): IEncounterOperationResult => {
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
  };

  // ===========================================================================
  // Helper Methods
  // ===========================================================================

  /**
   * Hydrate encounter with current force data.
   *
   * Hydration-Boundary Orphaned Reference Replacement (PR 2 of
   * repair-broken-encounter-drafts):
   *
   *   - Stored `playerForceId` resolves via `forceRepo.getForceById` →
   *     return a fully hydrated IForceReference (BV + unitCount + name).
   *   - Stored `playerForceId` resolves to `null` (force was deleted but
   *     the cascade did not run, e.g. legacy data, raw SQL inserts) →
   *     return `null` for the slot AND emit `logger.warn` once per
   *     `${encounterId}:${forceId}:${side}` key per process lifetime.
   *   - No stored id (slot was always undefined) → leave undefined.
   *
   * The dedup Set is reset by `resetEncounterService()` so test isolation is
   * preserved (each test boundary clears the seen-keys cache).
   */
  private hydrateEncounter(encounter: IEncounter): IEncounter {
    const forceRepo = getForceRepository();

    let playerForce: IEncounter['playerForce'] = encounter.playerForce;
    let opponentForce: IEncounter['opponentForce'] = encounter.opponentForce;

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
      } else {
        // Resolver returned null — force was deleted but a stored ref remains.
        warnOrphanedForceRef(encounter.id, playerForce.forceId, 'player');
        playerForce = null;
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
      } else {
        warnOrphanedForceRef(encounter.id, opponentForce.forceId, 'opponent');
        opponentForce = null;
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
// Orphaned-Force-Reference warn dedup
// =============================================================================

/**
 * Module-level dedup Set: each `${encounterId}:${forceId}:${side}` key is
 * stored on the first orphan-warn call so subsequent reads of the same
 * orphaned encounter stay quiet. The Set is reset by `resetEncounterService`
 * so each test boundary starts with a clean slate (cf. spec scenario "Reset
 * clears dedup Set").
 *
 * Module-scoped (rather than instance-scoped) because the singleton factory
 * may construct a new EncounterService instance after a reset and we still
 * want the warn cache to clear deterministically — the factory reset
 * triggers `resetOrphanWarnDedup()` from `resetEncounterService`.
 */
const orphanWarnSeen = new Set<string>();

function warnOrphanedForceRef(
  encounterId: string,
  forceId: string,
  side: 'player' | 'opponent',
): void {
  const key = `${encounterId}:${forceId}:${side}`;
  if (orphanWarnSeen.has(key)) return;
  orphanWarnSeen.add(key);
  logger.warn('[encounter] orphaned force reference', {
    encounterId,
    forceId,
    side,
  });
}

function resetOrphanWarnDedup(): void {
  orphanWarnSeen.clear();
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
  resetOrphanWarnDedup();
}
