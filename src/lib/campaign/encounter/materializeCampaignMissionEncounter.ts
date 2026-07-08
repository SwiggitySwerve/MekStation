import type { ICampaign } from '@/types/campaign/Campaign';
import type { IMission } from '@/types/campaign/Mission';
import type { IRosterUnitProjection } from '@/types/campaign/RosterUnitProjection';
import type { IForce } from '@/types/force';

import {
  isRosterPreflightFailure,
  logLaunchRosterPreflightDiagnostics,
  logMissionLaunchCommitRejected,
  logMissionLaunchCommitSucceeded,
} from '@/lib/campaign/encounter/missionLaunchCommandDiagnostics';
import { TerrainPreset, VictoryConditionType } from '@/types/encounter';
import { ForceType } from '@/types/force';
import { logger } from '@/utils/logger';

import {
  type AssignedForceUnit,
  rosterUnitsToForceUnits,
  selectOpponentUnits,
} from './materializeCampaignMissionEncounter.forceUnits';

type FetchImpl = typeof fetch;

type CampaignMissionSource = Pick<ICampaign, 'id' | 'name' | 'missions'>;

interface ApiFailurePayload {
  readonly error?: string;
  readonly message?: string;
  readonly success?: boolean;
}

interface ForceApiResponse extends ApiFailurePayload {
  readonly id?: string;
  readonly force?: Pick<IForce, 'id' | 'assignments'>;
}

interface EncounterApiResponse extends ApiFailurePayload {
  readonly id?: string;
  readonly encounter?: {
    readonly id: string;
  };
}

export interface MaterializeCampaignMissionEncounterInput {
  readonly campaign: CampaignMissionSource;
  readonly missionId: string;
  readonly rosterUnits: readonly IRosterUnitProjection[];
  readonly fetchImpl?: FetchImpl;
}

export interface MaterializeCampaignMissionEncounterResult {
  readonly encounterId: string;
  readonly reused: boolean;
  readonly missionScenarioIds: readonly string[];
}

const MATERIALIZER_LOG_SERVICE = 'campaign-encounter-materializer';

function apiJsonHeaders(): HeadersInit {
  return { 'Content-Type': 'application/json' };
}

function messageFromPayload(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== 'object') return fallback;
  const candidate = payload as ApiFailurePayload;
  return candidate.error ?? candidate.message ?? fallback;
}

async function readApiJson<T>(
  response: Response,
  fallback: string,
): Promise<T> {
  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }
  if (!response.ok) {
    throw new Error(messageFromPayload(payload, fallback));
  }
  return payload as T;
}

function assertOperationSuccess(
  payload: ApiFailurePayload,
  fallback: string,
): void {
  if (payload.success === false) {
    throw new Error(messageFromPayload(payload, fallback));
  }
}

