/**
 * Campaign-linked encounter launch path
 *
 * Per `add-campaign-combat-loop` D6: when the player opens a
 * campaign-generated encounter, the launch materialises the bridged
 * `IEncounter` into the `encounter-system` SQLite repository, then
 * launches it through the existing `EncounterService.launchEncounter`
 * with campaign linkage (`campaignId`, `contractId`, `scenarioId`)
 * stamped onto the resulting `GameSession`.
 *
 * No new session-creation path: the campaign supplies the linkage
 * fields and reuses the encounter launch snapshot. The linkage fields
 * round-trip onto `IGameSession.config` (see `encounterToGameSession`)
 * so `InteractiveSession.getOutcome()` stamps the `ICombatOutcome` with
 * the contract/scenario ids the post-battle processors need.
 *
 * @spec openspec/changes/add-campaign-combat-loop/specs/campaign-combat-loop/spec.md
 * @module lib/campaign/encounter/launchCampaignEncounter
 */

import type { IEncounterOperationResult } from '@/services/encounter/EncounterRepository';
import type { IEncounter } from '@/types/encounter';

import { getEncounterService } from '@/services/encounter/EncounterService';

// =============================================================================
// Result
// =============================================================================

/**
 * Outcome of a campaign-linked encounter launch.
 */
export interface ILaunchCampaignEncounterResult {
  /** True when a campaign-linked `GameSession` was created. */
  readonly success: boolean;
  /** The created session id, when `success` is true. */
  readonly gameSessionId?: string;
  /** The encounter id materialised in the encounter repository. */
  readonly encounterId?: string;
  /** Human-readable failure reason, when `success` is false. */
  readonly error?: string;
}

// =============================================================================
// Service Surface (injectable for tests)
// =============================================================================

/**
 * The slice of `EncounterService` the launch path depends on. Declared
 * as an interface so tests can inject a fake without standing up the
 * SQLite repository singleton.
 */
export interface ICampaignEncounterLauncherService {
  createEncounter(input: {
    readonly name: string;
    readonly description?: string;
  }): IEncounterOperationResult;
  updateEncounter(
    id: string,
    input: {
      readonly mapConfig?: IEncounter['mapConfig'];
      readonly victoryConditions?: IEncounter['victoryConditions'];
      readonly opForConfig?: IEncounter['opForConfig'];
      readonly optionalRules?: readonly string[];
    },
  ): IEncounterOperationResult;
  setPlayerForce(
    encounterId: string,
    forceId: string,
  ): IEncounterOperationResult;
  launchEncounter(
    id: string,
    options?: {
      readonly campaignId?: string | null;
      readonly contractId?: string | null;
      readonly scenarioId?: string | null;
    },
  ): Promise<IEncounterOperationResult>;
  getEncounter(id: string): IEncounter | null;
}

// =============================================================================
// Launch Path
// =============================================================================

/**
 * Launch a campaign-generated encounter into a campaign-linked
 * `GameSession`.
 *
 * The bridged encounter lives on the campaign snapshot
 * (`campaign.bridgedEncounters`). To play it, this function:
 *   1. materialises the encounter into the `encounter-system`
 *      repository (the canonical launch surface), copying map config,
 *      victory conditions, OpFor config, and the player force;
 *   2. launches it through `EncounterService.launchEncounter` with the
 *      encounter's `campaignMeta` threaded in as launch linkage.
 *
 * The resulting `GameSession` carries `campaignId`, `contractId`, and
 * `scenarioId` on its config — the existing `Session Carries Campaign
 * Linkage` contract of `game-session-management`.
 *
 * @param encounter - the bridged campaign-generated encounter
 * @param service - encounter service (defaults to the singleton)
 */
export async function launchCampaignEncounter(
  encounter: IEncounter,
  service: ICampaignEncounterLauncherService = getEncounterService(),
): Promise<ILaunchCampaignEncounterResult> {
  const meta = encounter.campaignMeta;
  if (!meta) {
    return {
      success: false,
      error: 'Encounter has no campaign linkage (campaignMeta missing)',
    };
  }

  // 1. Materialise the encounter into the encounter repository.
  const created = service.createEncounter({
    name: encounter.name,
    description: encounter.description,
  });
  if (!created.success || !created.id) {
    return {
      success: false,
      error: created.error ?? 'Failed to create encounter',
    };
  }
  const repoEncounterId = created.id;

  // 2. Copy the generated configuration onto the repository encounter.
  const configResult = service.updateEncounter(repoEncounterId, {
    mapConfig: encounter.mapConfig,
    victoryConditions: encounter.victoryConditions,
    opForConfig: encounter.opForConfig,
    optionalRules: encounter.optionalRules,
  });
  if (!configResult.success) {
    return {
      success: false,
      encounterId: repoEncounterId,
      error: configResult.error ?? 'Failed to configure encounter',
    };
  }

  // 3. Attach the player force when the bridge resolved one.
  if (encounter.playerForce?.forceId) {
    const forceResult = service.setPlayerForce(
      repoEncounterId,
      encounter.playerForce.forceId,
    );
    if (!forceResult.success) {
      return {
        success: false,
        encounterId: repoEncounterId,
        error: forceResult.error ?? 'Failed to set player force',
      };
    }
  }

  // 4. Launch with campaign linkage (D6 — reuses the existing launch
  //    snapshot; the campaign only supplies the linkage fields).
  const launched = await service.launchEncounter(repoEncounterId, {
    campaignId: meta.campaignId,
    contractId: meta.contractId,
    scenarioId: meta.scenarioId,
  });
  if (!launched.success) {
    return {
      success: false,
      encounterId: repoEncounterId,
      error: launched.error ?? 'Failed to launch encounter',
    };
  }

  // The repository stamps `game_session_id` on the encounter row at
  // launch; read it back so the caller gets the session handle.
  const launchedEncounter = service.getEncounter(repoEncounterId);
  return {
    success: true,
    encounterId: repoEncounterId,
    gameSessionId: launchedEncounter?.gameSessionId,
  };
}
