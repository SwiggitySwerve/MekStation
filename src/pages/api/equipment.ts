/**
 * Equipment API
 * 
 * Query and retrieve equipment data.
 * 
 * GET /api/equipment - List/query equipment
 * GET /api/equipment?id=<id> - Get single equipment by ID
 * 
 * Query Parameters:
 * - id: Get specific equipment by ID
 * - category: Filter by category (ENERGY_WEAPON, BALLISTIC_WEAPON, etc.)
 * - techBase: Filter by tech base (INNER_SPHERE, CLAN, BOTH)
 * - year: Filter by availability year
 * - search: Search by name
 * - rulesLevel: Filter by rules level
 * - maxWeight: Maximum weight in tons
 * - maxSlots: Maximum critical slots
 * 
 * @spec openspec/specs/equipment-services/spec.md
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { equipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { IEquipmentQueryCriteria } from '@/services/common/types';
import { TechBase } from '@/types/enums/TechBase';
import { RulesLevel } from '@/types/enums/RulesLevel';
import { EquipmentCategory } from '@/types/equipment';

interface ApiResponse {
  success: boolean;
  data?: unknown;
  error?: string;
  count?: number;
}

/**
 * Type guard to validate EquipmentCategory enum value
 */
function isValidEquipmentCategory(value: string): value is EquipmentCategory {
  return Object.values(EquipmentCategory).includes(value as EquipmentCategory);
}

/**
 * Type guard to validate TechBase enum value
 */
function isValidTechBase(value: string): value is TechBase {
  return Object.values(TechBase).includes(value as TechBase);
}

/**
 * Type guard to validate RulesLevel enum value
 */
function isValidRulesLevel(value: string): value is RulesLevel {
  return Object.values(RulesLevel).includes(value as RulesLevel);
}

/**
 * Parse string to integer, returning undefined if invalid
 */
function parseIntOrUndefined(value: string): number | undefined {
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? undefined : parsed;
}

/**
 * Parse string to float, returning undefined if invalid
 */
function parseFloatOrUndefined(value: string): number | undefined {
  const parsed = parseFloat(value);
  return isNaN(parsed) ? undefined : parsed;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
): Promise<void> {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use GET.',
    });
  }

  try {
    const { 
      id, 
      category, 
      techBase, 
      year, 
      search, 
      rulesLevel,
      maxWeight,
      maxSlots 
    } = req.query;

    // Get single equipment by ID
    if (id && typeof id === 'string') {
      const equipment = equipmentLookupService.getById(id);
      
      if (!equipment) {
        return res.status(404).json({
          success: false,
          error: `Equipment not found: ${id}`,
        });
      }

      return res.status(200).json({
        success: true,
        data: equipment,
      });
    }

    // Build query criteria from query parameters using type-safe spread
    const criteria: IEquipmentQueryCriteria = {
      ...(typeof category === 'string' && isValidEquipmentCategory(category) && { category }),
      ...(typeof techBase === 'string' && isValidTechBase(techBase) && { techBase }),
      ...(typeof year === 'string' && { year: parseIntOrUndefined(year) }),
      ...(typeof search === 'string' && { nameQuery: search }),
      ...(typeof rulesLevel === 'string' && isValidRulesLevel(rulesLevel) && { rulesLevel }),
      ...(typeof maxWeight === 'string' && { maxWeight: parseFloatOrUndefined(maxWeight) }),
      ...(typeof maxSlots === 'string' && { maxSlots: parseIntOrUndefined(maxSlots) }),
    };

    // Query equipment
    const equipment = equipmentLookupService.query(criteria);

    return res.status(200).json({
      success: true,
      data: equipment,
      count: equipment.length,
    });

  } catch (error) {
    console.error('Equipment API error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}
