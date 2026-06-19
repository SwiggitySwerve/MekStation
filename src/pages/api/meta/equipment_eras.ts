import type { NextApiRequest, NextApiResponse } from 'next';

import { respondToStaticGetRequest as respondToEquipmentErasGet } from '@/pages-modules/api/routeHelpers';
import { ALL_ERAS } from '@/types/enums/Era';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<void> {
  respondToEquipmentErasGet(
    req,
    res,
    ALL_ERAS,
    'Error fetching equipment eras:',
  );
}
