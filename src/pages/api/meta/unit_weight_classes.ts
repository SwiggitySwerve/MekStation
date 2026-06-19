import type { NextApiRequest, NextApiResponse } from 'next';

import { respondToStaticGetRequest as respondToUnitWeightClassesGet } from '@/pages-modules/api/routeHelpers';
import { STANDARD_WEIGHT_CLASSES } from '@/types/enums/WeightClass';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<void> {
  respondToUnitWeightClassesGet(
    req,
    res,
    STANDARD_WEIGHT_CLASSES,
    'Error fetching unit weight classes:',
  );
}
