/**
 * REST choreography for scenario materialization.
 *
 * The three calls that actually build an encounter out of the forces
 * API: create a lance and fill its assignment slots, create and
 * configure the encounter, attach a force to a side. Extracted from the
 * materializer so that file stays the ORCHESTRATION - which order things
 * happen in, and what refuses - rather than also being the transport.
 *
 * Every response goes through `assertOperationSuccess`: a 200 carrying
 * `success: false` is a failure, and treating it as one here means the
 * caller never has to re-check.
 *
 * @module lib/campaign/encounter/materializeCampaignMissionEncounter.rest
 */

import type { ICampaign } from '@/types/campaign/Campaign';
import type { IMission } from '@/types/campaign/Mission';
import type { IForce } from '@/types/force';

import { TerrainPreset, VictoryConditionType } from '@/types/encounter';
import { ForceType } from '@/types/force';

import type { AssignedForceUnit } from './materializeCampaignMissionEncounter.forceUnits';

import {
  type ApiFailurePayload,
  apiJsonHeaders,
  assertOperationSuccess,
  type FetchImpl,
  readApiJson,
} from './materializeCampaignMissionEncounter.api';

type CampaignMissionSource = Pick<ICampaign, 'id' | 'name' | 'missions'>;
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

export async function createAssignedForceWithUnits({
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

export async function createConfiguredEncounter({
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

export async function attachEncounterForce({
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
