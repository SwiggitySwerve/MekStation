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

import {
  rejectNonGetDataRequest as rejectEquipmentFiltersNonGet,
  sendLoggedSuccessApiError,
  type ApiDataResponse,
} from '@/pages-modules/api/routeHelpers';
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

type EquipmentFiltersApiResponse = ApiResponse;

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
  res: NextApiResponse<EquipmentFiltersApiResponse>,
): Promise<void> {
  if (rejectEquipmentFiltersNonGet(req, res)) return;

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
    sendLoggedSuccessApiError(res, 'Equipment Filters API error:', error);
    return;
  }
}
