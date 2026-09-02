import type { ICampaign } from '@/types/campaign/Campaign';
import type { IRosterUnitProjection } from '@/types/campaign/RosterUnitProjection';

import {
  isRosterPreflightFailure,
  logLaunchRosterPreflightDiagnostics,
  logMissionLaunchCommitRejected,
  logMissionLaunchCommitSucceeded,
} from '@/lib/campaign/encounter/missionLaunchCommandDiagnostics';
import {
  type CanonicalCombatCatalogSnapshot,
  admitRosterUnitSource,
} from '@/lib/campaign/readiness/canonicalCatalogAdmission';
import { logger } from '@/utils/logger';

import type { OwnedForceMaterializationResult } from './campaignOwnedForceMaterialization';

import { ownedPlayerForceUnits } from './campaignOwnedForceMaterialization';
import {
  encounterExists,
  type FetchImpl,
  validateExistingEncounter,
} from './materializeCampaignMissionEncounter.api';
import {
  rosterUnitsToForceUnits,
  selectOpponentUnits,
} from './materializeCampaignMissionEncounter.forceUnits';
import {
  CampaignOwnedForceStaleError,
  assertOwnedForcesCurrent,
} from './materializeCampaignMissionEncounter.ownedForces';
import {
  attachEncounterForce,
  createAssignedForceWithUnits,
  createConfiguredEncounter,
} from './materializeCampaignMissionEncounter.rest';

type CampaignMissionSource = Pick<ICampaign, 'id' | 'name' | 'missions'>;

export interface MaterializeCampaignMissionEncounterInput {
  readonly campaign: CampaignMissionSource;
  readonly missionId: string;
  readonly rosterUnits: readonly IRosterUnitProjection[];
  readonly catalog?: CanonicalCombatCatalogSnapshot;
  readonly fetchImpl?: FetchImpl;
  /**
   * Authoritative owned forces for both tactical slots, resolved by
   * `materializeOwnedPlayerForces` against the active branch/revision.
   * Absent on the single-player path, which keeps its flat roster.
   */
  readonly ownedForces?: OwnedForceMaterializationResult;
}

export interface MaterializeCampaignMissionEncounterResult {
  readonly encounterId: string;
  readonly reused: boolean;
  readonly missionScenarioIds: readonly string[];
}

// Re-exported so callers keep one import site for the launch surface.
export { CampaignOwnedForceStaleError };

const MATERIALIZER_LOG_SERVICE = 'campaign-encounter-materializer';

function assertSourceCatalogAdmission(
  rosterUnits: readonly IRosterUnitProjection[],
  catalog: CanonicalCombatCatalogSnapshot | undefined,
): void {
  for (const unit of rosterUnits) {
    const admission = admitRosterUnitSource({
      unitSource: unit.unitSource,
      unitRef: unit.unitRef,
      catalog,
      unitId: unit.unitId,
      unitName: unit.unitName,
    });
    if (!admission.admitted) {
      throw new Error(admission.blocker.message);
    }
  }
}

function assertLaunchRoster(
  rosterUnits: readonly IRosterUnitProjection[],
): void {
  if (rosterUnits.length === 0) {
    throw new Error(
      'Mission launch requires at least one selected campaign roster unit; refusing stock fallback.',
    );
  }
  const invalidUnit = rosterUnits.find(
    (unit) => unit.readiness === 'Destroyed',
  );
  if (invalidUnit) {
    throw new Error(
      `Mission launch roster contains blocked unit ${invalidUnit.unitName}; resolve readiness before materialization.`,
    );
  }
  const unresolvedUnits = rosterUnits.filter((unit) => !unit.unitRef);
  if (unresolvedUnits.length > 0) {
    throw new Error(
      unresolvedUnits
        .map(
          (unit) =>
            `Roster unit ${unit.unitName} has no canonical unitRef; cannot launch.`,
        )
        .join(' '),
    );
  }
}

