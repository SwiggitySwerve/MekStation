/**
 * Unit Import API - Import Unit from JSON
 * 
 * POST /api/units/import - Import a unit from JSON file
 * 
 * @spec openspec/specs/unit-services/spec.md
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getSQLiteService } from '@/services/persistence/SQLiteService';
import { getUnitRepository } from '@/services/units/UnitRepository';
import {
  ISerializedUnitEnvelope,
  IImportResult,
  UnitErrorCode,
} from '@/types/persistence/UnitPersistence';

/**
 * Expected format version
 */
const SUPPORTED_FORMAT_VERSIONS = ['1.0.0'];

/**
 * Request body type - can be envelope or raw unit data
 */
type ImportRequestBody = ISerializedUnitEnvelope | {
  chassis: string;
  variant?: string;
  model?: string;
  tonnage?: number;
  techBase?: string;
  era?: string;
  rulesLevel?: string;
  unitType?: string;
  [key: string]: unknown;
};

/**
 * Response types
 */
type ImportResponse = IImportResult;

type ErrorResponse = {
  error: string;
  code?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ImportResponse | ErrorResponse>
): Promise<void> {
  // Initialize database
  try {
    getSQLiteService().initialize();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Database initialization failed';
    return res.status(500).json({ error: message });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const body = req.body as ImportRequestBody;

  if (!body) {
    return res.status(400).json({
      error: 'Missing request body',
    });
  }

  try {
    // Determine if this is an envelope or raw unit data
    let unitData: Record<string, unknown>;
    
    if ('formatVersion' in body && 'unit' in body) {
      // This is an envelope
      const envelope = body as ISerializedUnitEnvelope;
      
      // Validate format version
      if (!SUPPORTED_FORMAT_VERSIONS.includes(envelope.formatVersion)) {
        return res.status(400).json({
          success: false,
          error: `Unsupported format version: ${envelope.formatVersion}. Supported versions: ${SUPPORTED_FORMAT_VERSIONS.join(', ')}`,
        });
      }
      
      unitData = envelope.unit;
    } else {
      // This is raw unit data
      unitData = body as Record<string, unknown>;
    }

    // Validate required fields
    const validationErrors: string[] = [];
    
    if (!unitData.chassis || typeof unitData.chassis !== 'string') {
      validationErrors.push('Missing or invalid field: chassis');
    }
    
    // Accept either 'variant' or 'model' for compatibility
    const variant = (unitData.variant || unitData.model) as string | undefined;
    if (!variant) {
      validationErrors.push('Missing field: variant or model');
    }

    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        validationErrors,
      });
    }

    const chassis = unitData.chassis as string;
    const unitRepository = getUnitRepository();

    // Check for name conflict
    if (unitRepository.nameExists(chassis, variant!)) {
      const suggestion = unitRepository.suggestCloneName(chassis, variant!);
      return res.status(409).json({
        success: false,
        error: `Unit "${chassis} ${variant}" already exists`,
        suggestedName: `${suggestion.chassis} ${suggestion.suggestedVariant}`,
      });
    }

    // Create the unit
    const result = unitRepository.create({
      chassis,
      variant: variant!,
      data: unitData,
      notes: 'Imported from JSON file',
    });

    if (result.success) {
      return res.status(201).json({
        success: true,
        unitId: result.id,
      });
    } else {
      return res.status(400).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to import unit';
    return res.status(500).json({
      error: message,
    });
  }
}

