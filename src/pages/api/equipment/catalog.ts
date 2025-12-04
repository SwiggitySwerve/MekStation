/**
 * Equipment Catalog API
 * 
 * Get all equipment organized by category.
 * 
 * GET /api/equipment/catalog - Get all equipment
 * GET /api/equipment/catalog?type=weapons - Get only weapons
 * GET /api/equipment/catalog?type=ammunition - Get only ammunition
 * 
 * @spec openspec/specs/equipment-services/spec.md
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { equipmentLookupService } from '@/services/equipment/EquipmentLookupService';

interface ApiResponse {
  success: boolean;
  data?: unknown;
  error?: string;
  count?: number;
}

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
  res: NextApiResponse<ApiResponse>
): Promise<void> {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use GET.',
    });
  }

  try {
    const { type, search } = req.query;

    let data: unknown[];

    // Filter by type if specified
    if (type === 'weapons') {
      data = equipmentLookupService.getAllWeapons();
    } else if (type === 'ammunition') {
      data = equipmentLookupService.getAllAmmunition();
    } else {
      data = equipmentLookupService.getAllEquipment();
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
    });

  } catch (error) {
    console.error('Equipment Catalog API error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}
