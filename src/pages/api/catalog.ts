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

import {
  rejectNonGetDataRequest as rejectCatalogNonGet,
  sendLoggedSuccessApiError,
  type ApiDataResponse,
} from '@/pages-modules/api/routeHelpers';
import { getCanonicalUnitService } from '@/services/units/CanonicalUnitService';

type CatalogApiResponse = ApiDataResponse;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CatalogApiResponse>,
): Promise<void> {
  if (rejectCatalogNonGet(req, res)) return;

  try {
    // Get the full unit index
    const index = await getCanonicalUnitService().getIndex();

    const { search } = req.query;

    // If search query provided, filter by name
    if (search && typeof search === 'string') {
      const searchLower = search.toLowerCase();
      const filtered = index.filter(
        (unit) =>
          unit.name.toLowerCase().includes(searchLower) ||
          unit.chassis.toLowerCase().includes(searchLower) ||
          unit.variant.toLowerCase().includes(searchLower),
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
    sendLoggedSuccessApiError(res, 'Catalog API error:', error);
    return;
  }
}