async function encounterExists(
  encounterId: string,
  fetchImpl: FetchImpl,
): Promise<boolean> {
  const response = await fetchImpl(
    `/api/encounters/${encodeURIComponent(encounterId)}`,
  );
  if (response.ok) return true;
  if (response.status === 404) return false;
  await readApiJson(response, 'Failed to check existing encounter');
  return false;
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

async function createAssignedForceWithUnits({
  name,
  units,
  fetchImpl,
}: {
  readonly name: string;
  readonly units: readonly AssignedForceUnit[];
  readonly fetchImpl: FetchImpl;
}): Promise<string> {
  const createResponse = await fetchImpl('/api/forces', {
    method: 'POST',
    headers: apiJsonHeaders(),
    body: JSON.stringify({
      name,
      forceType: ForceType.Lance,
    }),
  });
  const created = await readApiJson<ForceApiResponse>(
    createResponse,
    'Failed to create force',
  );
  assertOperationSuccess(created, 'Failed to create force');

  const forceId = created.force?.id ?? created.id;
  if (!forceId) {
    throw new Error('Force creation did not return a force id');
  }

  const assignmentSlots = created.force?.assignments ?? [];
  if (units.length > assignmentSlots.length) {
    throw new Error(
      `Created Lance force provided ${assignmentSlots.length} assignment slots, but ${units.length} units were selected; refusing to drop units.`,
    );
  }

  for (let index = 0; index < units.length; index += 1) {
    const assignmentId = assignmentSlots[index]?.id;
    if (!assignmentId) {
      throw new Error(
        `Created force did not include assignment slot ${index + 1}`,
      );
    }

    const unit = units[index];
    if (!unit) {
      throw new Error(`Missing unit payload for assignment slot ${index + 1}`);
    }
    const assignResponse = await fetchImpl(
      `/api/forces/assignments/${encodeURIComponent(assignmentId)}`,
      {
        method: 'PUT',
        headers: apiJsonHeaders(),
        body: JSON.stringify({
          unitId: unit.unitRef,
          pilotId: unit.pilotRef,
        }),
      },
    );
    const assigned = await readApiJson<ApiFailurePayload>(
      assignResponse,
      'Failed to assign unit to force',
    );
    assertOperationSuccess(assigned, 'Failed to assign unit to force');
  }

  return forceId;
}

async function createConfiguredEncounter({
  campaign,
  mission,
  missionId,
  fetchImpl,
}: {
  readonly campaign: CampaignMissionSource;
  readonly mission: IMission | undefined;
  readonly missionId: string;
  readonly fetchImpl: FetchImpl;
}): Promise<string> {
  const createResponse = await fetchImpl('/api/encounters', {
    method: 'POST',
    headers: apiJsonHeaders(),
    body: JSON.stringify({
      name: mission?.name ?? `Campaign Mission ${missionId}`,
      description:
        mission?.description ??
        `Campaign mission ${missionId} for ${campaign.name}.`,
    }),
  });
  const created = await readApiJson<EncounterApiResponse>(
    createResponse,
    'Failed to create encounter',
  );
  assertOperationSuccess(created, 'Failed to create encounter');

  const encounterId = created.encounter?.id ?? created.id;
  if (!encounterId) {
    throw new Error('Encounter creation did not return an encounter id');
  }

  const patchResponse = await fetchImpl(
    `/api/encounters/${encodeURIComponent(encounterId)}`,
    {
      method: 'PATCH',
      headers: apiJsonHeaders(),
      body: JSON.stringify({
        mapConfig: {
          radius: 8,
          terrain: TerrainPreset.Clear,
          playerDeploymentZone: 'south',
          opponentDeploymentZone: 'north',
        },
        victoryConditions: [{ type: VictoryConditionType.DestroyAll }],
        optionalRules: [],
      }),
    },
  );
  const patched = await readApiJson<ApiFailurePayload>(
    patchResponse,
    'Failed to configure encounter',
  );
  assertOperationSuccess(patched, 'Failed to configure encounter');
  return encounterId;
}

async function attachEncounterForce({
  encounterId,
  forceId,
  side,
  fetchImpl,
}: {
  readonly encounterId: string;
  readonly forceId: string;
  readonly side: 'player-force' | 'opponent-force';
  readonly fetchImpl: FetchImpl;
}): Promise<void> {
  const response = await fetchImpl(
    `/api/encounters/${encodeURIComponent(encounterId)}/${side}`,
    {
      method: 'PUT',
      headers: apiJsonHeaders(),
      body: JSON.stringify({ forceId }),
    },
  );
  const payload = await readApiJson<ApiFailurePayload>(
    response,
    `Failed to attach ${side}`,
  );
  assertOperationSuccess(payload, `Failed to attach ${side}`);
}

export async function materializeCampaignMissionEncounter({
  campaign,
  missionId,
  rosterUnits,
  fetchImpl = fetch,
}: MaterializeCampaignMissionEncounterInput): Promise<MaterializeCampaignMissionEncounterResult> {
  try {
    logLaunchRosterPreflightDiagnostics(campaign, missionId, rosterUnits);
    assertLaunchRoster(rosterUnits);
    const mission = campaign.missions.get(missionId);
    for (const scenarioId of mission?.scenarioIds ?? []) {
      if (await encounterExists(scenarioId, fetchImpl)) {
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

    const playerForceId = await createAssignedForceWithUnits({
      name: `${campaign.name} ${mission?.name ?? missionId} Lance`,
      units: rosterUnitsToForceUnits(rosterUnits),
      fetchImpl,
    });
    const opponentForceId = await createAssignedForceWithUnits({
      name: `${mission?.name ?? 'Campaign Mission'} OpFor`,
      // design.md proposes encounter-id seeding, but this materializer's
      // REST flow must create forces before the encounter id exists. Campaign
      // plus mission is stable before force creation, and true repeat launches
      // short-circuit through the existing-scenario reuse branch above.
      units: selectOpponentUnits({
        count: rosterUnits.length,
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
