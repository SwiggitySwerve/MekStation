/**
 * Equipment Catalog API
 *
 * Get all equipment organized by category.
 *
 * GET /api/equipment/catalog - Get all equipment
 * GET /api/equipment/catalog?type=weapons - Get only weapons
 * GET /api/equipment/catalog?type=ammunition - Get only ammunition
 *
 * Response includes metadata about the data source:
 * - dataSource: 'json' | 'fallback' - indicates whether JSON files or hardcoded constants were used
 *
 * @spec openspec/specs/equipment-services/spec.md
 */
import type { NextApiRequest, NextApiResponse } from 'next';

import {
  rejectNonGetDataRequest as rejectEquipmentCatalogNonGet,
  sendLoggedSuccessApiError,
  type ApiDataResponse,
} from '@/pages-modules/api/routeHelpers';
import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';

interface ApiResponse {
  success: boolean;
  data?: unknown;
  error?: string;
  count?: number;
  /** Data source used: 'json' for runtime-loaded JSON, 'fallback' for hardcoded constants */
  dataSource?: 'json' | 'fallback';
}

type EquipmentCatalogApiResponse = ApiResponse;

/**
 * Interface for equipment items with name property
 */
interface INamedEquipment {
  name: string;
}

/**
 * Type guard to check if an item has a name property
 */
function hasNameProperty(item: unknown): item is INamedEquipment {
  return (
    typeof item === 'object' &&
    item !== null &&
    'name' in item &&
    typeof (item as INamedEquipment).name === 'string'
  );
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<EquipmentCatalogApiResponse>,
): Promise<void> {
  if (rejectEquipmentCatalogNonGet(req, res)) return;

  try {
    // Initialize equipment loader (loads from JSON with fallback to hardcoded)
    // This is idempotent - subsequent calls return immediately
    await getEquipmentLookupService().initialize();

    const { type, search } = req.query;

    let data: unknown[];

    // Filter by type if specified
    if (type === 'weapons') {
      data = getEquipmentLookupService().getAllWeapons();
    } else if (type === 'ammunition') {
      data = getEquipmentLookupService().getAllAmmunition();
    } else {
      data = getEquipmentLookupService().getAllEquipment();
    }

    // Apply search filter if provided
    if (search && typeof search === 'string') {
      const searchLower = search.toLowerCase();
      data = data.filter((item: unknown) => {
        if (hasNameProperty(item)) {
          return item.name.toLowerCase().includes(searchLower);
        }
        return false;
      });
    }

    return res.status(200).json({
      success: true,
      data,
      count: data.length,
      dataSource: getEquipmentLookupService().getDataSource(),
    });
  } catch (error) {
    sendLoggedSuccessApiError(res, 'Equipment Catalog API error:', error);
    return;
  }
}
