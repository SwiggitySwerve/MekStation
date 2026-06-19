/**
 * Encounters API - Launch
 *
 * POST /api/encounters/[id]/launch - Launch an encounter (start game session)
 *
 * @spec openspec/changes/add-encounter-system/specs/encounter-system/spec.md
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import {
  initializeApiDatabase as initLaunchEncounterDb,
  rejectMissingQueryString as readLaunchEncounterId,
  rejectUnexpectedMethod as rejectLaunchMethod,
  sendCaughtApiError as sendLaunchEncounterError,
  sendOperationFailure as sendLaunchEncounterFailure,
  type ApiErrorResponse,
} from '@/pages-modules/api/routeHelpers';
import { IEncounterOperationResult } from '@/services/encounter/EncounterRepository';
import {
  getEncounterService,
  type ILaunchEncounterOptions,
} from '@/services/encounter/EncounterService';
import { IEncounter } from '@/types/encounter';

const ENCOUNTERS_ID_LAUNCH_TS_FAILED_TO_LAUNCH_ENCOUNTER_1 =
  'Failed to launch encounter';
const LAUNCH_ENCOUNTER_ID_ERROR = 'Missing or invalid encounter ID';

// =============================================================================
// Response Types
// =============================================================================

type LaunchResponse = IEncounterOperationResult & {
  encounter?: IEncounter;
  gameSessionId?: string;
};

function readOptionalId(
  body: Record<string, unknown>,
  key: keyof ILaunchEncounterOptions,
): string | null | undefined {
  const value = body[key];
  if (typeof value === 'string' || value === null) {
    return value;
  }
  return undefined;
}

function parseLaunchOptions(body: unknown): ILaunchEncounterOptions {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return {};
  }

  const record = body as Record<string, unknown>;
  return {
    campaignId: readOptionalId(record, 'campaignId'),
    contractId: readOptionalId(record, 'contractId'),
    scenarioId: readOptionalId(record, 'scenarioId'),
  };
}

// =============================================================================
// Handler
// =============================================================================

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<LaunchResponse | ApiErrorResponse>,
): Promise<void> {
  if (!initLaunchEncounterDb(res)) return;

  if (rejectLaunchMethod(req, res, ['POST'])) return;

  const id = readLaunchEncounterId(req, res, 'id', LAUNCH_ENCOUNTER_ID_ERROR);
  if (!id) return;

  const encounterService = getEncounterService();

  try {
    const result = encounterService.launchEncounter(
      id,
      parseLaunchOptions(req.body),
    );

    if (result.success) {
      const encounter = encounterService.getEncounter(id);
      return res.status(200).json({
        ...result,
        encounter: encounter || undefined,
        gameSessionId: encounter?.gameSessionId,
      });
    } else {
      sendLaunchEncounterFailure(
        res,
        result,
        ENCOUNTERS_ID_LAUNCH_TS_FAILED_TO_LAUNCH_ENCOUNTER_1,
      );
      return;
    }
  } catch (error) {
    sendLaunchEncounterError(
      res,
      error,
      ENCOUNTERS_ID_LAUNCH_TS_FAILED_TO_LAUNCH_ENCOUNTER_1,
    );
    return;
  }
}
