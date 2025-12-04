/**
 * Catalog API
 * 
 * Main unit catalog endpoint for browsing and searching.
 * Returns the full unit index for client-side filtering.
 * 
 * GET /api/catalog - Get full unit index
 * GET /api/catalog?search=<query> - Search units by name
 * 
 * @spec openspec/specs/unit-services/spec.md
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { canonicalUnitService } from '@/services/units/CanonicalUnitService';

interface ApiResponse {
  success: boolean;
  data?: unknown;
  error?: string;
  count?: number;
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
    // Get the full unit index
    const index = await canonicalUnitService.getIndex();

    const { search } = req.query;

    // If search query provided, filter by name
    if (search && typeof search === 'string') {
      const searchLower = search.toLowerCase();
      const filtered = index.filter(unit => 
        unit.name.toLowerCase().includes(searchLower) ||
        unit.chassis.toLowerCase().includes(searchLower) ||
        unit.variant.toLowerCase().includes(searchLower)
      );

      return res.status(200).json({
        success: true,
        data: filtered,
        count: filtered.length,
      });
    }

    return res.status(200).json({
      success: true,
      data: index,
      count: index.length,
    });

  } catch (error) {
    console.error('Catalog API error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}
