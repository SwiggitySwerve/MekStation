import type { NextApiRequest, NextApiResponse } from 'next';

import { respondToStaticGetRequest as respondToEquipmentCategoriesGet } from '@/pages-modules/api/routeHelpers';
import { EquipmentCategory } from '@/types/equipment';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<void> {
  respondToEquipmentCategoriesGet(
    req,
    res,
    Object.values(EquipmentCategory),
    'Error fetching equipment categories:',
  );
}
