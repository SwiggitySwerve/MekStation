/**
 * Equipment Filters API
 *
 * Returns available filter options for the equipment browser.
 *
 * GET /api/equipment/filters - Get all available filter values
 *
 * @spec openspec/specs/equipment-services/spec.md
 */
import type { NextApiRequest, NextApiResponse } from 'next';

import { RulesLevel } from '@/types/enums/RulesLevel';
import { TechBase } from '@/types/enums/TechBase';
import { EquipmentCategory } from '@/types/equipment';

interface FilterOptions {
  categories: Array<{ value: string; label: string }>;
  techBases: Array<{ value: string; label: string }>;
  rulesLevels: Array<{ value: string; label: string }>;
}

interface ApiResponse {
  success: boolean;
  data?: FilterOptions;
  error?: string;
}

/**
 * Format enum value to display label
 */
function formatLabel(value: string): string {
  return value
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>,
): Promise<void> {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use GET.',
    });
  }

  try {
    const filters: FilterOptions = {
      categories: Object.values(EquipmentCategory).map((value) => ({
        value,
        label: formatLabel(value),
      })),
      techBases: Object.values(TechBase).map((value) => ({
        value,
        label: formatLabel(value),
      })),
      rulesLevels: Object.values(RulesLevel).map((value) => ({
        value,
        label: formatLabel(value),
      })),
    };

    return res.status(200).json({
      success: true,
      data: filters,
    });
  } catch (error) {
    console.error('Equipment Filters API error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}
