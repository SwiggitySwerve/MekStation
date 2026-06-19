/**
 * Units API
 *
 * Query and retrieve canonical unit data.
 *
 * GET /api/units - List/query units
 * GET /api/units?id=<id> - Get single unit by ID
 *
 * Query Parameters:
 * - id: Get specific unit by ID
 * - techBase: Filter by tech base (INNER_SPHERE, CLAN, BOTH)
 * - era: Filter by era
 * - weightClass: Filter by weight class (LIGHT, MEDIUM, HEAVY, ASSAULT)
 * - unitType: Filter by unit type (BattleMech, Vehicle, etc.)
 * - minTonnage: Minimum tonnage
 * - maxTonnage: Maximum tonnage
 *
 * @spec openspec/specs/unit-services/spec.md
 */
import type { NextApiRequest, NextApiResponse } from 'next';

import {
  rejectNonGetDataRequest as rejectUnitsNonGet,
  sendLoggedSuccessApiError,
  type ApiDataResponse,
} from '@/pages-modules/api/routeHelpers';
import { IUnitQueryCriteria } from '@/services/common/types';
import { getCanonicalUnitService } from '@/services/units/CanonicalUnitService';
import { Era } from '@/types/enums/Era';
import { TechBase } from '@/types/enums/TechBase';
import { WeightClass } from '@/types/enums/WeightClass';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

type UnitsApiResponse = ApiDataResponse;

/**
 * Type guard to validate TechBase enum value
 */
function isValidTechBase(value: string): value is TechBase {
  return Object.values(TechBase).includes(value as TechBase);
}

/**
 * Type guard to validate Era enum value
 */
function isValidEra(value: string): value is Era {
  return Object.values(Era).includes(value as Era);
}

/**
 * Type guard to validate WeightClass enum value
 */
function isValidWeightClass(value: string): value is WeightClass {
  return Object.values(WeightClass).includes(value as WeightClass);
}

/**
 * Type guard to validate UnitType
 */
function isValidUnitType(value: string): value is UnitType {
  return Object.values(UnitType).includes(value as UnitType);
}

/**
 * Parse string to integer, returning undefined if invalid
 */
function parseIntOrUndefined(value: string): number | undefined {
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? undefined : parsed;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<UnitsApiResponse>,
): Promise<void> {
  if (rejectUnitsNonGet(req, res)) return;

  try {
    const { id, techBase, era, weightClass, unitType, minTonnage, maxTonnage } =
      req.query;

    // Get single unit by ID
    if (id && typeof id === 'string') {
      const unit = await getCanonicalUnitService().getById(id);

      if (!unit) {
        return res.status(404).json({
          success: false,
          error: `Unit not found: ${id}`,
        });
      }

      return res.status(200).json({
        success: true,
        data: unit,
      });
    }

    // Build query criteria from query parameters using type-safe spread
    const criteria: IUnitQueryCriteria = {
      ...(typeof techBase === 'string' &&
        isValidTechBase(techBase) && { techBase }),
      ...(typeof era === 'string' && isValidEra(era) && { era }),
      ...(typeof weightClass === 'string' &&
        isValidWeightClass(weightClass) && { weightClass }),
      ...(typeof unitType === 'string' &&
        isValidUnitType(unitType) && { unitType }),
      ...(typeof minTonnage === 'string' && {
        minTonnage: parseIntOrUndefined(minTonnage),
      }),
      ...(typeof maxTonnage === 'string' && {
        maxTonnage: parseIntOrUndefined(maxTonnage),
      }),
    };

    // Query units
    const units = await getCanonicalUnitService().query(criteria);

    return res.status(200).json({
      success: true,
      data: units,
      count: units.length,
    });
  } catch (error) {
    sendLoggedSuccessApiError(res, 'Units API error:', error);
    return;
  }
}
