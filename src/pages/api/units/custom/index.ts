/**
 * Custom Units API - List and Create
 *
 * GET /api/units/custom - List all custom units
 * POST /api/units/custom - Create a new custom unit
 *
 * @spec openspec/specs/unit-services/spec.md
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import {
  initializeApiDatabase,
  sendCaughtApiError,
  type ApiErrorResponse,
} from '@/pages-modules/api/routeHelpers';
import { getUnitRepository } from '@/services/units/UnitRepository';
import {
  ICustomUnitIndexEntry,
  ICreateUnitRequest,
  IUnitOperationResult,
} from '@/types/persistence/UnitPersistence';

/**
 * Response types
 */
type ListResponse = {
  units: readonly ICustomUnitIndexEntry[];
  count: number;
};

type CreateResponse = IUnitOperationResult;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ListResponse | CreateResponse | ApiErrorResponse>,
): Promise<void> {
  if (!initializeApiDatabase(res)) return;

  const unitRepository = getUnitRepository();

  switch (req.method) {
    case 'GET':
      return handleGet(unitRepository, res);
    case 'POST':
      return handlePost(unitRepository, req, res);
    default:
      res.setHeader('Allow', ['GET', 'POST']);
      return res
        .status(405)
        .json({ error: `Method ${req.method} Not Allowed` });
  }
}

/**
 * GET /api/units/custom - List all custom units
 */
function handleGet(
  unitRepository: ReturnType<typeof getUnitRepository>,
  res: NextApiResponse<ListResponse | ApiErrorResponse>,
) {
  try {
    const units = unitRepository.list();
    return res.status(200).json({
      units,
      count: units.length,
    });
  } catch (error) {
    sendCaughtApiError(res, error, 'Failed to list units');
    return;
  }
}

/**
 * POST /api/units/custom - Create a new custom unit
 */
function handlePost(
  unitRepository: ReturnType<typeof getUnitRepository>,
  req: NextApiRequest,
  res: NextApiResponse<CreateResponse | ApiErrorResponse>,
) {
  try {
    const body = req.body as ICreateUnitRequest;

    // Validate required fields
    if (!body.chassis || !body.variant || !body.data) {
      return res.status(400).json({
        error: 'Missing required fields: chassis, variant, data',
      });
    }

    const result = unitRepository.create(body);

    if (result.success) {
      return res.status(201).json(result);
    } else {
      return res.status(400).json(result);
    }
  } catch (error) {
    sendCaughtApiError(res, error, 'Failed to create unit');
    return;
  }
}
