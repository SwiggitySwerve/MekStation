import type { ICampaign } from '@/types/campaign/Campaign';
import type { IMission } from '@/types/campaign/Mission';
import type { IRosterUnitProjection } from '@/types/campaign/RosterUnitProjection';
import type { IForce } from '@/types/force';

import { TerrainPreset, VictoryConditionType } from '@/types/encounter';
import { ForceType } from '@/types/force';
import { logger } from '@/utils/logger';

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

const DEFAULT_PLAYER_UNIT_REF = 'atlas-as7-d';
const DEFAULT_OPPONENT_UNIT_REF = 'marauder-mad-3r';

const CANONICAL_UNIT_REFS = new Set([
  DEFAULT_PLAYER_UNIT_REF,
  DEFAULT_OPPONENT_UNIT_REF,
]);

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

function selectPlayerUnitRef(
  rosterUnits: readonly IRosterUnitProjection[],
): string {
  const rosterUnit =
    rosterUnits.find((unit) => unit.readiness === 'Ready') ?? rosterUnits[0];
  if (!rosterUnit) return DEFAULT_PLAYER_UNIT_REF;
  if (CANONICAL_UNIT_REFS.has(rosterUnit.unitId)) return rosterUnit.unitId;

  const label =
    `${rosterUnit.unitName} ${rosterUnit.chassisVariant}`.toLowerCase();
  if (label.includes('marauder') || label.includes('heavy')) {
    return DEFAULT_OPPONENT_UNIT_REF;
  }
  return DEFAULT_PLAYER_UNIT_REF;
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
}

async function createAssignedForce({
  name,
  unitRef,
  fetchImpl,
}: {
  readonly name: string;
  readonly unitRef: string;
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
  const assignmentId = created.force?.assignments[0]?.id;
  if (!forceId || !assignmentId) {
    throw new Error('Created force did not include an assignable slot');
  }

  const assignResponse = await fetchImpl(
    `/api/forces/assignments/${encodeURIComponent(assignmentId)}`,
    {
      method: 'PUT',
      headers: apiJsonHeaders(),
      body: JSON.stringify({ unitId: unitRef }),
    },
  );
  const assigned = await readApiJson<ApiFailurePayload>(
    assignResponse,
    'Failed to assign unit to force',
  );
  assertOperationSuccess(assigned, 'Failed to assign unit to force');
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
        return {
          encounterId: scenarioId,
          reused: true,
          missionScenarioIds: mission?.scenarioIds ?? [scenarioId],
        };
      }
    }

    const playerForceId = await createAssignedForce({
      name: `${campaign.name} ${mission?.name ?? missionId} Lance`,
      unitRef: selectPlayerUnitRef(rosterUnits),
      fetchImpl,
    });
    const opponentForceId = await createAssignedForce({
      name: `${mission?.name ?? 'Campaign Mission'} OpFor`,
      unitRef: DEFAULT_OPPONENT_UNIT_REF,
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
    throw error;
  }
}