export async function materializeCampaignMissionEncounter({
  campaign,
  missionId,
  rosterUnits,
  catalog,
  fetchImpl = fetch,
  ownedForces,
}: MaterializeCampaignMissionEncounterInput): Promise<MaterializeCampaignMissionEncounterResult> {
  try {
    assertOwnedForcesCurrent(ownedForces);
    assertSourceCatalogAdmission(rosterUnits, catalog);
    logLaunchRosterPreflightDiagnostics(campaign, missionId, rosterUnits);
    assertLaunchRoster(rosterUnits);
    const mission = campaign.missions.get(missionId);
    for (const scenarioId of mission?.scenarioIds ?? []) {
      if (await encounterExists(scenarioId, fetchImpl)) {
        const validation = await validateExistingEncounter(
          scenarioId,
          fetchImpl,
        );
        if (!validation.valid) {
          logger.diagnostic({
            level: 'warn',
            service: MATERIALIZER_LOG_SERVICE,
            event: 'campaign_mission_encounter_reuse_rejected',
            message:
              'Skipped an existing campaign mission encounter that is not launch-ready.',
            entityIds: {
              campaignId: campaign.id,
              missionId,
              encounterId: scenarioId,
            },
            metadata: {
              validationErrors: validation.errors,
              validationWarnings: validation.warnings,
            },
          });
          continue;
        }
        logger.diagnostic({
          level: 'info',
          service: MATERIALIZER_LOG_SERVICE,
          event: 'campaign_mission_encounter_reused',
          message: 'Reused an existing encounter for campaign mission launch.',
          entityIds: {
            campaignId: campaign.id,
            missionId,
            encounterId: scenarioId,
          },
          metadata: {
            missionScenarioIds: mission?.scenarioIds ?? [scenarioId],
          },
        });
        logMissionLaunchCommitSucceeded({
          campaign,
          missionId,
          rosterUnits,
          encounterId: scenarioId,
          reused: true,
        });
        return {
          encounterId: scenarioId,
          reused: true,
          missionScenarioIds: mission?.scenarioIds ?? [scenarioId],
        };
      }
    }

    // Both tactical slots field onto ONE player side (co-op D1); slot
    // attribution stays on `ownedForces.slots` for seat validation.
    const playerUnits =
      ownedForces?.kind === 'materialized'
        ? ownedPlayerForceUnits(ownedForces.slots)
        : rosterUnitsToForceUnits(rosterUnits);
    const playerForceId = await createAssignedForceWithUnits({
      name: `${campaign.name} ${mission?.name ?? missionId} Lance`,
      units: playerUnits,
      fetchImpl,
    });
    const opponentForceId = await createAssignedForceWithUnits({
      name: `${mission?.name ?? 'Campaign Mission'} OpFor`,
      // design.md proposes encounter-id seeding, but this materializer's
      // REST flow must create forces before the encounter id exists. Campaign
      // plus mission is stable before force creation, and true repeat launches
      // short-circuit through the existing-scenario reuse branch above.
      units: selectOpponentUnits({
        // Sized off the units actually fielded, not the caller roster -
        // two slots' union is what the OpFor has to answer.
        count: playerUnits.length,
        seed: `${campaign.id}:${missionId}`,
      }),
      fetchImpl,
    });
    const encounterId = await createConfiguredEncounter({
      campaign,
      mission,
      missionId,
      fetchImpl,
    });

    await attachEncounterForce({
      encounterId,
      forceId: playerForceId,
      side: 'player-force',
      fetchImpl,
    });
    await attachEncounterForce({
      encounterId,
      forceId: opponentForceId,
      side: 'opponent-force',
      fetchImpl,
    });

    logger.diagnostic({
      level: 'info',
      service: MATERIALIZER_LOG_SERVICE,
      event: 'campaign_mission_encounter_materialized',
      message: 'Created a playable encounter for campaign mission launch.',
      entityIds: {
        campaignId: campaign.id,
        missionId,
        encounterId,
        playerForceId,
        opponentForceId,
      },
      metadata: {
        rosterUnitCount: rosterUnits.length,
        selectedRosterUnitIds: rosterUnits.map((unit) => unit.unitId),
        missionScenarioIds: [encounterId, ...(mission?.scenarioIds ?? [])],
      },
    });
    logMissionLaunchCommitSucceeded({
      campaign,
      missionId,
      rosterUnits,
      encounterId,
      reused: false,
      playerForceId,
      opponentForceId,
    });

    return {
      encounterId,
      reused: false,
      missionScenarioIds: [encounterId, ...(mission?.scenarioIds ?? [])],
    };
  } catch (error) {
    logger.diagnostic({
      level: 'error',
      service: MATERIALIZER_LOG_SERVICE,
      event: 'campaign_mission_encounter_failed',
      message: 'Failed to materialize a campaign mission encounter.',
      entityIds: {
        campaignId: campaign.id,
        missionId,
      },
      metadata: {
        rosterUnitCount: rosterUnits.length,
      },
      error,
    });
    if (!isRosterPreflightFailure(rosterUnits)) {
      logMissionLaunchCommitRejected({
        campaign,
        missionId,
        rosterUnits,
        error,
      });
    }
    throw error;
  }
}
