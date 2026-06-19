/**
 * Encounters API - List and Create
 *
 * GET /api/encounters - List all encounters
 * POST /api/encounters - Create a new encounter
 *
 * @spec openspec/changes/add-encounter-system/specs/encounter-system/spec.md
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import {
  initializeApiDatabase,
  sendCaughtApiError,
  sendOperationFailure,
  type ApiErrorResponse,
} from '@/pages-modules/api/routeHelpers';
import {
  getEncounterRepository,
  IEncounterOperationResult,
} from '@/services/encounter/EncounterRepository';
import { getEncounterService } from '@/services/encounter/EncounterService';
import { IEncounter, ICreateEncounterInput } from '@/types/encounter';

// =============================================================================
// Response Types
// =============================================================================

/**
 * Raw stored force-id strings keyed by encounter id, returned alongside the
 * hydrated encounter array so the list page can call `encounterBrokenRefs`
 * without an extra round-trip. Per the
 * `repair-broken-encounter-drafts → Encounter List Surfaces Broken-Reference State`
 * requirement.
 */
export type RawForceIdsByEncounterId = Record<
  string,
  {
    readonly playerForceId: string | null;
    readonly opponentForceId: string | null;
  }
>;

type ListResponse = {
  encounters: readonly IEncounter[];
  count: number;
  rawForceIds: RawForceIdsByEncounterId;
};

type CreateResponse = IEncounterOperationResult & {
  encounter?: IEncounter;
};

// =============================================================================
// Handler
// =============================================================================

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ListResponse | CreateResponse | ApiErrorResponse>,
): Promise<void> {
  if (!initializeApiDatabase(res)) return;

  const encounterService = getEncounterService();

  switch (req.method) {
    case 'GET':
      return handleGet(encounterService, res);
    case 'POST':
      return handlePost(encounterService, req, res);
    default:
      res.setHeader('Allow', ['GET', 'POST']);
      return res
        .status(405)
        .json({ error: `Method ${req.method} Not Allowed` });
  }
}

/**
 * GET /api/encounters - List all encounters
 *
 * Response shape (post repair-broken-encounter-drafts PR 2):
 *   {
 *     encounters: IEncounter[],         // hydrated (forces resolved or null)
 *     count: number,
 *     rawForceIds: Record<id, {         // raw stored force-id strings
 *       playerForceId: string | null,   // for broken-pill detection on the
 *       opponentForceId: string | null  // list page (no extra round-trip).
 *     }>,
 *   }
 *
 * `rawForceIds` is sourced directly from the encounter repository (NOT the
 * service) because the service-layer hydration would have already collapsed
 * the broken refs to null and we'd lose the "the row stored a forceId"
 * signal needed to detect orphans.
 */
function handleGet(
  encounterService: ReturnType<typeof getEncounterService>,
  res: NextApiResponse<ListResponse | ApiErrorResponse>,
) {
  try {
    const encounters = encounterService.getAllEncounters();
    // Build the raw-force-ids map by reading the rows again (cheap — same
    // SQLite query, no service-layer hydration). Keyed by encounter id so
    // the list page can do `rawForceIds[encounter.id]` directly.
    const rows = getEncounterRepository().getAllEncountersWithRawIds();
    const rawForceIds: RawForceIdsByEncounterId = {};
    for (const row of rows) {
      rawForceIds[row.encounter.id] = row.rawForceIds;
    }
    return res.status(200).json({
      encounters,
      count: encounters.length,
      rawForceIds,
    });
  } catch (error) {
    sendCaughtApiError(res, error, 'Failed to list encounters');
    return;
  }
}

/**
 * POST /api/encounters - Create a new encounter
 */
function handlePost(
  encounterService: ReturnType<typeof getEncounterService>,
  req: NextApiRequest,
  res: NextApiResponse<CreateResponse | ApiErrorResponse>,
) {
  try {
    const body = req.body as ICreateEncounterInput;

    if (!body.name) {
      return res.status(400).json({ error: 'Missing required field: name' });
    }

    const result = encounterService.createEncounter(body);

    if (result.success && result.id) {
      const encounter = encounterService.getEncounter(result.id);
      return res
        .status(201)
        .json({ ...result, encounter: encounter || undefined });
    } else {
      sendOperationFailure(res, result, 'Failed to create encounter');
      return;
    }
  } catch (error) {
    sendCaughtApiError(res, error, 'Failed to create encounter');
    return;
  }
}
