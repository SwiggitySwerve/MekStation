import type { NextApiRequest, NextApiResponse } from 'next';

import { respondToStaticGetRequest as respondToUnitCategoriesGet } from '@/pages-modules/api/routeHelpers';

/**
 * Unit type categories - canonical list of unit types supported by the system.
 * These match the folder structure in megameklab data files.
 */
const UNIT_CATEGORIES = [
  'meks',
  'vehicles',
  'infantry',
  'battlearmor',
  'ge',
  'fighters',
  'dropships',
  'warship',
  'protomeks',
  'convfighter',
  'smallcraft',
  'spacestation',
  'jumpships',
  'handheld',
] as const;

export type UnitCategory = (typeof UNIT_CATEGORIES)[number];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<void> {
  respondToUnitCategoriesGet(
    req,
    res,
    UNIT_CATEGORIES,
    'Error fetching unit categories:',
  );
}
