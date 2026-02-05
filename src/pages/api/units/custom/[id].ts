/**
 * Custom Unit API - Single Unit Operations
 *
 * GET /api/units/custom/:id - Get a custom unit by ID
 * PUT /api/units/custom/:id - Update a custom unit
 * DELETE /api/units/custom/:id - Delete a custom unit
 *
 * @spec openspec/specs/unit-services/spec.md
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import { getSQLiteService } from '@/services/persistence/SQLiteService';
import { getUnitRepository } from '@/services/units/UnitRepository';
import {
  ICustomUnitRecord,
  IUpdateUnitRequest,
  IUnitOperationResult,
} from '@/types/persistence/UnitPersistence';

/**
 * Response types
 */
type GetResponse = ICustomUnitRecord & { parsedData: Record<string, unknown> };

type UpdateResponse = IUnitOperationResult;

type DeleteResponse = IUnitOperationResult;

type ErrorResponse = {
  error: string;
  code?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<
    GetResponse | UpdateResponse | DeleteResponse | ErrorResponse
  >,
): Promise<void> {
  // Initialize database
  try {
    getSQLiteService().initialize();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Database initialization failed';
    return res.status(500).json({ error: message });
  }

  const unitRepository = getUnitRepository();
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Missing unit ID' });
  }

  switch (req.method) {
    case 'GET':
      return handleGet(unitRepository, id, res);
    case 'PUT':
      return handlePut(unitRepository, id, req, res);
    case 'DELETE':
      return handleDelete(unitRepository, id, res);
    default:
      res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
      return res
        .status(405)
        .json({ error: `Method ${req.method} Not Allowed` });
  }
}

/**
 * GET /api/units/custom/:id - Get a custom unit by ID
 */
function handleGet(
  unitRepository: ReturnType<typeof getUnitRepository>,
  id: string,
  res: NextApiResponse<GetResponse | ErrorResponse>,
) {
  try {
    const unit = unitRepository.getById(id);

    if (!unit) {
      return res.status(404).json({ error: `Unit "${id}" not found` });
    }

    // Parse the JSON data for client convenience
    const parsedData = JSON.parse(unit.data) as Record<string, unknown>;

    return res.status(200).json({
      ...unit,
      parsedData,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to get unit';
    return res.status(500).json({ error: message });
  }
}

/**
 * PUT /api/units/custom/:id - Update a custom unit (saves new version)
 */
function handlePut(
  unitRepository: ReturnType<typeof getUnitRepository>,
  id: string,
  req: NextApiRequest,
  res: NextApiResponse<UpdateResponse | ErrorResponse>,
) {
  try {
    const body = req.body as IUpdateUnitRequest;

    // Validate required fields
    if (!body.data) {
      return res.status(400).json({
        error: 'Missing required field: data',
      });
    }

    const result = unitRepository.update(id, body);

    if (result.success) {
      return res.status(200).json(result);
    } else {
      const statusCode = result.error.errorCode === 'NOT_FOUND' ? 404 : 400;
      return res.status(statusCode).json(result);
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to update unit';
    return res.status(500).json({ error: message });
  }
}

/**
 * DELETE /api/units/custom/:id - Delete a custom unit
 */
function handleDelete(
  unitRepository: ReturnType<typeof getUnitRepository>,
  id: string,
  res: NextApiResponse<DeleteResponse | ErrorResponse>,
) {
  try {
    const result = unitRepository.delete(id);

    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(400).json(result);
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to delete unit';
    return res.status(500).json({ error: message });
  }
}
