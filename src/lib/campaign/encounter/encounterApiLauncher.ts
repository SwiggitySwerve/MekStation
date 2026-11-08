import type { IEncounterOperationResult } from '@/services/encounter/EncounterRepository';

import { isEncounter } from '@/types/encounter';

import type { ICampaignEncounterLauncherService } from './launchCampaignEncounter';

import {
  apiJsonHeaders,
  assertOperationSuccess,
  readApiJson,
  type FetchImpl,
} from './materializeCampaignMissionEncounter.api';

/** Browser persistence boundary; encounter rules remain in the existing APIs. */
export function createEncounterApiLauncher(
  fetchImpl: FetchImpl = fetch,
): ICampaignEncounterLauncherService {
  const encounterPath = (id: string) =>
    `/api/encounters/${encodeURIComponent(id)}`;

  async function mutate(
    path: string,
    method: 'POST' | 'PATCH' | 'PUT',
    body: unknown,
    fallback: string,
    id?: string,
  ): Promise<IEncounterOperationResult> {
    try {
      const payload = await readApiJson<unknown>(
        await fetchImpl(path, {
          method,
          headers: apiJsonHeaders(),
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(15_000),
        }),
        fallback,
      );
      if (
        !payload ||
        typeof payload !== 'object' ||
        !('success' in payload) ||
        typeof payload.success !== 'boolean'
      ) {
        throw new Error('Invalid encounter operation response');
      }
      assertOperationSuccess(
        { ...payload, success: payload.success },
        fallback,
      );
      const resultId = 'id' in payload ? payload.id : id;
      if (
        typeof resultId !== 'string' ||
        !resultId.trim() ||
        (id !== undefined && resultId !== id)
      ) {
        throw new Error('Encounter creation did not return a valid id');
      }
      return { success: true, id: resultId };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : fallback,
      };
    }
  }

  return {
    createEncounter: (input) =>
      mutate('/api/encounters', 'POST', input, 'Failed to create encounter'),
    updateEncounter: (id, input) =>
      mutate(
        encounterPath(id),
        'PATCH',
        input,
        'Failed to configure encounter',
        id,
      ),
    setPlayerForce: (id, forceId) =>
      mutate(
        `${encounterPath(id)}/player-force`,
        'PUT',
        { forceId },
        'Failed to set player force',
        id,
      ),
    launchEncounter: (id, options) =>
      mutate(
        `${encounterPath(id)}/launch`,
        'POST',
        options ?? {},
        'Failed to launch encounter',
        id,
      ),
    async getEncounter(id) {
      const response = await fetchImpl(encounterPath(id), {
        method: 'GET',
        signal: AbortSignal.timeout(15_000),
      });
      if (response.status === 404) return null;
      const payload = await readApiJson<unknown>(
        response,
        'Failed to read encounter',
      );
      if (
        !payload ||
        typeof payload !== 'object' ||
        !('encounter' in payload) ||
        !isEncounter(payload.encounter) ||
        payload.encounter.id !== id ||
        (payload.encounter.gameSessionId !== undefined &&
          typeof payload.encounter.gameSessionId !== 'string')
      ) {
        throw new Error('Invalid encounter response');
      }
      return payload.encounter;
    },
  };
}
