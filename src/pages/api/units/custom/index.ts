/**
 * Custom Units API - List and Create
 * 
 * GET /api/units/custom - List all custom units
 * POST /api/units/custom - Create a new custom unit
 * 
 * @spec openspec/specs/unit-services/spec.md
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getSQLiteService } from '@/services/persistence/SQLiteService';
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

type ErrorResponse = {
  error: string;
  code?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ListResponse | CreateResponse | ErrorResponse>
): Promise<void> {
  // Initialize database
  try {
    getSQLiteService().initialize();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Database initialization failed';
    return res.status(500).json({ error: message });
  }

  const unitRepository = getUnitRepository();

  switch (req.method) {
    case 'GET':
      return handleGet(unitRepository, res);
    case 'POST':
      return handlePost(unitRepository, req, res);
    default:
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}

/**
 * GET /api/units/custom - List all custom units
 */
function handleGet(
  unitRepository: ReturnType<typeof getUnitRepository>,
  res: NextApiResponse<ListResponse | ErrorResponse>
) {
  try {
    const units = unitRepository.list();
    return res.status(200).json({
      units,
      count: units.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to list units';
    return res.status(500).json({ error: message });
  }
}

/**
 * POST /api/units/custom - Create a new custom unit
 */
function handlePost(
  unitRepository: ReturnType<typeof getUnitRepository>,
  req: NextApiRequest,
  res: NextApiResponse<CreateResponse | ErrorResponse>
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
    const message = error instanceof Error ? error.message : 'Failed to create unit';
    return res.status(500).json({ error: message });
  }
}

