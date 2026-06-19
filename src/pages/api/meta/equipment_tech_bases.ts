import type { NextApiRequest, NextApiResponse } from 'next';

import { respondToStaticGetRequest as respondToEquipmentTechBasesGet } from '@/pages-modules/api/routeHelpers';
import { ALL_TECH_BASES } from '@/types/enums/TechBase';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<void> {
  respondToEquipmentTechBasesGet(
    req,
    res,
    ALL_TECH_BASES,
    'Error fetching equipment tech bases:',
  );
}
