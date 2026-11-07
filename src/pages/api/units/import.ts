/**
 * Unit Import API - Import Unit from JSON or MTF source
 *
 * POST /api/units/import - Import JSON or { sourceFormat: 'mtf', sourceText }
 *
 * @spec openspec/specs/unit-services/spec.md
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import {
  initializeApiDatabase,
  rejectUnexpectedMethod,
  type ApiErrorResponse,
} from '@/pages-modules/api/routeHelpers';
import { importMTFDefinition } from '@/services/units/importMTFDefinition';
import { getUnitRepository } from '@/services/units/UnitRepository';
import {
  ISerializedUnitEnvelope,
  IImportResult,
} from '@/types/persistence/UnitPersistence';

/**
 * Expected format version
 */
const SUPPORTED_FORMAT_VERSIONS = ['1.0.0'];

/**
 * Response types
 */
type ImportResponse = IImportResult;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ImportResponse | ApiErrorResponse>,
): Promise<void> {
  if (!initializeApiDatabase(res)) return;

  if (rejectUnexpectedMethod(req, res, ['POST'])) return;

  const body: unknown = req.body;

  if (!body) {
    return res.status(400).json({
      error: 'Missing request body',
    });
  }
  if (typeof body !== 'object' || Array.isArray(body)) {
    return res.status(400).json({
      success: false,
      error: { message: 'Import request body must be an object' },
    });
  }

  try {
    // Determine if this is an envelope or raw unit data
    let unitData: Record<string, unknown>;
    let sourceWarnings: readonly string[] = [];
    let notes = 'Imported from JSON file';

    if ('sourceFormat' in body) {
      if (body.sourceFormat !== 'mtf') {
        return res.status(400).json({
          success: false,
          error: { message: 'Unsupported source format; expected mtf' },
        });
      }
      const imported = await importMTFDefinition(
        'sourceText' in body ? body.sourceText : undefined,
      );
      if (!imported.success) return res.status(400).json(imported);
      unitData = imported.data.definition;
      if ('variant' in body) {
        if (typeof body.variant !== 'string' || !body.variant.trim()) {
          return res.status(400).json({
            success: false,
            error: { message: 'Missing or invalid field: variant' },
          });
        }
        const variant = body.variant.trim();
        unitData = { ...unitData, model: variant, variant };
      }
      sourceWarnings = imported.data.warnings;
      notes = 'Imported from MTF file';
    } else if ('formatVersion' in body && 'unit' in body) {
      // This is an envelope
      const envelope = body as ISerializedUnitEnvelope;

      // Validate format version
      if (!SUPPORTED_FORMAT_VERSIONS.includes(envelope.formatVersion)) {
        return res.status(400).json({
          success: false,
          error: {
            message: `Unsupported format version: ${envelope.formatVersion}. Supported versions: ${SUPPORTED_FORMAT_VERSIONS.join(', ')}`,
          },
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
        error: {
          message: 'Validation failed',
          validationErrors,
        },
      });
    }

    const chassis = unitData.chassis as string;
    const unitRepository = getUnitRepository();

    // Check for name conflict
    if (unitRepository.nameExists(chassis, variant!)) {
      const suggestion = unitRepository.suggestCloneName(chassis, variant!);
      return res.status(409).json({
        success: false,
        error: {
          message: `Unit "${chassis} ${variant}" already exists`,
          suggestedName:
            'sourceFormat' in body
              ? suggestion.suggestedVariant
              : `${suggestion.chassis} ${suggestion.suggestedVariant}`,
        },
      });
    }

    // Create the unit
    const result = unitRepository.create({
      chassis,
      variant: variant!,
      data: unitData,
      notes,
    });

    if (result.success) {
      return res.status(201).json({
        success: true,
        data: {
          unitId: result.data.id,
          ...(sourceWarnings.length ? { warnings: sourceWarnings } : {}),
        },
      });
    } else {
      return res.status(400).json({
        success: false,
        error: { message: result.error.message },
      });
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to import unit';
    return res.status(500).json({
      error: message,
    });
  }
}
