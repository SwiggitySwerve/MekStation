/**
 * Suggest Clone Name API
 *
 * POST /api/units/custom/suggest-name - Get a unique name suggestion for a unit clone
 *
 * @spec openspec/specs/unit-services/spec.md
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import {
  initializeApiDatabase,
  rejectUnexpectedMethod,
  sendCaughtApiError,
  type ApiErrorResponse,
} from '@/pages-modules/api/routeHelpers';
import { getUnitRepository } from '@/services/units/UnitRepository';
import { ICloneNameSuggestion } from '@/types/persistence/UnitPersistence';

/**
 * Request body type
 */
interface SuggestNameRequest {
  chassis: string;
  variant: string;
}

/**
 * Response types
 */
type SuggestNameResponse = ICloneNameSuggestion & {
  isOriginalAvailable: boolean;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SuggestNameResponse | ApiErrorResponse>,
): Promise<void> {
  if (!initializeApiDatabase(res)) return;

  if (rejectUnexpectedMethod(req, res, ['POST'])) return;

  const body = req.body as SuggestNameRequest;

  if (!body.chassis || !body.variant) {
    return res.status(400).json({
      error: 'Missing required fields: chassis, variant',
    });
  }

  const unitRepository = getUnitRepository();

  try {
    // Check if original name is available
    const isOriginalAvailable = !unitRepository.nameExists(
      body.chassis,
      body.variant,
    );

    // Get suggestion
    const suggestion = unitRepository.suggestCloneName(
      body.chassis,
      body.variant,
    );

    return res.status(200).json({
      ...suggestion,
      isOriginalAvailable,
    });
  } catch (error) {
    sendCaughtApiError(res, error, 'Failed to suggest name');
    return;
  }
}
